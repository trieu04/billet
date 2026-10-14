import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { databaseConfig } from '../configs/app.config'
import { snakeNamingStrategy } from './snake-naming.strategy'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ReturnType<typeof databaseConfig>) => ({
        type: 'postgres' as const,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.name,
        ssl: config.ssl,
        namingStrategy: snakeNamingStrategy,
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [`${__dirname}/migrations/*{.ts,.js}`],
      }),
    }),
  ],
})
export class DatabaseModule {}
