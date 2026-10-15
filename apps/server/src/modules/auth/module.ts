import { forwardRef, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import type { JwtSignOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { authConfig } from '../../configs/app.config'
import { UsersModule } from '../user/module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EmailModule } from '../email/module'
import { SmsModule } from '../sms/module'
import { AuthChallengeEntity } from './entities/auth-challenge.entity'
import { AuthController } from './controller'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { MfaPendingGuard } from './guards/mfa-pending.guard'
import { AuthService } from './services/auth.service'
import { OtpService } from './services/otp.service'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
  imports: [
    forwardRef(() => UsersModule),
    EmailModule,
    SmsModule,
    TypeOrmModule.forFeature([AuthChallengeEntity]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (config: ReturnType<typeof authConfig>) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.accessTokenTtl as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, MfaPendingGuard, OtpService],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
