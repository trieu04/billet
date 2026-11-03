import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'
import { MAX_PERSONAL_CHOICES_PER_USER } from '../constants'
import type {
  CreateDecisionChoiceDto,
  DecisionChoiceResponseDto,
  UpdateDecisionChoiceDto,
} from '../dtos/decision-choice.dto'
import { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import { toMerchantKey } from '../utils/keys'
import { selectEvictions, suppressionEnd } from '../utils/learning'
import { ChoiceSetService } from './choice-set.service'

/** CRUD for personal decision choices. System image types are read-only (404 on change). */
@Injectable()
export class DecisionChoiceService {
  constructor(
    @InjectRepository(DecisionChoiceEntity)
    private readonly choices: Repository<DecisionChoiceEntity>,
    private readonly choiceSets: ChoiceSetService,
  ) {}

  /** System image types followed by the user's personal choices (enabled and disabled). */
  async list(userId: string): Promise<DecisionChoiceResponseDto[]> {
    const [system, personal] = await Promise.all([
      this.choices.find({ where: { kind: 'image_type', userId: IsNull() }, order: { id: 'ASC' } }),
      this.choices.find({ where: { kind: 'personal', userId }, order: { id: 'DESC' } }),
    ])
    return [...system, ...personal].map(toChoiceResponse)
  }

  async create(userId: string, input: CreateDecisionChoiceDto): Promise<DecisionChoiceResponseDto> {
    await this.makeRoom(userId)
    const saved = await this.choices.save(
      this.choices.create({
        userId,
        kind: 'personal',
        key: null,
        label: input.label.trim(),
        description: clean(input.description),
        imageTypeKey: input.imageType ?? null,
        placeKey: input.placeKey ?? null,
        merchantKey: toMerchantKey(input.merchantKey),
        origin: 'user',
        status: input.status ?? 'enabled',
        support: 0,
        lastSelectedAt: null,
        suppressedUntil: null,
      }),
    )
    this.choiceSets.invalidate(userId)
    return toChoiceResponse(saved)
  }

  async update(
    userId: string,
    id: string,
    input: UpdateDecisionChoiceDto,
  ): Promise<DecisionChoiceResponseDto> {
    const choice = await this.findOwned(userId, id)
    if (choice.version !== input.version)
      throw new ConflictException('Decision choice was changed; reload before editing')
    const changes: Partial<DecisionChoiceEntity> = { origin: 'user' }
    if (input.label !== undefined) changes.label = input.label.trim()
    if (input.description !== undefined) changes.description = clean(input.description)
    if (input.imageType !== undefined) changes.imageTypeKey = input.imageType
    if (input.placeKey !== undefined) changes.placeKey = input.placeKey
    if (input.merchantKey !== undefined) changes.merchantKey = toMerchantKey(input.merchantKey)
    if (input.status !== undefined) changes.status = input.status
    const result = await this.choices
      .createQueryBuilder()
      .update()
      .set({ ...changes, version: () => '"version" + 1' })
      .where('id = :id AND user_id = :userId AND version = :version AND deleted_at IS NULL', {
        id,
        userId,
        version: input.version,
      })
      .execute()
    if (!result.affected)
      throw new ConflictException('Decision choice was changed; reload before editing')
    this.choiceSets.invalidate(userId)
    return toChoiceResponse(await this.findOwned(userId, id))
  }

  /** Soft-delete and block the learner from recreating this key for 90 days. */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id)
    await this.choices.update(
      { id, userId },
      { deletedAt: new Date(), suppressedUntil: suppressionEnd(new Date()) },
    )
    this.choiceSets.invalidate(userId)
  }

  /**
   * Make room for one more personal choice by evicting the least used `learned` choices. Throws
   * 409 when the cap is reached with `user` choices only.
   */
  async makeRoom(userId: string): Promise<void> {
    if (!(await this.evictForCap(userId, MAX_PERSONAL_CHOICES_PER_USER - 1)))
      throw new ConflictException(
        `At most ${MAX_PERSONAL_CHOICES_PER_USER} personal choices are allowed`,
      )
  }

  /** Evict learned choices until at most `cap` remain; false when that is not possible. */
  async evictForCap(userId: string, cap: number): Promise<boolean> {
    const rows = await this.choices.find({
      where: { userId, kind: 'personal' },
      select: { id: true, origin: true, lastSelectedAt: true, support: true, createdAt: true },
    })
    if (rows.length <= cap) return true
    const evict = selectEvictions(
      rows.map((row) => ({
        id: row.id,
        origin: row.origin,
        lastUsedAt: row.lastSelectedAt,
        support: row.support,
        createdAt: row.createdAt,
      })),
      cap,
    )
    if (evict.length > 0) {
      // Evicted for capacity, not by the user: no suppression.
      await this.choices.softDelete({ userId, id: In(evict) })
      this.choiceSets.invalidate(userId)
    }
    return rows.length - evict.length <= cap
  }

  /** The user's active personal choice, or 404. */
  async findOwned(userId: string, id: string): Promise<DecisionChoiceEntity> {
    const choice = await this.choices.findOneBy({ id, userId, kind: 'personal' })
    if (!choice) throw new NotFoundException('Decision choice not found')
    return choice
  }
}

export function toChoiceResponse(choice: DecisionChoiceEntity): DecisionChoiceResponseDto {
  return {
    id: choice.id,
    kind: choice.kind,
    key: choice.key,
    label: choice.label,
    description: choice.description,
    imageType: choice.imageTypeKey,
    placeKey: choice.placeKey,
    merchantKey: choice.merchantKey,
    origin: choice.origin,
    status: choice.status,
    support: choice.support,
    lastSelectedAt: choice.lastSelectedAt?.toISOString() ?? null,
    version: choice.version,
    createdAt: choice.createdAt.toISOString(),
    updatedAt: choice.updatedAt.toISOString(),
  }
}

function clean(value: string | null | undefined): string | null {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}
