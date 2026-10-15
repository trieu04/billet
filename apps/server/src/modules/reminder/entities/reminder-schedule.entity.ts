import { Column, Entity } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'

@Entity({ name: 'reminder_schedules' })
export class ReminderScheduleEntity extends BaseEntity {
  @Column({ type: 'bigint', unique: true }) userId: string
  @Column({ type: 'timestamptz' }) nextRunAt: Date
  @Column({ type: 'date', nullable: true }) lastLocalDate: string | null
  @Column({ type: 'timestamptz', nullable: true }) leaseExpiresAt: Date | null
}
