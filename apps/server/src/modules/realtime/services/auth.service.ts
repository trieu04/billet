import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { AuthUser } from '../../auth/interface'
import { UsersService } from '../../user/service'

interface RealtimeJwtPayload {
  sub?: unknown
  email?: unknown
}

@Injectable()
export class RealtimeAuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async authenticate(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<RealtimeJwtPayload>(token)
      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
        throw new Error('Invalid token payload')
      }
      const user = await this.users.findById(payload.sub)
      if (user.email !== payload.email) throw new Error('Token subject changed')
      return { id: user.id, email: user.email }
    } catch {
      throw new UnauthorizedException('Realtime authentication failed')
    }
  }
}
