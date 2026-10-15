import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'
import { JobStatus } from '../../recognition/entities/recognition-job.entity'

@Entity({ name: 'export_jobs' })
@Index(['status', 'availableAt'])
export class ExportJobEntity extends BaseEntity {
  @Column({ type: 'bigint' }) userId: string
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.Pending }) status: JobStatus
  @Column({ type: 'timestamptz', nullable: true }) from: Date | null
  @Column({ type: 'timestamptz', nullable: true }) to: Date | null
  @Column({ type: 'varchar', length: 3, nullable: true }) currency: string | null
  @Column({ type: 'timestamptz', nullable: true }) snapshotAt: Date | null
  @Column({ type: 'varchar', length: 128, nullable: true, select: false }) storageKey: string | null
  @Column({ type: 'timestamptz', nullable: true }) downloadExpiresAt: Date | null
  @Column({ type: 'integer', default: 0 }) attempts: number
  @Column({ type: 'timestamptz', default: () => 'now()' }) availableAt: Date
  @Column({ type: 'timestamptz', nullable: true }) leaseExpiresAt: Date | null
  @Column({ type: 'varchar', length: 500, nullable: true }) failureReason: string | null
}
