import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { CategoryService } from '../../category/service'
import { DECISION_IMAGE, SUGGESTION_THRESHOLDS } from '../constants'
import type {
  AdminCatalogDto,
  AdminDefaultRuleDto,
  AdminImageTypeDto,
  UpdateDefaultRuleDto,
  UpdateImageTypeDto,
} from '../dtos/admin.dto'
import { DecisionChoiceEntity } from '../entities/decision-choice.entity'
import { ExpenseRuleEntity } from '../entities/expense-rule.entity'
import { ChoiceSetService } from './choice-set.service'

/** The model always needs a fallback answer, so this image type cannot be turned off. */
const FALLBACK_IMAGE_TYPE = 'other'

const STALE_MESSAGE = 'Catalog item was changed; reload before editing'

/**
 * Operator edits of system image types and default rules. Updates are single conditional
 * statements on `version`, so of two concurrent edits exactly one wins.
 */
@Injectable()
export class CatalogAdminService {
  private readonly logger = new Logger('AdminCatalog')

  constructor(
    @InjectRepository(DecisionChoiceEntity)
    private readonly choices: Repository<DecisionChoiceEntity>,
    @InjectRepository(ExpenseRuleEntity) private readonly rules: Repository<ExpenseRuleEntity>,
    private readonly categories: CategoryService,
    private readonly choiceSets: ChoiceSetService,
  ) {}

  async catalog(): Promise<AdminCatalogDto> {
    const [imageTypes, rules, categories] = await Promise.all([
      this.choices.find({
        where: { kind: 'image_type', userId: IsNull() },
        order: { id: 'ASC' },
      }),
      this.rules.find({ where: { origin: 'default', userId: IsNull() }, order: { id: 'ASC' } }),
      this.categories.listSystemCategories(),
    ])
    const names = new Map(categories.map((category) => [category.id, category.name]))
    return {
      imageTypes: imageTypes.map(toImageType),
      defaultRules: rules.map((rule) => toDefaultRule(rule, names)),
      categories: categories
        .filter((category) => category.active)
        .map(({ id, code, name }) => ({ id, code, name })),
      thresholds: { ...SUGGESTION_THRESHOLDS },
      decisionImage: { ...DECISION_IMAGE },
    }
  }

  async updateImageType(
    adminUserId: string,
    key: string,
    input: UpdateImageTypeDto,
  ): Promise<AdminImageTypeDto> {
    if (input.status === 'disabled' && key === FALLBACK_IMAGE_TYPE)
      throw new BadRequestException('This image type cannot be disabled')
    const changes: Partial<DecisionChoiceEntity> = {}
    if (input.label !== undefined) {
      const label = input.label.trim()
      if (!label) throw new BadRequestException('label must not be empty')
      changes.label = label
    }
    if (input.description !== undefined) changes.description = input.description?.trim() || null
    if (input.status) changes.status = input.status
    if (Object.keys(changes).length === 0) throw new BadRequestException('Nothing to change')

    const where = { key, kind: 'image_type' as const, userId: IsNull() }
    const result = await this.choices
      .createQueryBuilder()
      .update()
      .set({ ...changes, version: () => '"version" + 1' })
      .where(
        `key = :key AND kind = 'image_type' AND user_id IS NULL AND version = :version AND deleted_at IS NULL`,
        { key, version: input.version },
      )
      .execute()
    if (!result.affected) {
      if (!(await this.choices.existsBy(where))) throw new NotFoundException('Image type not found')
      throw new ConflictException(STALE_MESSAGE)
    }
    this.choiceSets.invalidateImageTypes()
    const updated = await this.choices.findOneByOrFail(where)
    this.logChange(adminUserId, 'image_type', key, Object.keys(changes), updated.version)
    return toImageType(updated)
  }

  async updateDefaultRule(
    adminUserId: string,
    id: string,
    input: UpdateDefaultRuleDto,
  ): Promise<AdminDefaultRuleDto> {
    const categories = await this.categories.listSystemCategories()
    const changes: Partial<ExpenseRuleEntity> = {}
    if (input.categoryId !== undefined) {
      const category = categories.find((item) => item.id === input.categoryId)
      if (!category?.active)
        throw new BadRequestException('categoryId must be an active system category')
      changes.actions = { categoryId: category.id }
    }
    if (input.status) changes.status = input.status
    if (Object.keys(changes).length === 0) throw new BadRequestException('Nothing to change')

    const where = { id, origin: 'default' as const, userId: IsNull() }
    const result = await this.rules
      .createQueryBuilder()
      .update()
      .set({ ...changes, version: () => '"version" + 1' })
      .where(
        `id = :id AND origin = 'default' AND user_id IS NULL AND version = :version AND deleted_at IS NULL`,
        { id, version: input.version },
      )
      .execute()
    if (!result.affected) {
      if (!(await this.rules.existsBy(where))) throw new NotFoundException('Default rule not found')
      throw new ConflictException(STALE_MESSAGE)
    }
    const updated = await this.rules.findOneByOrFail(where)
    this.logChange(adminUserId, 'default_rule', id, Object.keys(changes), updated.version)
    return toDefaultRule(
      updated,
      new Map(categories.map((category) => [category.id, category.name])),
    )
  }

  private logChange(
    adminUserId: string,
    target: 'image_type' | 'default_rule',
    targetId: string,
    fields: string[],
    version: number,
  ): void {
    this.logger.log(
      JSON.stringify({
        event: 'admin_catalog_change',
        adminUserId,
        target,
        targetId,
        fields,
        version,
      }),
    )
  }
}

function toImageType(row: DecisionChoiceEntity): AdminImageTypeDto {
  return {
    key: row.key ?? '',
    label: row.label,
    description: row.description,
    status: row.status,
    version: row.version,
  }
}

function toDefaultRule(
  rule: ExpenseRuleEntity,
  names: ReadonlyMap<string, string>,
): AdminDefaultRuleDto {
  const categoryId = rule.actions.categoryId ?? null
  return {
    id: rule.id,
    imageType: rule.conditions.imageType ?? '',
    categoryId,
    categoryName: categoryId ? (names.get(categoryId) ?? null) : null,
    status: rule.status,
    confidence: rule.confidence,
    version: rule.version,
  }
}
