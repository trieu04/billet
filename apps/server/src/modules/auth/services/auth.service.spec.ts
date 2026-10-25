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
})
