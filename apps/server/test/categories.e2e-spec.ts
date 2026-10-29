import {
  CanActivate,
  type ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard'
import { CategoryController } from '../src/modules/category/controller'
import { CategoryService } from '../src/modules/category/service'

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: '7', email: 'test@example.com' }
    return true
  }
}

const category = {
  id: '22',
  code: 'custom-cafe',
  name: 'Cà phê',
  color: '#F4B89C',
  icon: 'coffee',
  sortOrder: 1010,
  usageCount: 0,
  isCustom: true,
}

describe('Categories (e2e)', () => {
  let app: INestApplication<App>
  const categories = {
    list: jest.fn().mockResolvedValue([category]),
    create: jest.fn().mockResolvedValue(category),
    update: jest.fn().mockResolvedValue(category),
    remove: jest.fn().mockResolvedValue(undefined),
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [JwtAuthGuard, { provide: CategoryService, useValue: categories }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile()

    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
    await app.init()
  })

  afterAll(async () => app.close())

  it('lists categories ranked for the authenticated account', async () => {
    await request(app.getHttpServer()).get('/api/v1/categories').expect(200).expect([category])
    expect(categories.list).toHaveBeenCalledWith('7')
  })

  it('creates, updates, and archives a custom category', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send({ name: 'Cà phê', color: '#F4B89C', icon: 'coffee' })
      .expect(201)
      .expect(category)
    expect(categories.create).toHaveBeenCalledWith('7', {
      name: 'Cà phê',
      color: '#F4B89C',
      icon: 'coffee',
    })

    await request(app.getHttpServer())
      .patch('/api/v1/categories/22')
      .send({ name: 'Đi cà phê' })
      .expect(200)
    expect(categories.update).toHaveBeenCalledWith('7', '22', { name: 'Đi cà phê' })

    await request(app.getHttpServer()).delete('/api/v1/categories/22').expect(204)
    expect(categories.remove).toHaveBeenCalledWith('7', '22')
  })

  it('rejects unsupported icons and blank names', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send({ name: '   ', color: '#F4B89C', icon: 'unknown-icon' })
      .expect(400)
    expect(categories.create).toHaveBeenCalledTimes(1)
  })
})
