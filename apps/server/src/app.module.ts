import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RequestLoggerMiddleware } from './common/logger/request-logger.middleware'
import { StorageModule } from './common/storage/module'
import {
  appConfig,
  authConfig,
  databaseConfig,
  emailConfig,
  firebaseConfig,
  mediaConfig,
  realtimeConfig,
  recognitionConfig,
  smsConfig,
} from './configs/app.config'
import { validateEnvironment } from './configs/environment'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/module'
import { EmailModule } from './modules/email/module'
import { HealthModule } from './modules/health/module'
import { NotificationsModule } from './modules/notification/module'
import { RealtimeModule } from './modules/realtime/module'
import { SmsModule } from './modules/sms/module'
import { BudgetModule } from './modules/budget/module'
import { CategoryModule } from './modules/category/module'
import { ExpenseModule } from './modules/expense/module'
import { ExportModule } from './modules/export/module'
import { MediaModule } from './modules/media/module'
import { RecognitionModule } from './modules/recognition/module'
import { ReminderModule } from './modules/reminder/module'
import { ReportModule } from './modules/report/module'
import { UsersModule } from './modules/user/module'

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        emailConfig,
        smsConfig,
        realtimeConfig,
        mediaConfig,
        recognitionConfig,
        firebaseConfig,
      ],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    StorageModule,
    EmailModule,
    SmsModule,
    AuthModule,
    RealtimeModule,
    NotificationsModule,
    UsersModule,
    CategoryModule,
    MediaModule,
    RecognitionModule,
    ExpenseModule,
    ReportModule,
    BudgetModule,
    ReminderModule,
    ExportModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}')
  }
}
