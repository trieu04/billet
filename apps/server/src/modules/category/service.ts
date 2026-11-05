import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { DataSource, IsNull, Repository } from 'typeorm'
import type { CategoryResponseDto, CreateCategoryDto, UpdateCategoryDto } from './dto'
import { CategoryEntity } from './entities/category.entity'

interface CategoryRow {
  id: string
  code: string
  name: string
  color: string
  icon: string
  sort_order: number
  user_id: string | null
  usage_count: string
}

export interface SystemCategory {
  id: string
  code: string
  name: string
  active: boolean
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(userId: string): Promise<CategoryResponseDto[]> {
    const rows = await this.dataSource.query<CategoryRow[]>(
      `SELECT c.id::text, c.code, c.name, c.color, c.icon, c.sort_order, c.user_id::text,
        count(e.id)::text AS usage_count
       FROM categories c
       LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = $1 AND e.deleted_at IS NULL
       WHERE c.active = true AND (c.user_id IS NULL OR c.user_id = $1)
       GROUP BY c.id
       ORDER BY count(e.id) DESC, c.sort_order ASC, c.id ASC`,
      [userId],
    )
    return rows.map((row) => this.toResponse(row, userId))
  }

  async create(userId: string, input: CreateCategoryDto): Promise<CategoryResponseDto> {
    const last = await this.categories
      .createQueryBuilder('category')
      .select('MAX(category.sortOrder)', 'sortOrder')
      .where('category.userId = :userId', { userId })
      .getRawOne<{ sortOrder: number | null }>()
    const category = this.categories.create({
      userId,
      code: `custom-${randomUUID()}`,
      name: input.name.trim(),
      color: input.color.toUpperCase(),
      icon: input.icon,
      sortOrder: Number(last?.sortOrder ?? 1000) + 10,
      active: true,
    })
    try {
      return this.toEntityResponse(await this.categories.save(category), 0)
    } catch (error: unknown) {
      if (isUnique(error)) throw new ConflictException('Category name is already in use')
      throw error
    }
  }

  async update(userId: string, id: string, input: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.findOwned(userId, id)
    if (input.name !== undefined) category.name = input.name.trim()
    if (input.color !== undefined) category.color = input.color.toUpperCase()
    if (input.icon !== undefined) category.icon = input.icon
    try {
      return this.toEntityResponse(
        await this.categories.save(category),
        await this.usage(userId, id),
      )
    } catch (error: unknown) {
      if (isUnique(error)) throw new ConflictException('Category name is already in use')
      throw error
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.findOwned(userId, id)
    if ((await this.usage(userId, id)) > 0)
      throw new ConflictException('Category is currently in use')
    category.active = false
    await this.categories.save(category)
  }

  async resolve(userId: string, id?: string): Promise<CategoryEntity> {
    const category = id
      ? await this.categories
          .createQueryBuilder('category')
          .where('category.id = :id AND category.active = true', { id })
          .andWhere('(category.userId IS NULL OR category.userId = :userId)', { userId })
          .getOne()
      : await this.categories.findOneBy({ code: 'other', userId: IsNull(), active: true })
    if (!category) throw new NotFoundException('Category not found')
    return category
  }

  /** Active categories visible to the user in catalog order, for building decision choices. */
  async listChoices(userId: string): Promise<{ id: string; name: string }[]> {
    return this.dataSource.query<{ id: string; name: string }[]>(
      `SELECT id::text, name FROM categories
       WHERE active = true AND (user_id IS NULL OR user_id = $1)
       ORDER BY sort_order ASC, id ASC`,
      [userId],
    )
  }

  /** System categories (no owner), including archived ones so old references still resolve. */
  async listSystemCategories(): Promise<SystemCategory[]> {
    return this.dataSource.query<SystemCategory[]>(
      `SELECT id::text, code, name, active FROM categories
       WHERE user_id IS NULL
       ORDER BY sort_order ASC, id ASC`,
    )
  }

  /**
   * Cheap fingerprint of the categories visible to the user. Changes whenever a visible category is
   * created, renamed, or archived, so callers can cache {@link listChoices}.
   */
  async catalogStamp(userId: string): Promise<string> {
    const rows = await this.dataSource.query<{ stamp: string }[]>(
      `SELECT count(*) FILTER (WHERE active)::text || ':' || coalesce(max(updated_at)::text, '') AS stamp
       FROM categories WHERE user_id IS NULL OR user_id = $1`,
      [userId],
    )
    return rows[0]?.stamp ?? ''
  }

  private async findOwned(userId: string, id: string) {
    const category = await this.categories.findOneBy({ id, userId, active: true })
    if (!category) throw new NotFoundException('Custom category not found')
    return category
  }

  private async usage(userId: string, categoryId: string) {
    return this.dataSource
      .query<{ count: string }[]>(
        `SELECT count(*)::text AS count FROM expenses
         WHERE user_id = $1 AND category_id = $2 AND deleted_at IS NULL`,
        [userId, categoryId],
      )
      .then((rows) => Number(rows[0]?.count ?? 0))
  }

  private toResponse(row: CategoryRow, userId: string): CategoryResponseDto {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      color: row.color,
      icon: row.icon,
      sortOrder: row.sort_order,
      usageCount: Number(row.usage_count),
      isCustom: row.user_id === userId,
    }
  }

  private toEntityResponse(category: CategoryEntity, usageCount: number): CategoryResponseDto {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      color: category.color,
      icon: category.icon,
      sortOrder: category.sortOrder,
      usageCount,
      isCustom: true,
    }
  }
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
