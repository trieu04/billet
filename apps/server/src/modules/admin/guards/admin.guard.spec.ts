import { type ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { AuthConfig } from '../../../configs/app.config'
import type { UsersService } from '../../user/service'
import { AdminGuard } from './admin.guard'

function context(user?: { id: string }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext
}

describe('AdminGuard', () => {
  const findById = jest.fn()
  const guard = new AdminGuard(
    { adminUserIds: ['101'] } as AuthConfig,
    { findById } as unknown as UsersService,
  )

  beforeEach(() => findById.mockReset().mockResolvedValue({ id: '101' }))

  it('allows a listed user whose account exists', async () => {
    await expect(guard.canActivate(context({ id: '101' }))).resolves.toBe(true)
  })

  it('rejects an unlisted user without touching the database', async () => {
    await expect(guard.canActivate(context({ id: '102' }))).rejects.toThrow(ForbiddenException)
    expect(findById).not.toHaveBeenCalled()
  })

  it('rejects a listed user whose account is gone', async () => {
    findById.mockRejectedValue(new NotFoundException())
    await expect(guard.canActivate(context({ id: '101' }))).rejects.toThrow(ForbiddenException)
  })

  it('rejects when nobody is listed or no user is present', async () => {
    const empty = new AdminGuard(
      { adminUserIds: [] as string[] } as AuthConfig,
      { findById } as unknown as UsersService,
    )
    await expect(empty.canActivate(context({ id: '101' }))).rejects.toThrow(ForbiddenException)
    await expect(guard.canActivate(context())).rejects.toThrow(ForbiddenException)
  })
})
