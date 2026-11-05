import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'

export type InferenceStatus = 'succeeded' | 'unavailable' | 'disabled'

export interface InferenceSelection {
  id: string
  confidence: number
}

export interface InferenceSelections {
  /** `id` is the image type key. */
  imageType: InferenceSelection | null
  category: InferenceSelection | null
  personalChoice: InferenceSelection | null
}

export interface InferenceUsage {
  inputTokens?: number
  outputTokens?: number
  costMicroUsd?: number
}

/** One decision request. Never stores the image, OCR text, or raw provider output; kept 90 days. */
@Entity({ name: 'expense_inferences' })
@Index('uq_expense_inferences_user_request', ['userId', 'clientRequestId'], { unique: true })
@Index('idx_expense_inferences_created', ['createdAt'])
export class ExpenseInferenceEntity extends BaseEntity {
  @Column({ type: 'bigint' }) userId: string
  @Column({ length: 100 }) clientRequestId: string
  @Column({ length: 40 }) provider: string
  @Column({ length: 120 }) model: string
  @Column({ type: 'varchar', length: 16 }) status: InferenceStatus
  @Column({ type: 'varchar', length: 40, nullable: true }) reason: string | null
  @Column({ type: 'varchar', length: 64, default: '' }) choiceSetVersion: string
  @Column({ type: 'jsonb', nullable: true }) selections: InferenceSelections | null
  @Column({ type: 'integer' }) imageBytes: number
  @Column({ type: 'integer' }) latencyMs: number
  /** Whether the provider was called; `latencyMs` can be 0 even when it was. */
  @Column({ default: false }) providerCalled: boolean
  @Column({ type: 'jsonb', nullable: true }) usage: InferenceUsage | null
}
