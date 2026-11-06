import { CanActivate, type ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import request from 'supertest'
import { App } from 'supertest/types'
import { ValidationPipe } from '@nestjs/common'
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard'
import { UserController } from '../src/modules/user/controller'
import { UsersService } from '../src/modules/user/service'

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: '101', email: 'devt@example.com' }
    return true
  }
}

describe('Profile account deletion (e2e)', () => {
  let app: INestApplication<App>
  const users = {
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    requestAccountDeletion: jest.fn(),
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [JwtAuthGuard, { provide: UsersService, useValue: users }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
  })

  afterAll(async () => app.close())

  it('issues a confirmation code without deleting anything', async () => {
    users.requestAccountDeletion.mockResolvedValue({ confirmationCode: 'code-1', expiresIn: 300 })
    await request(app.getHttpServer())
      .post('/api/v1/profile/deletion-request')
      .expect(200)
      .expect({ confirmationCode: 'code-1', expiresIn: 300 })
    expect(users.requestAccountDeletion).toHaveBeenCalledWith('101')
    expect(users.deleteAccount).not.toHaveBeenCalled()
  })

  it('deletes the authenticated account with a confirmation code', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/profile')
      .send({ confirmationCode: 'code-1' })
      .expect(204)
      .expect('')
    expect(users.deleteAccount).toHaveBeenCalledWith('101', 'code-1')
  })

  it.each([undefined, {}, { confirmationCode: '  ' }, { confirmationCode: true }])(
    'rejects deletion without a confirmation code (%j)',
    async (body) => {
      users.deleteAccount.mockClear()
      await request(app.getHttpServer()).delete('/api/v1/profile').send(body).expect(400)
      expect(users.deleteAccount).not.toHaveBeenCalled()
    },
  )

  it('documents the destructive account endpoint', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build())
    expect(document.paths['/api/v1/profile']?.delete?.responses?.['204']).toBeDefined()
    expect(document.paths['/api/v1/profile/deletion-request']?.post).toBeDefined()
  })
})
