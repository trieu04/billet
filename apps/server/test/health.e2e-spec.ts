import { INestApplication } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { appConfig } from '../src/configs/app.config'
import { configureApplication } from '../src/configure-application'
import { HealthModule } from '../src/modules/health/module'

describe('Health (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }), HealthModule],
    }).compile()
    app = module.createNestApplication()
    configureApplication(app)
    await app.init()
  })

  afterAll(async () => app.close())

  it('GET /api/v1/health', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'ok' }))
  })

  it('serves the OpenAPI document', async () => {
    await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          info: { title: 'Billet API' },
          paths: { '/api/v1/health': expect.any(Object) },
        }),
      )
  })

  it('does not duplicate the API prefix in Swagger request URLs', async () => {
    await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.servers).toEqual([])
        expect(body.paths['/api/v1/health']).toBeDefined()
      })
  })

  it('returns a stable error response', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/missing')
      .expect(404)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          path: '/api/v1/missing',
          timestamp: expect.any(String),
        }),
      )
  })
})
