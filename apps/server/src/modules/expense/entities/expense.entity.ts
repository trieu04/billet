import { Column, Entity, Index, VersionColumn } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

/** Stored shape of one `fieldProvenance` entry; validated by the recognition module. */
export interface FieldProvenanceRecord {
  source: string
  ruleId?: string
  choiceId?: string
  confidence?: number
  outcome: string
}

export enum ExpenseSource {
  Manual = 'manual',
  Recognition = 'recognition',
}

@Entity({ name: 'expenses' })
@Index(['userId', 'occurredAt', 'id'])
@Index(['userId', 'currency', 'occurredAt'])
@Index('idx_expenses_learning_choice', ['userId', 'personalChoiceId', 'occurredAt'])
@Index('idx_expenses_learning_place', ['userId', 'imageType', 'placeKey', 'occurredAt'])
@Index('idx_expenses_learning_merchant', ['userId', 'merchantKey', 'occurredAt'])
@Index('idx_expenses_inference', ['inferenceId'])
export class ExpenseEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint' }) userId: string
  @Column({ type: 'bigint' }) categoryId: string
  @Column({ type: 'bigint', nullable: true }) mediaAssetId: string | null
  @Column({ type: 'bigint' }) amountMinor: string
  @Column({ length: 3 }) currency: string
  @Column({ type: 'timestamptz' }) occurredAt: Date
  @Column({ length: 64 }) occurredTimezone: string
  @Column({ type: 'varchar', length: 500, nullable: true }) caption: string | null
  @Column({ type: 'varchar', length: 160, nullable: true }) merchant: string | null
  @Column({ type: 'varchar', length: 240, nullable: true }) location: string | null
  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true }) latitude: string | null
  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true }) longitude: string | null
  @Column({ type: 'enum', enum: ExpenseSource, default: ExpenseSource.Manual })
  source: ExpenseSource
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) fieldSources: Record<string, string>
  /** Photo suggestion that informed this expense (`expense_inferences`), if any. */
  @Column({ type: 'bigint', nullable: true }) inferenceId: string | null
  /** Image type key chosen for the photo, such as `parking_ticket`. */
  @Column({ type: 'varchar', length: 40, nullable: true }) imageType: string | null
  @Column({ type: 'bigint', nullable: true }) personalChoiceId: string | null
  /** 7-character geohash computed on the device. */
  @Column({ type: 'varchar', length: 7, nullable: true }) placeKey: string | null
  /** Merchant name without diacritics, lowercase (normalized by the server). */
  @Column({ type: 'varchar', length: 160, nullable: true }) merchantKey: string | null
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) fieldProvenance: Record<
    string,
    FieldProvenanceRecord
  >
  @Column({ length: 100 }) idempotencyKey: string
  @Column({ length: 64 }) requestHash: string
  @VersionColumn() version: number
}
