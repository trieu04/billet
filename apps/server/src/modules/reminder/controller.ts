import { Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { ReminderService } from './service'
@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class ReminderController {
  constructor(private readonly reminders: ReminderService) {}
  @Post('sync')
  @ApiOperation({
    summary: 'Synchronize expense reminders',
    description:
      'Creates any reminder notifications currently due for the authenticated account while avoiding duplicates.',
  })
  sync(@CurrentUser() u: AuthUser) {
    return this.reminders.sync(u.id)
  }
}
