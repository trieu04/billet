import { Column, Entity, Index } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

export type ChallengePurpose =
  | 'registration_email'
  | 'registration_phone'
  | 'email_verification'
  | 'password_reset'
  | 'mfa_enroll'
  | 'mfa_login'
  | 'mfa_disable'

@Entity({ name: 'auth_challenges' })
@Index('idx_auth_challenges_destination_purpose', ['destination', 'purpose'])
export class AuthChallengeEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'bigint', nullable: true })
  userId: string | null

  @Column({ length: 320 })
  destination: string

  @Column({ length: 32 })
  purpose: ChallengePurpose

  @Column({ length: 64, select: false })
  codeHash: string

  @Column({ default: 0 })
  attempts: number

  @Column({ type: 'timestamptz' })
  sentAt: Date

  @Column({ type: 'timestamptz' })
  expiresAt: Date
}
