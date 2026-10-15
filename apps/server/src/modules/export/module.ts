import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { ExportController } from './controller'
import { ExportJobEntity } from './entities/export-job.entity'
import { ExportService } from './service'
@Module({
  imports: [TypeOrmModule.forFeature([ExportJobEntity]), AuthModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
