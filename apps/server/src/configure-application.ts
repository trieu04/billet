import { ValidationPipe, type INestApplication } from '@nestjs/common'
import helmet from 'helmet'
import { appConfig, type AppConfig } from './configs/app.config'
import { setupOpenApi } from './configs/openapi'
import { HttpExceptionFilter } from './shared/exceptions/http-exception.filter'

export function configureApplication(app: INestApplication): AppConfig {
  const config = app.get<AppConfig>(appConfig.KEY)

  app.setGlobalPrefix(config.apiPrefix)
  app.use(helmet())
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableCors({ origin: config.corsOrigins })
  app.enableShutdownHooks()
  setupOpenApi(app, config)

  return config
}
