import 'dotenv/config'
import { DataSource } from 'typeorm'
import { AuthChallengeEntity } from '../modules/auth/entities/auth-challenge.entity'
import { NotificationEntity } from '../modules/notification/entities/notification.entity'
import { PushDeviceEntity } from '../modules/notification/entities/push-device.entity'
import { UserEntity } from '../modules/user/entities/user.entity'
import { snakeNamingStrategy } from './snake-naming.strategy'

const applicationDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 6710),
  username: process.env.DB_USERNAME ?? 'billet',
  password: process.env.DB_PASSWORD ?? 'billet',
  database: process.env.DB_NAME ?? 'billet',
  ssl: process.env.DB_SSL === 'true',
  namingStrategy: snakeNamingStrategy,
  synchronize: false,
  entities: [UserEntity, NotificationEntity, PushDeviceEntity, AuthChallengeEntity],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
})

export default applicationDataSource
