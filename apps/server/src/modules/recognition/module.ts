import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { MediaModule } from '../media/module'
import { RecognitionController } from './controller'
import { RecognitionJobEntity } from './entities/recognition-job.entity'
import { RecognitionService } from './service'
import { RECOGNITION_PROVIDER } from './interface'
import { DisabledRecognitionProvider } from './providers/disabled.provider'
@Module({
  imports: [TypeOrmModule.forFeature([RecognitionJobEntity]), AuthModule, MediaModule],
  controllers: [RecognitionController],
  providers: [
    RecognitionService,
    DisabledRecognitionProvider,
    { provide: RECOGNITION_PROVIDER, useExisting: DisabledRecognitionProvider },
  ],
  exports: [RecognitionService],
})
export class RecognitionModule {}
