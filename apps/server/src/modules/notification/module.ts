import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { RealtimeModule } from '../realtime/module'
import { NotificationEntity } from './entities/notification.entity'
import { PushDeviceEntity } from './entities/push-device.entity'
import { NotificationsController } from './controller'
import { NotificationsService } from './services/notification.service'
import { PushNotificationsService } from './services/push.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, PushDeviceEntity]),
    AuthModule,
    RealtimeModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationsService],
  exports: [NotificationsService, PushNotificationsService],
})
export class NotificationsModule {}
