import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { TypeOrmModule } from '@nestjs/typeorm'
import { decisionConfig, type DecisionConfig } from '../../configs/app.config'
import { AuthModule } from '../auth/module'
import { CategoryModule } from '../category/module'
import { UsersModule } from '../user/module'
import { DecisionChoiceController } from './controllers/decision-choice.controller'
import { ExpenseRuleController } from './controllers/expense-rule.controller'
import { InferenceController } from './controllers/inference.controller'
import { SuggestionConfigController } from './controllers/suggestion-config.controller'
import { DecisionChoiceEntity } from './entities/decision-choice.entity'
import { ExpenseInferenceEntity } from './entities/expense-inference.entity'
import { ExpenseRuleEntity } from './entities/expense-rule.entity'
import { DECISION_PROVIDER } from './interface'
import { createDecisionProvider } from './providers/factory'
import { CatalogAdminService } from './services/catalog-admin.service'
import { ChoiceSetService } from './services/choice-set.service'
import { DecisionChoiceService } from './services/decision-choice.service'
import { DecisionMetricsService } from './services/decision-metrics.service'
import { ExpenseSuggestionLinkService } from './services/expense-link.service'
import { ExpenseRuleService } from './services/expense-rule.service'
import { InferenceAdminService } from './services/inference-admin.service'
import { InferenceCleanupService } from './services/inference-cleanup.service'
import { InferenceService } from './services/inference.service'
import { LearnerService } from './services/learner.service'
import { PlaygroundService } from './services/playground.service'
import { SuggestionConfigService } from './services/suggestion-config.service'

/**
 * Photo expense suggestions: decision API, suggestion snapshot, personal choices and rules, and
 * the learner. Public boundary for other modules: `LearnerService` and
 * `ExpenseSuggestionLinkService` (used by `expense`), and the admin services (used by `admin`).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DecisionChoiceEntity, ExpenseRuleEntity, ExpenseInferenceEntity]),
    // Memory storage (no `dest`), one file, size capped by EXPENSE_DECISION_MAX_IMAGE_BYTES (413).
    MulterModule.registerAsync({
      inject: [decisionConfig.KEY],
      useFactory: (config: DecisionConfig) => ({
        limits: { fileSize: config.maxImageBytes, files: 1, fields: 10, fieldSize: 1024 },
      }),
    }),
    AuthModule,
    CategoryModule,
    UsersModule,
  ],
  controllers: [
    InferenceController,
    SuggestionConfigController,
    DecisionChoiceController,
    ExpenseRuleController,
  ],
  providers: [
    {
      provide: DECISION_PROVIDER,
      inject: [decisionConfig.KEY],
      useFactory: (config: DecisionConfig) => createDecisionProvider(config),
    },
    ChoiceSetService,
    DecisionMetricsService,
    InferenceService,
    InferenceCleanupService,
    SuggestionConfigService,
    DecisionChoiceService,
    ExpenseRuleService,
    LearnerService,
    ExpenseSuggestionLinkService,
    InferenceAdminService,
    CatalogAdminService,
    PlaygroundService,
  ],
  exports: [
    DECISION_PROVIDER,
    LearnerService,
    ExpenseSuggestionLinkService,
    InferenceAdminService,
    CatalogAdminService,
    PlaygroundService,
  ],
})
export class RecognitionModule {}
