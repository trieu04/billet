import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import type { Request } from 'express'
import { authConfig, type AuthConfig } from '../../../configs/app.config'
import type { AuthUser } from '../../auth/interface'
import { UsersService } from '../../user/service'

/**
 * Allows users listed in `ADMIN_USER_IDS` whose account still exists. Runs after `JwtAuthGuard`.
 * Admin rights are never part of the token, so removing an id takes effect on restart.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    if (!user || !this.config.adminUserIds.includes(user.id)) throw new ForbiddenException()
    try {
      await this.users.findById(user.id)
    } catch {
      throw new ForbiddenException()
    }
    return true
  }
}
