import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'

@Entity({ name: 'monthly_budgets' })
@Index(['userId', 'month', 'currency'], { unique: true })
export class MonthlyBudgetEntity extends BaseEntity {
  @Column({ type: 'bigint' }) userId: string
  @Column({ type: 'date' }) month: string
  @Column({ length: 3 }) currency: string
  @Column({ type: 'bigint' }) limitMinor: string
}
