import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RequestLoggerMiddleware } from './common/logger/request-logger.middleware'
import {
  appConfig,
  authConfig,
  databaseConfig,
  emailConfig,
  firebaseConfig,
  realtimeConfig,
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
        firebaseConfig,
      ],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    EmailModule,
    SmsModule,
    AuthModule,
    RealtimeModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}')
  }
}
