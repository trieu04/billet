import { Column, Entity, Index, VersionColumn } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

export type DecisionChoiceKind = 'image_type' | 'personal'
export type DecisionChoiceOrigin = 'system' | 'learned' | 'user'
export type SuggestionItemStatus = 'enabled' | 'disabled'

/**
 * A choice the decision model can pick: system image types (`userId` null) or a user's personal
 * choices such as "Gửi xe – Tòa A". Personal choices carry no amount; rules keyed by `choiceId` do.
 */
@Entity({ name: 'decision_choices' })
@Index('idx_decision_choices_user', ['userId', 'kind'])
export class DecisionChoiceEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint', nullable: true }) userId: string | null
  @Column({ type: 'varchar', length: 16 }) kind: DecisionChoiceKind
  /** Image type key for `image_type` choices; null for personal choices. */
  @Column({ type: 'varchar', length: 40, nullable: true }) key: string | null
  @Column({ length: 80 }) label: string
  @Column({ type: 'varchar', length: 240, nullable: true }) description: string | null
  @Column({ type: 'varchar', length: 40, nullable: true }) imageTypeKey: string | null
  @Column({ type: 'varchar', length: 7, nullable: true }) placeKey: string | null
  @Column({ type: 'varchar', length: 160, nullable: true }) merchantKey: string | null
  @Column({ type: 'varchar', length: 16 }) origin: DecisionChoiceOrigin
  @Column({ type: 'varchar', length: 16, default: 'enabled' }) status: SuggestionItemStatus
  @Column({ type: 'integer', default: 0 }) support: number
  @Column({ type: 'timestamptz', nullable: true }) lastSelectedAt: Date | null
  @Column({ type: 'timestamptz', nullable: true }) suppressedUntil: Date | null
  @VersionColumn() version: number
}
