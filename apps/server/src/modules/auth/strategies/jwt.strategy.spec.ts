import { UnauthorizedException } from '@nestjs/common'
import type { AuthConfig } from '../../../configs/app.config'
import type { UsersService } from '../../user/service'
import { JwtStrategy } from './jwt.strategy'

const config = {
  jwtSecret: 'test-secret-that-is-long-enough',
} as AuthConfig

describe('JwtStrategy', () => {
  it('accepts an access token for an active account', async () => {
    const users = { isActive: jest.fn().mockResolvedValue(true) }
    const strategy = new JwtStrategy(config, users as unknown as UsersService)

    await expect(
      strategy.validate({ sub: '101', email: 'devt@example.com', purpose: 'access' }),
    ).resolves.toEqual({ id: '101', email: 'devt@example.com' })
  })

  it('rejects an access token after its account is deleted', async () => {
    const users = { isActive: jest.fn().mockResolvedValue(false) }
    const strategy = new JwtStrategy(config, users as unknown as UsersService)

    await expect(
      strategy.validate({ sub: '101', email: 'devt@example.com', purpose: 'access' }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
