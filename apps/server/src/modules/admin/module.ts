import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { decisionConfig, type DecisionConfig } from '../../configs/app.config'
import { AuthModule } from '../auth/module'
import { ExpenseModule } from '../expense/module'
import { RecognitionModule } from '../recognition/module'
import { UsersModule } from '../user/module'
import { AdminMeController } from './controllers/me.controller'
import { AdminRecognitionCatalogController } from './controllers/recognition-catalog.controller'
import { AdminRecognitionPlaygroundController } from './controllers/recognition-playground.controller'
import { AdminRecognitionStatsController } from './controllers/recognition-stats.controller'
import { AdminGuard } from './guards/admin.guard'

/** Operator API. Depends on feature modules; no feature module depends on it. */
@Module({
  imports: [
    // Multer options are per module: without this the playground upload would be unbounded.
    MulterModule.registerAsync({
      inject: [decisionConfig.KEY],
      useFactory: (config: DecisionConfig) => ({
        limits: { fileSize: config.maxImageBytes, files: 1, fields: 10, fieldSize: 1024 },
      }),
    }),
    AuthModule,
    ExpenseModule,
    RecognitionModule,
    UsersModule,
  ],
  controllers: [
    AdminMeController,
    AdminRecognitionStatsController,
    AdminRecognitionCatalogController,
    AdminRecognitionPlaygroundController,
  ],
  providers: [AdminGuard],
})
export class AdminModule {}
