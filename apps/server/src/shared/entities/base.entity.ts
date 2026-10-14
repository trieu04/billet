import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

export abstract class TimestampedEntity {
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}

export abstract class BaseEntity extends TimestampedEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string
}

export abstract class SoftDeleteBaseEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null
}

export abstract class UuidBaseEntity extends TimestampedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string
}

export abstract class SoftDeleteUuidBaseEntity extends UuidBaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null
}
