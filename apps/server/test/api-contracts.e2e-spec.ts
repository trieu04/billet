import { CanActivate, type ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { App } from 'supertest/types'
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard'
import { ExpenseController } from '../src/modules/expense/controller'
import { ExpenseService } from '../src/modules/expense/service'
import { ExportController } from '../src/modules/export/controller'
import { ExportService } from '../src/modules/export/service'
import { MediaController } from '../src/modules/media/controller'
import { MediaService } from '../src/modules/media/service'
import { RecognitionController } from '../src/modules/recognition/controller'
import { RecognitionService } from '../src/modules/recognition/service'
import { ReportController } from '../src/modules/report/controller'
import { ReportService } from '../src/modules/report/service'

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: '1', email: 'test@example.com' }
    return true
  }
}

describe('Expense backend OpenAPI contracts (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ExpenseController,
        MediaController,
        RecognitionController,
        ReportController,
        ExportController,
      ],
      providers: [
        JwtAuthGuard,
        { provide: ExpenseService, useValue: {} },
        { provide: MediaService, useValue: {} },
        { provide: RecognitionService, useValue: {} },
        { provide: ReportService, useValue: {} },
        { provide: ExportService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    await app.init()
  })

  afterAll(async () => app.close())

  it('documents binary uploads and explicit success response schemas', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build())
    const upload = document.paths['/api/v1/media/{id}/content']?.put

    expect(upload?.requestBody).toMatchObject({
      content: {
        'image/jpeg': { schema: { type: 'string', format: 'binary' } },
        'image/png': { schema: { type: 'string', format: 'binary' } },
        'image/webp': { schema: { type: 'string', format: 'binary' } },
      },
    })
    expect(upload?.responses?.['200']).toMatchObject({
      content: {
        'application/json': { schema: { $ref: expect.stringContaining('MediaResponseDto') } },
      },
    })
    expect(document.paths['/api/v1/expenses']?.get?.responses?.['200']).toBeDefined()
    expect(document.components?.schemas?.CalendarDayDto).toMatchObject({
      properties: {
        mediaAssetIds: {
          items: { type: 'string' },
          maxItems: 3,
          type: 'array',
        },
      },
      required: expect.arrayContaining(['mediaAssetIds']),
    })
    expect(document.paths['/api/v1/expenses/{id}']?.patch?.responses?.['200']).toBeDefined()
    expect(document.paths['/api/v1/reports/spending']?.get?.responses?.['200']).toBeDefined()
    expect(document.paths['/api/v1/recognition-jobs/{id}']?.get?.responses?.['200']).toBeDefined()
    expect(document.paths['/api/v1/exports/{id}']?.get?.responses?.['200']).toBeDefined()
    expect(document.paths['/api/v1/exports/{id}/download']?.get?.responses?.['200']).toMatchObject({
      content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
    })
  })
})
