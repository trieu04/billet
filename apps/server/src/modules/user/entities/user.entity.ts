import { Column, Entity } from 'typeorm'
import { SoftDeleteBaseEntity } from '../../../shared/entities/base.entity'

@Entity({ name: 'users' })
export class UserEntity extends SoftDeleteBaseEntity {
  @Column({ length: 30, unique: true })
  username: string

  @Column({ length: 100 })
  displayName: string

  @Column({ length: 255, select: false })
  passwordHash: string

  @Column({ length: 320, unique: true })
  email: string

  @Column({ default: false })
  emailVerified: boolean

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phoneNumber: string | null

  @Column({ default: false })
  phoneNumberVerified: boolean

  @Column({ type: 'text', array: true, default: '{}' })
  mfaMethods: string[]

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  authenticatorSecret: string | null
}
