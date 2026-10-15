import { Column, Entity, Index } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

export enum MediaStatus {
  Pending = 'pending',
  Processing = 'processing',
  Ready = 'ready',
  Failed = 'failed',
}

@Entity({ name: 'media_assets' })
@Index(['userId', 'createdAt'])
export class MediaAssetEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint' }) userId: string
  @Column({ length: 128, unique: true, select: false }) storageKey: string
  @Column({ type: 'varchar', length: 128, nullable: true, select: false }) thumbnailKey:
    | string
    | null
  @Column({ length: 100 }) mimeType: string
  @Column({ type: 'bigint' }) sizeBytes: string
  @Column({ type: 'integer', nullable: true }) width: number | null
  @Column({ type: 'integer', nullable: true }) height: number | null
  @Column({ type: 'enum', enum: MediaStatus, default: MediaStatus.Pending }) status: MediaStatus
  @Column({ type: 'varchar', length: 500, nullable: true }) failureReason: string | null
  @Column({ type: 'timestamptz' }) expiresAt: Date
}
