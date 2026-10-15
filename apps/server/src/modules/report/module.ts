import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/module'
import { ReportController } from './controller'
import { ReportService } from './service'
@Module({ imports: [AuthModule], controllers: [ReportController], providers: [ReportService] })
export class ReportModule {}
