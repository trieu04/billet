import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { CategoryResponseDto } from './dto'
import { CategoryEntity } from './entities/category.entity'
@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
  ) {}
  async list(): Promise<CategoryResponseDto[]> {
    const rows = await this.categories.find({
      where: { active: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    })
    return rows.map(({ id, code, name, color, icon, sortOrder }) => ({
      id,
      code,
      name,
      color,
      icon,
      sortOrder,
    }))
  }
  async resolve(id?: string): Promise<CategoryEntity> {
    const category = id
      ? await this.categories.findOneBy({ id, active: true })
      : await this.categories.findOneBy({ code: 'other', active: true })
    if (!category) throw new NotFoundException('Category not found')
    return category
  }
}
