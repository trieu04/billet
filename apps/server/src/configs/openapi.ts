import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { AppConfig } from './app.config'

export function setupOpenApi(app: INestApplication, config: AppConfig): void {
  if (!config.docsEnabled) return

  const documentConfig = new DocumentBuilder()
    .setTitle('Billet API')
    .setDescription('API for the Billet visual expense journal.')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, documentConfig)
  SwaggerModule.setup(config.docsPath, app, document, {
    swaggerOptions: { persistAuthorization: true },
  })
}
