import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { CategoryService } from '../../category/service'
import {
  CHOICE_SET_CACHE_MAX_USERS,
  CHOICE_SET_CACHE_TTL_MS,
  MAX_PERSONAL_CHOICES_PER_USER,
} from '../constants'
import { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import {
  assembleChoiceSet,
  type CategorySource,
  type ChoiceSet,
  type ImageTypeSource,
  type PersonalChoiceSource,
} from '../utils/choice-set'

interface CacheEntry {
  categoryStamp: string
  categories: CategorySource[]
  personal: PersonalChoiceSource[]
  loadedAt: number
}

/**
 * Builds the per-request choice set offered to the decision model.
 *
 * Caching: image types are system data and cached for the TTL. Per user, the category list is
 * revalidated on every request with `CategoryService.catalogStamp` (one aggregate query), and the
 * personal choices are dropped by {@link invalidate} whenever this instance changes them. The TTL
 * bounds staleness for changes made by other server instances.
 */
@Injectable()
export class ChoiceSetService {
  private readonly cache = new Map<string, CacheEntry>()
  private imageTypes: { values: ImageTypeSource[]; loadedAt: number } | null = null

  constructor(
    @InjectRepository(DecisionChoiceEntity)
    private readonly choices: Repository<DecisionChoiceEntity>,
    private readonly categories: CategoryService,
  ) {}

  async build(userId: string, placeKey: string | null, maxChoices: number): Promise<ChoiceSet> {
    const [imageTypes, entry] = await Promise.all([this.loadImageTypes(), this.load(userId)])
    return assembleChoiceSet({
      imageTypes,
      categories: entry.categories,
      personal: entry.personal,
      placeKey,
      maxChoices,
    })
  }

  /** Image types with their labels, in seed order. */
  async loadImageTypes(): Promise<ImageTypeSource[]> {
    if (this.imageTypes && Date.now() - this.imageTypes.loadedAt < CHOICE_SET_CACHE_TTL_MS)
      return this.imageTypes.values
    const rows = await this.choices.find({
      where: { kind: 'image_type', userId: IsNull(), status: 'enabled' },
      order: { id: 'ASC' },
    })
    const values = rows.flatMap((row) =>
      row.key ? [{ key: row.key, label: row.label, description: row.description }] : [],
    )
    this.imageTypes = { values, loadedAt: Date.now() }
    return values
  }

  invalidateImageTypes(): void {
    this.imageTypes = null
  }

  invalidate(userId: string): void {
    this.cache.delete(userId)
  }

  private async load(userId: string): Promise<CacheEntry> {
    const categoryStamp = await this.categories.catalogStamp(userId)
    const cached = this.cache.get(userId)
    const fresh = cached && Date.now() - cached.loadedAt < CHOICE_SET_CACHE_TTL_MS
    if (cached && fresh && cached.categoryStamp === categoryStamp) return cached

    const [categories, personal] = await Promise.all([
      this.categories.listChoices(userId),
      cached && fresh ? Promise.resolve(cached.personal) : this.loadPersonal(userId),
    ])
    const entry: CacheEntry = {
      categoryStamp,
      categories: categories.map((category) => ({ id: category.id, label: category.name })),
      personal,
      loadedAt: cached && fresh ? cached.loadedAt : Date.now(),
    }
    this.remember(userId, entry)
    return entry
  }

  private async loadPersonal(userId: string): Promise<PersonalChoiceSource[]> {
    const rows = await this.choices.find({
      where: { userId, kind: 'personal', status: 'enabled' },
      order: { lastSelectedAt: { direction: 'DESC', nulls: 'LAST' }, id: 'DESC' },
      take: MAX_PERSONAL_CHOICES_PER_USER,
    })
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      placeKey: row.placeKey,
      lastSelectedAt: row.lastSelectedAt,
    }))
  }

  private remember(userId: string, entry: CacheEntry): void {
    this.cache.delete(userId)
    this.cache.set(userId, entry)
    while (this.cache.size > CHOICE_SET_CACHE_MAX_USERS) {
      const oldest = this.cache.keys().next().value
      if (oldest === undefined) break
      this.cache.delete(oldest)
    }
  }
}
