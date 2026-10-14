import { Column, Entity, Index } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

export enum PushPlatform {
  Android = 'android',
  Ios = 'ios',
  Web = 'web',
}

@Entity({ name: 'push_devices' })
@Index('uq_push_devices_token', ['token'], { unique: true })
@Index('idx_push_devices_user_active', ['userId', 'active'])
export class PushDeviceEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint' })
  userId: string

  @Column({ length: 2048 })
  token: string

  @Column({ type: 'enum', enum: PushPlatform })
  platform: PushPlatform

  @Column({ default: true })
  active: boolean
}
