import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'

export enum JobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Canceled = 'canceled',
}

export interface RecognitionSuggestion {
  amountMinor?: string
  currency?: string
  merchant?: string
  occurredAt?: string
  categoryCode?: string
  confidence: Record<string, number>
}

@Entity({ name: 'recognition_jobs' })
@Index(['status', 'availableAt'])
export class RecognitionJobEntity extends BaseEntity {
  @Column({ type: 'bigint' }) userId: string
  @Column({ type: 'bigint' }) mediaAssetId: string
  @Column({ length: 40, default: 'disabled' }) provider: string
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.Pending }) status: JobStatus
  @Column({ type: 'jsonb', nullable: true }) suggestion: RecognitionSuggestion | null
  @Column({ type: 'integer', default: 0 }) attempts: number
  @Column({ type: 'integer', default: 3 }) maxAttempts: number
  @Column({ type: 'timestamptz', default: () => 'now()' }) availableAt: Date
  @Column({ type: 'timestamptz', nullable: true }) leaseExpiresAt: Date | null
  @Column({ type: 'varchar', length: 500, nullable: true }) failureReason: string | null
}
