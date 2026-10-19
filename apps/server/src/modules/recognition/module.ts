import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/module'
import { MediaModule } from '../media/module'
import { RecognitionController } from './controller'
import { RecognitionJobEntity } from './entities/recognition-job.entity'
import { RecognitionService } from './service'
import { RECOGNITION_PROVIDER } from './interface'
import { DisabledRecognitionProvider } from './providers/disabled.provider'
import { GoogleAiStudioRecognitionProvider } from './providers/google-ai-studio.provider'
import { recognitionConfig, type RecognitionConfig } from '../../configs/app.config'
import { RecognitionQuotaGuard } from './providers/quota.guard'
@Module({
  imports: [TypeOrmModule.forFeature([RecognitionJobEntity]), AuthModule, MediaModule],
  controllers: [RecognitionController],
  providers: [
    RecognitionService,
    DisabledRecognitionProvider,
    GoogleAiStudioRecognitionProvider,
    RecognitionQuotaGuard,
    {
      provide: RECOGNITION_PROVIDER,
      inject: [
        recognitionConfig.KEY,
        DisabledRecognitionProvider,
        GoogleAiStudioRecognitionProvider,
      ],
      useFactory: (
        config: RecognitionConfig,
        disabled: DisabledRecognitionProvider,
        googleAiStudio: GoogleAiStudioRecognitionProvider,
      ) => (config.provider === 'google-ai-studio' ? googleAiStudio : disabled),
    },
  ],
  exports: [RecognitionService],
})
export class RecognitionModule {}
