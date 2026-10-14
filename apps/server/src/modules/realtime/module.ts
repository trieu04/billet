import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/module'
import { UsersModule } from '../user/module'
import { RealtimeAuthService } from './services/auth.service'
import { RealtimeService } from './services/realtime.service'
import { RealtimeServerService } from './services/server.service'

@Module({
  imports: [AuthModule, UsersModule],
  providers: [RealtimeAuthService, RealtimeService, RealtimeServerService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
