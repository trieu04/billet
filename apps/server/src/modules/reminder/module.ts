import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { NotificationsModule } from '../notification/module'
import { UserSettingsEntity } from '../user/entities/user-settings.entity'
import { ReminderController } from './controller'
import { ReminderScheduleEntity } from './entities/reminder-schedule.entity'
import { ReminderService } from './service'
@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderScheduleEntity, UserSettingsEntity]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
