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

  it('enforces the configured email registration policy', async () => {
    const requiredService = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
      {
        jwtSecret: 'test-secret',
        accessTokenTtl: '15m',
        registrationVerificationPolicy: 'email',
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

  it('logs in with a valid password', async () => {
    users.findByEmailWithPassword.mockResolvedValue({
      ...user,
      passwordHash: await hash('Billet123', 4),
    })

    await expect(
      service.login({ email: user.email, password: 'Billet123' }),
    ).resolves.toMatchObject({ accessToken: 'signed-token' })
  })

  it('does not reveal whether the email or password was wrong', async () => {
    users.findByEmailWithPassword.mockResolvedValue(null)

    await expect(
      service.login({ email: 'missing@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
