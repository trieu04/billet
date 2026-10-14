import {
  Controller,
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/interface'
import {
  MarkAllReadResponseDto,
  NotificationListResponseDto,
  NotificationQueryDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
  RegisterPushDeviceDto,
  UnregisterPushDeviceDto,
} from './dto'
import { NotificationsService } from './services/notification.service'
import { PushNotificationsService } from './services/push.service'

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly push: PushNotificationsService,
  ) {}

  @Post('devices')
  @ApiOperation({ summary: 'Register or transfer an FCM device token' })
  registerDevice(@CurrentUser() user: AuthUser, @Body() input: RegisterPushDeviceDto) {
    return this.push.register(user.id, input.token, input.platform)
  }

  @Delete('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate an FCM device token' })
  unregisterDevice(@CurrentUser() user: AuthUser, @Body() input: UnregisterPushDeviceDto) {
    return this.push.unregister(user.id, input.token)
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for the authenticated account' })
  @ApiOkResponse({ type: NotificationListResponseDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notifications.list(user.id, query.page, query.limit)
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCountResponseDto> {
    return this.notifications.unreadCount(user.id)
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  markAllRead(@CurrentUser() user: AuthUser): Promise<MarkAllReadResponseDto> {
    return this.notifications.markAllRead(user.id)
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiNotFoundResponse({ description: 'Notification does not belong to the account' })
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseBigIntPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return this.notifications.markRead(user.id, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one notification' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Notification does not belong to the account' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: string): Promise<void> {
    return this.notifications.remove(user.id, id)
  }
}
