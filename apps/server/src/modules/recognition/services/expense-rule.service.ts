import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'
import { CategoryService } from '../../category/service'
import { MAX_RULES_PER_USER } from '../constants'
import type {
  CreateExpenseRuleDto,
  ExpenseRuleResponseDto,
  RuleActionsInputDto,
  RuleConditionsInputDto,
  UpdateExpenseRuleDto,
} from '../dtos/expense-rule.dto'
import { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import { ExpenseRuleEntity } from '../entities/expense-rule.entity'
import {
  canonicalConditions,
  conditionsHash,
  countConditions,
  type RuleActions,
  type RuleConditions,
} from '../utils/conditions'
import { toMerchantKey } from '../utils/keys'
import { selectEvictions, suppressionEnd } from '../utils/learning'

/** CRUD for the user's expense rules. System default rules are read-only (404 on change). */
@Injectable()
export class ExpenseRuleService {
  constructor(
    @InjectRepository(ExpenseRuleEntity) private readonly rules: Repository<ExpenseRuleEntity>,
    @InjectRepository(DecisionChoiceEntity)
    private readonly choices: Repository<DecisionChoiceEntity>,
    private readonly categories: CategoryService,
  ) {}

  /** System default rules followed by the user's rules (enabled and disabled). */
  async list(userId: string): Promise<ExpenseRuleResponseDto[]> {
    const [defaults, own] = await Promise.all([
      this.rules.find({ where: { userId: IsNull(), origin: 'default' }, order: { id: 'ASC' } }),
      this.rules.find({ where: { userId }, order: { id: 'DESC' } }),
    ])
    return [...defaults, ...own].map(toRuleResponse)
  }

  async create(userId: string, input: CreateExpenseRuleDto): Promise<ExpenseRuleResponseDto> {
    const conditions = await this.conditions(userId, input.conditions)
    const actions = await this.actions(userId, input.actions)
    const hash = conditionsHash(conditions)
    const existing = await this.rules.findOne({
      where: { userId, conditionsHash: hash },
      withDeleted: true,
    })
    if (existing && !existing.deletedAt)
      throw new ConflictException('A rule with these conditions already exists')
    await this.makeRoom(userId)
    const values = {
      origin: 'user' as const,
      status: input.status ?? 'enabled',
      conditions,
      actions,
      currency: actions.currency ?? null,
      confidence: 1,
      support: 0,
      suppressedUntil: null,
      deletedAt: null,
    }
    if (existing) {
      // Reuse the suppressed row of a deleted rule: the user now asks for this key explicitly.
      await this.rules
        .createQueryBuilder()
        .update()
        .set({ ...values, version: () => '"version" + 1' })
        .where('id = :id', { id: existing.id })
        .execute()
      return toRuleResponse(await this.findOwned(userId, existing.id))
    }
    try {
      const saved = await this.rules.save(
        this.rules.create({ ...values, userId, conditionsHash: hash, lastUsedAt: null }),
      )
      return toRuleResponse(saved)
    } catch (error: unknown) {
      if (isUnique(error))
        throw new ConflictException('A rule with these conditions already exists')
      throw error
    }
  }

  async update(
    userId: string,
    id: string,
    input: UpdateExpenseRuleDto,
  ): Promise<ExpenseRuleResponseDto> {
    const rule = await this.findOwned(userId, id)
    if (rule.version !== input.version)
      throw new ConflictException('Rule was changed; reload before editing')
    const changes: Partial<ExpenseRuleEntity> = { origin: 'user', confidence: 1 }
    if (input.conditions) {
      const conditions = await this.conditions(userId, input.conditions)
      const hash = conditionsHash(conditions)
      if (hash !== rule.conditionsHash) {
        const other = await this.rules.findOne({
          where: { userId, conditionsHash: hash },
          withDeleted: true,
        })
        if (other && !other.deletedAt)
          throw new ConflictException('A rule with these conditions already exists')
        // A deleted rule only keeps its key suppressed; the user now claims that key explicitly.
        if (other) await this.rules.delete({ id: other.id, userId })
      }
      changes.conditions = conditions
      changes.conditionsHash = hash
    }
    if (input.actions) {
      changes.actions = await this.actions(userId, input.actions)
      changes.currency = changes.actions.currency ?? null
    }
    if (input.status) changes.status = input.status
    try {
      const result = await this.rules
        .createQueryBuilder()
        .update()
        .set({ ...changes, version: () => '"version" + 1' })
        .where('id = :id AND user_id = :userId AND version = :version AND deleted_at IS NULL', {
          id,
          userId,
          version: input.version,
        })
        .execute()
      if (!result.affected) throw new ConflictException('Rule was changed; reload before editing')
    } catch (error: unknown) {
      if (isUnique(error))
        throw new ConflictException('A rule with these conditions already exists')
      throw error
    }
    return toRuleResponse(await this.findOwned(userId, id))
  }

  /** Soft-delete and block the learner from recreating this key for 90 days. */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id)
    await this.rules.update(
      { id, userId },
      { deletedAt: new Date(), suppressedUntil: suppressionEnd(new Date()) },
    )
  }

  async makeRoom(userId: string): Promise<void> {
    if (!(await this.evictForCap(userId, MAX_RULES_PER_USER - 1)))
      throw new ConflictException(`At most ${MAX_RULES_PER_USER} rules are allowed`)
  }

  /** Evict learned rules until at most `cap` remain; false when that is not possible. */
  async evictForCap(userId: string, cap: number): Promise<boolean> {
    const rows = await this.rules.find({
      where: { userId },
      select: { id: true, origin: true, lastUsedAt: true, support: true, createdAt: true },
    })
    if (rows.length <= cap) return true
    const evict = selectEvictions(rows, cap)
    // Evicted rows are hard-deleted: they were removed for capacity, not by the user, so they
    // must not keep their key suppressed.
    if (evict.length > 0) await this.rules.delete({ userId, id: In(evict) })
    return rows.length - evict.length <= cap
  }

  async findOwned(userId: string, id: string): Promise<ExpenseRuleEntity> {
    const rule = await this.rules.findOneBy({ id, userId })
    if (!rule) throw new NotFoundException('Rule not found')
    return rule
  }

  private async conditions(userId: string, input: RuleConditionsInputDto): Promise<RuleConditions> {
    const conditions = canonicalConditions({
      choiceId: input.choiceId,
      imageType: input.imageType,
      placeKey: input.placeKey,
      merchantKey: toMerchantKey(input.merchantKey) ?? undefined,
    })
    if (countConditions(conditions) === 0)
      throw new BadRequestException('A rule needs at least one condition')
    if (conditions.choiceId) {
      const exists = await this.choices.existsBy({
        id: conditions.choiceId,
        userId,
        kind: 'personal',
      })
      if (!exists) throw new NotFoundException('Decision choice not found')
    }
    return conditions
  }

  private async actions(userId: string, input: RuleActionsInputDto): Promise<RuleActions> {
    const actions: RuleActions = {}
    if (input.amountMinor !== undefined) {
      if (!input.currency) throw new BadRequestException('amountMinor requires currency')
      actions.amountMinor = input.amountMinor
      actions.currency = input.currency
    } else if (input.currency !== undefined) {
      throw new BadRequestException('currency is only allowed with amountMinor')
    }
    if (input.categoryId !== undefined)
      actions.categoryId = (await this.categories.resolve(userId, input.categoryId)).id
    const merchant = input.merchant?.trim()
    if (merchant) actions.merchant = merchant
    if (Object.keys(actions).length === 0)
      throw new BadRequestException('A rule needs at least one action')
    return actions
  }
}

export function toRuleResponse(rule: ExpenseRuleEntity): ExpenseRuleResponseDto {
  return {
    id: rule.id,
    origin: rule.origin,
    status: rule.status,
    conditions: rule.conditions,
    actions: rule.actions,
    currency: rule.currency,
    confidence: rule.confidence,
    support: rule.support,
    lastUsedAt: rule.lastUsedAt?.toISOString() ?? null,
    version: rule.version,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
