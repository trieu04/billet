import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { configureApplication } from './configure-application'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = configureApplication(app)

  await app.listen(config.port, config.host)
  Logger.log(`Server running at ${await app.getUrl()}`, 'Bootstrap')
}

void bootstrap()
