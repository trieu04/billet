import 'dotenv/config'
import { DataSource } from 'typeorm'
import { AuthChallengeEntity } from '../modules/auth/entities/auth-challenge.entity'
import { AuthIdentityEntity } from '../modules/auth/entities/auth-identity.entity'
import { NotificationEntity } from '../modules/notification/entities/notification.entity'
import { PushDeviceEntity } from '../modules/notification/entities/push-device.entity'
import { UserEntity } from '../modules/user/entities/user.entity'
import { UserSettingsEntity } from '../modules/user/entities/user-settings.entity'
import { CategoryEntity } from '../modules/category/entities/category.entity'
import { MediaAssetEntity } from '../modules/media/entities/media-asset.entity'
import { RecognitionJobEntity } from '../modules/recognition/entities/recognition-job.entity'
import { ExpenseEntity } from '../modules/expense/entities/expense.entity'
import { MonthlyBudgetEntity } from '../modules/budget/entities/monthly-budget.entity'
import { ReminderScheduleEntity } from '../modules/reminder/entities/reminder-schedule.entity'
import { ExportJobEntity } from '../modules/export/entities/export-job.entity'
import { snakeNamingStrategy } from './snake-naming.strategy'

const applicationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 6710),
  username: process.env.DATABASE_USERNAME ?? 'billet',
  password: process.env.DATABASE_PASSWORD ?? 'billet',
  database: process.env.DATABASE_NAME ?? 'billet',
  ssl: process.env.DATABASE_SSL_ENABLED === 'true',
  namingStrategy: snakeNamingStrategy,
  synchronize: false,
  entities: [
    UserEntity,
    UserSettingsEntity,
    NotificationEntity,
    PushDeviceEntity,
    AuthChallengeEntity,
    AuthIdentityEntity,
    CategoryEntity,
    MediaAssetEntity,
    RecognitionJobEntity,
    ExpenseEntity,
    MonthlyBudgetEntity,
    ReminderScheduleEntity,
    ExportJobEntity,
  ],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
})

export default applicationDataSource
