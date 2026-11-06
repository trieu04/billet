import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { authConfig, type AuthConfig } from '../../../configs/app.config'
import { UsersService } from '../../user/service'
import type { AuthUser } from '../interface'

interface JwtPayload {
  sub: string
  email: string
  purpose?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY) config: AuthConfig,
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub || !payload.email || (payload.purpose && payload.purpose !== 'access'))
      throw new UnauthorizedException()
    if (!(await this.users.isActive(payload.sub))) throw new UnauthorizedException()
    return { id: payload.sub, email: payload.email }
  }
}
