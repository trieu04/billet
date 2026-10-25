import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'
import { UserEntity } from '../../user/entities/user.entity'

export type SocialProvider = 'apple' | 'google'

@Entity({ name: 'auth_identities' })
@Unique('uq_auth_identities_provider_subject', ['provider', 'subject'])
@Index('idx_auth_identities_user', ['userId'])
export class AuthIdentityEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 16 })
  provider: SocialProvider

  @Column({ type: 'varchar', length: 255 })
  subject: string

  @Column({ type: 'bigint' })
  userId: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity
}
