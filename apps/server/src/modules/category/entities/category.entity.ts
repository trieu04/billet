import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'

@Entity({ name: 'categories' })
@Index('uq_categories_code', ['code'], { unique: true })
export class CategoryEntity extends BaseEntity {
  @Column({ length: 40 })
  code: string

  @Column({ type: 'bigint', nullable: true })
  userId: string | null

  @Column({ length: 80 })
  name: string

  @Column({ length: 7 })
  color: string

  @Column({ length: 40 })
  icon: string

  @Column({ type: 'integer' })
  sortOrder: number

  @Column({ default: true })
  active: boolean
}
