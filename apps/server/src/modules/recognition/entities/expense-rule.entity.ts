import { Column, Entity, Index, VersionColumn } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'
import type { RuleActions, RuleConditions } from '../utils/conditions'
import type { SuggestionItemStatus } from './decision-choice.entity'

export type ExpenseRuleOrigin = 'default' | 'learned' | 'user'

/**
 * Declarative suggestion rule: AND over `conditions`, applying `actions`. System default rules have
 * `userId` null and carry a category only. One row per user and condition set, including
 * soft-deleted rows, so a deleted key stays suppressed.
 */
@Entity({ name: 'expense_rules' })
@Index('uq_expense_rules_user_conditions', ['userId', 'conditionsHash'], { unique: true })
export class ExpenseRuleEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint', nullable: true }) userId: string | null
  @Column({ type: 'varchar', length: 16 }) origin: ExpenseRuleOrigin
  @Column({ type: 'varchar', length: 16, default: 'enabled' }) status: SuggestionItemStatus
  @Column({ type: 'jsonb' }) conditions: RuleConditions
  @Column({ length: 64 }) conditionsHash: string
  @Column({ type: 'jsonb' }) actions: RuleActions
  @Column({ type: 'varchar', length: 3, nullable: true }) currency: string | null
  @Column({ type: 'double precision', default: 1 }) confidence: number
  @Column({ type: 'integer', default: 0 }) support: number
  @Column({ type: 'timestamptz', nullable: true }) lastUsedAt: Date | null
  @Column({ type: 'timestamptz', nullable: true }) suppressedUntil: Date | null
  @VersionColumn() version: number
}
