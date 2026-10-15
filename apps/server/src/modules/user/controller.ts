import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import { ProfileResponseDto, UpdateSettingsDto, UserSettingsResponseDto } from './dto'
import { UsersService } from './service'
@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class UserController {
  constructor(private readonly users: UsersService) {}
  @Get()
  @ApiOperation({
    summary: 'Get the account profile',
    description:
      'Returns the authenticated account, its preferences, and the current number of active expenses.',
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  get(@CurrentUser() user: AuthUser) {
    return this.users.profile(user.id)
  }
  @Get('settings')
  @ApiOperation({
    summary: 'Get account settings',
    description: 'Returns the locale, appearance, currency, timezone, and reminder preferences.',
  })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  settings(@CurrentUser() user: AuthUser) {
    return this.users.getSettings(user.id)
  }
  @Patch('settings')
  @ApiOperation({
    summary: 'Update account settings',
    description:
      'Partially updates the authenticated account preferences and returns the resulting settings.',
  })
  @ApiOkResponse({ type: UserSettingsResponseDto })
  update(@CurrentUser() user: AuthUser, @Body() input: UpdateSettingsDto) {
    return this.users.updateSettings(user.id, input)
  }
}
