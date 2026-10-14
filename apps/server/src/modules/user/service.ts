import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from './entities/user.entity'
import type { UserResponseDto } from './dto'

export interface CreateUserInput {
  username: string
  email: string
  displayName: string
  passwordHash: string
  phoneNumber?: string
  emailVerified?: boolean
  phoneNumberVerified?: boolean
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async create(input: CreateUserInput): Promise<UserEntity> {
    const email = normalizeEmail(input.email)
    const username = input.username.trim().toLowerCase()
    if (await this.users.existsBy({ username })) {
      throw new ConflictException('An account with this username already exists')
    }
    if (await this.users.existsBy({ email })) {
      throw new ConflictException('An account with this email already exists')
    }
    if (input.phoneNumber && (await this.users.existsBy({ phoneNumber: input.phoneNumber }))) {
      throw new ConflictException('An account with this phone number already exists')
    }

    try {
      return await this.users.save(
        this.users.create({ ...input, email, username, displayName: input.displayName.trim() }),
      )
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'An account with this email, username, or phone number already exists',
        )
      }
      throw error
    }
  }

  async availability(email?: string, phoneNumber?: string, username?: string) {
    const [emailUsed, phoneNumberUsed, usernameUsed] = await Promise.all([
      email ? this.users.existsBy({ email: normalizeEmail(email) }) : false,
      phoneNumber ? this.users.existsBy({ phoneNumber }) : false,
      username ? this.users.existsBy({ username: username.trim().toLowerCase() }) : false,
    ])
    return {
      emailAvailable: email ? !emailUsed : null,
      phoneNumberAvailable: phoneNumber ? !phoneNumberUsed : null,
      usernameAvailable: username ? !usernameUsed : null,
    }
  }

  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.users.findOne({
      where: { email: normalizeEmail(email) },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        passwordHash: true,
        emailVerified: true,
        phoneNumber: true,
        phoneNumberVerified: true,
        mfaMethods: true,
        authenticatorSecret: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async findAuthFields(id: string): Promise<UserEntity> {
    const user = await this.users.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        passwordHash: true,
        emailVerified: true,
        phoneNumber: true,
        phoneNumberVerified: true,
        mfaMethods: true,
        authenticatorSecret: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async updateSecurity(
    id: string,
    values: Partial<
      Pick<UserEntity, 'passwordHash' | 'emailVerified' | 'mfaMethods' | 'authenticatorSecret'>
    >,
  ): Promise<void> {
    await this.users.update(id, values)
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.users.findOneBy({ id })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  toResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      phoneNumberVerified: user.phoneNumberVerified,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
