import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { authConfig, type AuthConfig } from '../../../configs/app.config'
import type { AuthUser } from '../interface'

interface JwtPayload {
  sub: string
  email: string
  purpose?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(authConfig.KEY) config: AuthConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    })
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload.sub || !payload.email || (payload.purpose && payload.purpose !== 'access'))
      throw new UnauthorizedException()
    return { id: payload.sub, email: payload.email }
  }
}
