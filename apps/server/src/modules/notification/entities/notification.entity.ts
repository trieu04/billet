import { Column, Entity, Index } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

@Entity({ name: 'notifications' })
@Index('idx_notifications_user_created', ['userId', 'createdAt'])
@Index('idx_notifications_user_unread', ['userId'], { where: '"read_at" IS NULL' })
export class NotificationEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint' })
  userId: string

  @Column({ length: 50 })
  type: string

  @Column({ length: 140 })
  title: string

  @Column({ length: 500 })
  body: string

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  deduplicationKey: string | null
}
