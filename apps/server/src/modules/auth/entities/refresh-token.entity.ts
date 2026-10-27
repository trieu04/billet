import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { BaseEntity } from '../../../shared/entities/base.entity'
import { UserEntity } from '../../user/entities/user.entity'

@Entity({ name: 'auth_refresh_tokens' })
@Index('uq_auth_refresh_tokens_token_hash', ['tokenHash'], { unique: true })
@Index('idx_auth_refresh_tokens_user', ['userId'])
export class RefreshTokenEntity extends BaseEntity {
  @Column({ type: 'char', length: 64 })
  tokenHash: string

  @Column({ type: 'bigint' })
  userId: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity

  @Column({ type: 'timestamptz' })
  expiresAt: Date

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null
}
