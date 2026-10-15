import { Column, Entity, Index, VersionColumn } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

export enum ExpenseSource {
  Manual = 'manual',
  Recognition = 'recognition',
}

@Entity({ name: 'expenses' })
@Index(['userId', 'occurredAt', 'id'])
@Index(['userId', 'currency', 'occurredAt'])
export class ExpenseEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint' }) userId: string
  @Column({ type: 'bigint' }) categoryId: string
  @Column({ type: 'bigint', nullable: true }) mediaAssetId: string | null
  @Column({ type: 'bigint', nullable: true }) recognitionJobId: string | null
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
  @Column({ length: 100 }) idempotencyKey: string
  @Column({ length: 64 }) requestHash: string
  @VersionColumn() version: number
}
