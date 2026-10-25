import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { UserEntity } from './entities/user.entity'
import { UserSettingsEntity } from './entities/user-settings.entity'
import type {
  ProfileResponseDto,
  UpdateProfileDto,
  UpdateSettingsDto,
  UserResponseDto,
  UserSettingsResponseDto,
} from './dto'

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
    @InjectRepository(UserSettingsEntity) private readonly settings: Repository<UserSettingsEntity>,
    private readonly dataSource: DataSource,
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
      select: authFields,
    })
  }

  findByLoginIdentifierWithPassword(identifier: string): Promise<UserEntity | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase()
    return this.users.findOne({
      where: [
        { username: normalizedIdentifier },
        { email: normalizedIdentifier },
        { phoneNumber: normalizedIdentifier },
      ],
      select: authFields,
    })
  }

  async findAuthFields(id: string): Promise<UserEntity> {
    const user = await this.users.findOne({
      where: { id },
      select: authFields,
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

  async updateProfile(userId: string, input: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.findById(userId)
    user.displayName = input.displayName.trim()
    await this.users.save(user)
    return this.profile(userId)
  }

  async getSettings(userId: string): Promise<UserSettingsResponseDto> {
    let settings = await this.settings.findOneBy({ userId })
    settings ??= await this.settings.save(this.settings.create({ userId }))
    return this.settingsResponse(settings)
  }

  async updateSettings(userId: string, input: UpdateSettingsDto): Promise<UserSettingsResponseDto> {
    if (input.timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: input.timezone }).format()
      } catch {
        throw new ConflictException('Unknown timezone')
      }
    }
    let settings = await this.settings.findOneBy({ userId })
    settings ??= this.settings.create({ userId })
    Object.assign(settings, input)
    if (!settings.reminderEnabled) settings.reminderTime = null
    if (settings.reminderEnabled && !settings.reminderTime)
      throw new ConflictException('Reminder time is required when reminders are enabled')
    await this.settings.save(settings)
    return this.getSettings(userId)
  }

  async profile(userId: string): Promise<ProfileResponseDto> {
    const [user, settings, count] = await Promise.all([
      this.findById(userId),
      this.getSettings(userId),
      this.dataSource.query<{ count: string }[]>(
        `SELECT count(*)::text AS count FROM expenses WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId],
      ),
    ])
    return { ...this.toResponse(user), settings, expenseCount: Number(count[0]?.count ?? 0) }
  }

  private settingsResponse(settings: UserSettingsEntity): UserSettingsResponseDto {
    return {
      id: settings.id,
      defaultCurrency: settings.defaultCurrency,
      timezone: settings.timezone,
      locale: settings.locale,
      appearance: settings.appearance,
      reminderEnabled: settings.reminderEnabled,
      reminderTime: settings.reminderTime?.slice(0, 5) ?? null,
    }
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

const authFields = {
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
} as const

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
