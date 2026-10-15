import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'

@Entity({ name: 'categories' })
export class CategoryEntity extends BaseEntity {
  @Column({ length: 40, unique: true })
  code: string

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
