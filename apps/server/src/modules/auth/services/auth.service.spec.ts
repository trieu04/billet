import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { hash } from 'bcryptjs'
import type { UserEntity } from '../../user/entities/user.entity'
import { UsersService } from '../../user/service'
import { AuthService } from './auth.service'

const user: UserEntity = {
  id: '1',
  username: 'ntdm11',
  email: 'trieu@example.com',
  displayName: 'Trieu',
  passwordHash: '',
  emailVerified: false,
  phoneNumber: null,
  phoneNumberVerified: false,
  mfaMethods: [],
  authenticatorSecret: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
}

describe('AuthService', () => {
  const users = {
    create: jest.fn(),
    availability: jest.fn(),
    findByLoginIdentifierWithPassword: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
    toResponse: jest.fn((value: UserEntity) => ({
      id: value.id,
      username: value.username,
      email: value.email,
      emailVerified: value.emailVerified,
      phoneNumber: value.phoneNumber,
      phoneNumberVerified: value.phoneNumberVerified,
      displayName: value.displayName,
      createdAt: value.createdAt.toISOString(),
    })),
  }
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') }
  const service = new AuthService(users as unknown as UsersService, jwt as unknown as JwtService, {
    jwtSecret: 'test-secret',
    accessTokenTtl: '15m',
    refreshTokenTtl: '30d',
    registrationVerificationPolicy: 'none',
    googleClientIds: [],
    appleClientIds: [],
  })

  beforeEach(() => jest.clearAllMocks())

  it('hashes a password when registering', async () => {
    users.create.mockResolvedValue(user)

    const result = await service.register({
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      password: 'Billet123',
    })

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: user.email,
        username: user.username,
        passwordHash: expect.not.stringMatching('Billet123'),
      }),
    )
    expect(result).toMatchObject({ accessToken: 'signed-token', expiresIn: 900 })
  })

  it('generates profile fields for email and password registration', async () => {
    users.availability.mockResolvedValue({ usernameAvailable: true })
    users.create.mockResolvedValue(user)

    await service.register({ email: user.email, password: 'Billet123' })

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ username: expect.stringMatching(/^trieu_/), displayName: 'trieu' }),
    )
  })

  it('enforces the configured email registration policy', async () => {
    const requiredService = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
      {
        jwtSecret: 'test-secret',
        accessTokenTtl: '15m',
        refreshTokenTtl: '30d',
        registrationVerificationPolicy: 'email',
        googleClientIds: [],
        appleClientIds: [],
      },
    )
    await expect(
      requiredService.register({
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        password: 'Billet123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(users.create).not.toHaveBeenCalled()
  })

  it.each(['phone', 'one_of', 'both'] as const)(
    'rejects an unverified registration under the %s policy',
    async (policy) => {
      const requiredService = new AuthService(
        users as unknown as UsersService,
        jwt as unknown as JwtService,
        {
          jwtSecret: 'test-secret',
          accessTokenTtl: '15m',
          refreshTokenTtl: '30d',
          registrationVerificationPolicy: policy,
          googleClientIds: [],
          appleClientIds: [],
        },
      )
      await expect(
        requiredService.register({
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          password: 'Billet123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException)
    },
  )

  it.each([user.username, user.email, '+84901234567'])(
    'logs in with identifier %s and a valid password',
    async (identifier) => {
      users.findByLoginIdentifierWithPassword.mockResolvedValue({
        ...user,
        passwordHash: await hash('Billet123', 4),
      })

      await expect(service.login({ identifier, password: 'Billet123' })).resolves.toMatchObject({
        accessToken: 'signed-token',
      })
      expect(users.findByLoginIdentifierWithPassword).toHaveBeenCalledWith(identifier)
    },
  )

  it('does not reveal whether the identifier or password was wrong', async () => {
    users.findByLoginIdentifierWithPassword.mockResolvedValue(null)

    await expect(
      service.login({ identifier: 'missing@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('rotates a refresh token exactly once', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 1 })
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute,
    }
    const refreshTokens = {
      findOne: jest.fn().mockResolvedValue({
        id: '10',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      }),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn((value) => value),
      save: jest.fn(),
    }
    users.findById.mockResolvedValue(user)
    const rotatingService = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
      {
        jwtSecret: 'test-secret',
        accessTokenTtl: '15m',
        refreshTokenTtl: '30d',
        registrationVerificationPolicy: 'none',
        googleClientIds: [],
        appleClientIds: [],
      },
      undefined,
      undefined,
      refreshTokens as never,
    )

    const response = await rotatingService.refresh({ refreshToken: 'r'.repeat(64) })

    expect(execute).toHaveBeenCalledTimes(1)
    expect(refreshTokens.save).toHaveBeenCalledTimes(1)
    expect(response).toMatchObject({
      accessToken: 'signed-token',
      refreshToken: expect.any(String),
    })
  })
})
