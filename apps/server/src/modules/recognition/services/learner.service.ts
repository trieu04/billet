import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm'
import { UsersService } from '../../user/service'
import { DAY_MS, MAX_PERSONAL_CHOICES_PER_USER, MAX_RULES_PER_USER } from '../constants'
import { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import { ExpenseRuleEntity } from '../entities/expense-rule.entity'
import { conditionsHash } from '../utils/conditions'
import { acceptedRuleIds, parseFieldProvenance } from '../utils/field-provenance'
import {
  LEARNING_MAX_EVIDENCE,
  LEARNING_WINDOW_DAYS,
  learningKeys,
  planKeyLearning,
  type EvidenceExpense,
  type ExistingChoice,
  type ExistingRule,
  type LearningAction,
  type LearningFeatures,
  type LearningKey,
} from '../utils/learning'
import { ChoiceSetService } from './choice-set.service'
import { DecisionChoiceService } from './decision-choice.service'
import { ExpenseRuleService } from './expense-rule.service'

/** Normalized learning data of one saved expense, as passed by the expense module. */
export interface ExpenseLearningSignal extends LearningFeatures {
  currency: string
  /** Stored `fieldProvenance`; rules whose value was accepted are marked as used. */
  fieldProvenance: Record<string, unknown>
}

interface EvidenceRow {
  amount_minor: string
  currency: string
  occurred_at: Date
  category_id: string
  merchant: string | null
  location: string | null
}

/**
 * Learns personal choices and rules from saved expenses (thin persistence wrapper around the pure
 * core in utils/learning.ts). Runs after the expense is committed; best effort.
 */
@Injectable()
export class LearnerService {
  private readonly logger = new Logger(LearnerService.name)

  constructor(
    @InjectRepository(DecisionChoiceEntity)
    private readonly choices: Repository<DecisionChoiceEntity>,
    @InjectRepository(ExpenseRuleEntity) private readonly rules: Repository<ExpenseRuleEntity>,
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly choiceSets: ChoiceSetService,
    private readonly choiceService: DecisionChoiceService,
    private readonly ruleService: ExpenseRuleService,
  ) {}

  /**
   * Re-learn every key touched by an expense change. `before` is the stored state before an
   * update or delete, `after` the state after a create or update. Never throws; failures are
   * logged without amounts, labels, or place keys.
   */
  async afterExpenseChange(
    userId: string,
    before: ExpenseLearningSignal | null,
    after: ExpenseLearningSignal | null,
  ): Promise<void> {
    try {
      await this.learn(userId, before, after, new Date())
    } catch (error: unknown) {
      this.logger.warn(
        `Learning failed for user ${userId}: ${error instanceof Error ? error.name : 'unknown error'}`,
      )
    }
  }

  async learn(
    userId: string,
    before: ExpenseLearningSignal | null,
    after: ExpenseLearningSignal | null,
    now: Date,
  ): Promise<void> {
    if (after) await this.touchUsage(userId, before, after, now)
    const settings = await this.users.getSettings(userId)
    if (!settings.ruleLearningEnabled) return

    const targets = new Map<string, { key: LearningKey; currency: string }>()
    for (const signal of [before, after]) {
      if (!signal) continue
      for (const key of learningKeys(signal))
        targets.set(`${signal.currency}:${conditionsHash(key.conditions)}`, {
          key,
          currency: signal.currency,
        })
    }
    if (targets.size === 0) return
    const labels = new Map(
      (await this.choiceSets.loadImageTypes()).map((type) => [type.key, type.label]),
    )
    for (const { key, currency } of targets.values()) {
      const hash = conditionsHash(key.conditions)
      const [evidence, rule, choice] = await Promise.all([
        this.loadEvidence(userId, key, currency, now),
        this.rules.findOne({ where: { userId, conditionsHash: hash }, withDeleted: true }),
        this.findKeyChoice(userId, key, now),
      ])
      const actions = planKeyLearning({
        key,
        currency,
        evidence,
        now,
        rule: rule ? toExistingRule(rule) : null,
        choice,
        imageTypeLabel: key.conditions.imageType ? labels.get(key.conditions.imageType) : undefined,
      })
      for (const action of actions) await this.apply(userId, hash, action)
    }
  }

  /** Record that a personal choice was selected and that rule values were accepted. */
  private async touchUsage(
    userId: string,
    before: ExpenseLearningSignal | null,
    after: ExpenseLearningSignal,
    now: Date,
  ): Promise<void> {
    if (after.personalChoiceId && after.personalChoiceId !== before?.personalChoiceId) {
      await this.choices.update(
        { id: after.personalChoiceId, userId, kind: 'personal' },
        { lastSelectedAt: now },
      )
      this.choiceSets.invalidate(userId)
    }
    const previous = new Set(before ? ruleIdsOf(before) : [])
    const used = ruleIdsOf(after).filter((id) => !previous.has(id))
    if (used.length > 0) await this.rules.update({ userId, id: In(used) }, { lastUsedAt: now })
  }

  private async loadEvidence(
    userId: string,
    key: LearningKey,
    currency: string,
    now: Date,
  ): Promise<EvidenceExpense[]> {
    const { choiceId, imageType, placeKey, merchantKey } = key.conditions
    const params: unknown[] = [
      userId,
      currency,
      new Date(now.getTime() - LEARNING_WINDOW_DAYS * DAY_MS),
    ]
    const where: string[] = []
    const add = (column: string, value: string | undefined) => {
      if (value === undefined) return
      params.push(value)
      where.push(`${column} = $${params.length}`)
    }
    add('personal_choice_id', choiceId)
    add('image_type', imageType)
    add('place_key', placeKey)
    add('merchant_key', merchantKey)
    const rows = await this.dataSource.query<EvidenceRow[]>(
      `SELECT amount_minor::text AS amount_minor, currency, occurred_at, category_id::text AS category_id,
         merchant, location
       FROM expenses
       WHERE user_id = $1 AND currency = $2 AND occurred_at >= $3 AND deleted_at IS NULL
         AND ${where.join(' AND ')}
       ORDER BY occurred_at DESC, id DESC
       LIMIT ${LEARNING_MAX_EVIDENCE}`,
      params,
    )
    return rows.map((row) => ({
      amountMinor: row.amount_minor,
      currency: row.currency,
      occurredAt: new Date(row.occurred_at),
      categoryId: row.category_id,
      merchant: row.merchant,
      location: row.location,
    }))
  }

  /** The personal choice that represents a key: the choice itself, or one with the same features. */
  private async findKeyChoice(
    userId: string,
    key: LearningKey,
    now: Date,
  ): Promise<ExistingChoice | null> {
    if (key.kind === 'personal_choice') {
      const choice = await this.choices.findOne({
        where: { id: key.conditions.choiceId, userId, kind: 'personal' },
        withDeleted: true,
      })
      return choice ? toExistingChoice(choice) : null
    }
    if (key.kind === 'merchant') return null
    const features = {
      userId,
      kind: 'personal' as const,
      imageTypeKey: key.conditions.imageType,
      placeKey: key.conditions.placeKey ?? IsNull(),
      merchantKey: key.conditions.merchantKey ?? IsNull(),
    }
    const active = await this.choices.findOne({ where: features, order: { id: 'ASC' } })
    if (active) return toExistingChoice(active)
    const suppressed = await this.choices.findOne({
      where: { ...features, deletedAt: Not(IsNull()), suppressedUntil: MoreThan(now) },
      withDeleted: true,
      order: { suppressedUntil: 'DESC' },
    })
    return suppressed ? toExistingChoice(suppressed) : null
  }

  private async apply(userId: string, hash: string, action: LearningAction): Promise<void> {
    switch (action.type) {
      case 'create_choice': {
        if (!(await this.choiceService.evictForCap(userId, MAX_PERSONAL_CHOICES_PER_USER - 1)))
          return
        await ignoreUnique(
          this.choices.insert({
            userId,
            kind: 'personal',
            key: null,
            label: action.label,
            description: null,
            imageTypeKey: action.imageType,
            placeKey: action.placeKey,
            merchantKey: action.merchantKey,
            origin: 'learned',
            status: 'enabled',
            support: action.support,
            lastSelectedAt: null,
            suppressedUntil: null,
          }),
        )
        this.choiceSets.invalidate(userId)
        return
      }
      case 'update_choice_support':
        await this.choices.update(
          { id: action.choiceId, userId, origin: 'learned' },
          { support: action.support },
        )
        return
      case 'upsert_rule': {
        const values = {
          origin: 'learned' as const,
          status: 'enabled' as const,
          conditions: action.conditions,
          actions: action.actions,
          currency: action.currency,
          confidence: action.confidence,
          support: action.support,
          suppressedUntil: null,
        }
        if (action.ruleId) {
          await this.rules
            .createQueryBuilder()
            .update()
            .set({ ...values, deletedAt: null, version: () => '"version" + 1' })
            .where({ id: action.ruleId, userId, origin: 'learned' })
            .execute()
          return
        }
        if (!(await this.ruleService.evictForCap(userId, MAX_RULES_PER_USER - 1))) return
        await ignoreUnique(
          this.rules.insert({ ...values, userId, conditionsHash: hash, lastUsedAt: null }),
        )
        return
      }
      case 'lower_rule':
        await this.rules
          .createQueryBuilder()
          .update()
          .set({
            confidence: action.confidence,
            support: action.support,
            status: action.status,
            version: () => '"version" + 1',
          })
          .where({ id: action.ruleId, userId, origin: 'learned' })
          .execute()
        return
    }
  }

  /** Remove suppression markers whose period ended; keeps the tables small. */
  async purgeExpiredSuppressions(now: Date): Promise<void> {
    await this.rules.delete({ deletedAt: Not(IsNull()), suppressedUntil: LessThan(now) })
  }
}

function ruleIdsOf(signal: ExpenseLearningSignal): string[] {
  const parsed = parseFieldProvenance(signal.fieldProvenance)
  return parsed.ok ? acceptedRuleIds(parsed.value) : []
}

function toExistingRule(rule: ExpenseRuleEntity): ExistingRule {
  return {
    id: rule.id,
    origin: rule.origin,
    status: rule.status,
    deleted: rule.deletedAt !== null,
    suppressedUntil: rule.suppressedUntil,
    actions: rule.actions,
    currency: rule.currency,
    confidence: rule.confidence,
  }
}

function toExistingChoice(choice: DecisionChoiceEntity): ExistingChoice {
  return {
    id: choice.id,
    origin: choice.origin,
    deleted: choice.deletedAt !== null,
    suppressedUntil: choice.suppressedUntil,
  }
}

async function ignoreUnique(operation: Promise<unknown>): Promise<void> {
  try {
    await operation
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505')
      return
    throw error
  }
}
