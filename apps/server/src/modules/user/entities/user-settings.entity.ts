import { Column, Entity, JoinColumn, OneToOne } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'
import { UserEntity } from './user.entity'

export enum Appearance {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}

@Entity({ name: 'user_settings' })
export class UserSettingsEntity extends BaseEntity {
  @Column({ type: 'bigint', unique: true })
  userId: string

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity

  @Column({ length: 3, default: 'VND' })
  defaultCurrency: string

  @Column({ length: 64, default: 'Asia/Ho_Chi_Minh' })
  timezone: string

  @Column({ length: 16, default: 'vi' })
  locale: string

  @Column({ type: 'enum', enum: Appearance, default: Appearance.System })
  appearance: Appearance

  @Column({ default: false })
  reminderEnabled: boolean

  @Column({ type: 'time', nullable: true })
  reminderTime: string | null

  /** Photo expense suggestions; when off, clients send no images and the server calls no provider. */
  @Column({ default: true })
  suggestionsEnabled: boolean

  /** Learn personal choices and rules from saved expenses. */
  @Column({ default: true })
  ruleLearningEnabled: boolean

  /** Use a coarse device location (placeKey) for suggestions. Opt-in. */
  @Column({ default: false })
  suggestionLocationEnabled: boolean
}
