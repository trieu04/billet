import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { AuthUser } from '../interface'

@Injectable()
export class MfaPendingGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1]
    if (!token) throw new UnauthorizedException()
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; purpose: string }>(
        token,
      )
      if (payload.purpose !== 'mfa_pending') throw new Error('Wrong token purpose')
      request.user = { id: payload.sub, email: payload.email }
      return true
    } catch {
      throw new UnauthorizedException('MFA pending token is missing or invalid')
    }
  }
}
