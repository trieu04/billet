import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)
  const host = config.get<string>('HOST') ?? '0.0.0.0'
  const port = config.get<number>('PORT') ?? 6700

  app.setGlobalPrefix(config.get<string>('API_PREFIX') ?? 'api/v1')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:6701',
  })
  app.enableShutdownHooks()

  await app.listen(port, host)
}

void bootstrap()
