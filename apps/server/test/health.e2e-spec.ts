import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'

describe('Health (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    await app.init()
  })

  afterAll(async () => app.close())

  it('GET /api/v1/health', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'ok' }))
  })
})
