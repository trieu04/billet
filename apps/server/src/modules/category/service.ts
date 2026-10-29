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
