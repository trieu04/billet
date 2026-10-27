import { CanActivate, type ExecutionContext, INestApplication } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import request from 'supertest'
import { App } from 'supertest/types'
import { appConfig } from '../src/configs/app.config'
import { configureApplication } from '../src/configure-application'
import { AuthController } from '../src/modules/auth/controller'
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard'
import { MfaPendingGuard } from '../src/modules/auth/guards/mfa-pending.guard'
import { AuthService } from '../src/modules/auth/services/auth.service'

const user = {
  id: '1',
  username: 'ntdm11',
  email: 'trieu@example.com',
  displayName: 'Trieu',
  createdAt: '2026-01-01T00:00:00.000Z',
}

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: user.id, email: user.email }
    return true
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>
  const auth = {
    register: jest.fn().mockResolvedValue({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    }),
    refresh: jest.fn().mockResolvedValue({
      accessToken: 'refreshed-token',
      refreshToken: 'rotated-refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    }),
    logout: jest.fn().mockResolvedValue({ success: true }),
    currentUser: jest.fn().mockResolvedValue(user),
    registrationAvailability: jest.fn().mockResolvedValue({
      emailAvailable: true,
      phoneNumberAvailable: null,
      usernameAvailable: null,
    }),
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [appConfig] })],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        JwtAuthGuard,
        { provide: MfaPendingGuard, useClass: TestAuthGuard },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .overrideGuard(MfaPendingGuard)
      .useClass(TestAuthGuard)
      .compile()

    app = module.createNestApplication()
    configureApplication(app)
    await app.init()
  })

  afterAll(async () => app.close())

  it('validates and registers an account', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: ' TRIEU@example.com ',
        username: ' Ntdm11 ',
        displayName: 'Trieu',
        password: 'Billet123',
      })
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ user, tokenType: 'Bearer' }))

    expect(auth.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'trieu@example.com', username: 'ntdm11' }),
    )
  })

  it('rejects weak passwords and unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'trieu@example.com',
        username: 'ntdm11',
        displayName: 'Trieu',
        password: 'weak',
        admin: true,
      })
      .expect(400)
  })

  it('checks whether registration contacts are available', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register/availability')
      .send({ email: user.email })
      .expect(200)
      .expect({ emailAvailable: true, phoneNumberAvailable: null, usernameAvailable: null })
    expect(auth.registrationAvailability).toHaveBeenCalledWith(user.email, undefined, undefined)

    await request(app.getHttpServer())
      .post('/api/v1/auth/register/availability')
      .send({ username: ' Ntdm11 ' })
      .expect(200)
    expect(auth.registrationAvailability).toHaveBeenCalledWith(undefined, undefined, 'ntdm11')
  })

  it('logs in and exposes the current account contract', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: ' Ntdm11 ', password: 'Billet123' })
      .expect(200)

    expect(auth.login).toHaveBeenCalledWith({ identifier: 'ntdm11', password: 'Billet123' })

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(200).expect(user)
    expect(auth.currentUser).toHaveBeenCalledWith(user.id)
  })

  it('rotates and revokes refresh tokens', async () => {
    const refreshToken = 'r'.repeat(64)
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ accessToken: 'refreshed-token' }))
    expect(auth.refresh).toHaveBeenCalledWith({ refreshToken })

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200)
      .expect({ success: true })
    expect(auth.logout).toHaveBeenCalledWith({ refreshToken })
  })

  it('documents auth endpoints in journey order with descriptions and response examples', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build())

    expect(Object.keys(document.paths)).toEqual([
      '/api/v1/auth/register',
      '/api/v1/auth/register/availability',
      '/api/v1/auth/register/verification/request',
      '/api/v1/auth/register/verification/confirm',
      '/api/v1/auth/login',
      '/api/v1/auth/social',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/auth/me',
      '/api/v1/auth/password-reset/request',
      '/api/v1/auth/password-reset',
      '/api/v1/auth/password',
      '/api/v1/auth/verification/request',
      '/api/v1/auth/verification/confirm',
      '/api/v1/auth/mfa/methods',
      '/api/v1/auth/mfa/enroll/request',
      '/api/v1/auth/mfa/enroll/confirm',
      '/api/v1/auth/mfa/challenge',
      '/api/v1/auth/mfa/verify',
      '/api/v1/auth/mfa/disable/request',
      '/api/v1/auth/mfa/disable',
    ])
    expect(document.paths['/api/v1/auth/register']?.post?.description).toContain(
      'Creates an account',
    )
    expect(document.paths['/api/v1/auth/mfa/verify']?.post?.responses?.['200']).toBeDefined()
    expect(document.components?.schemas?.SuccessResponseDto).toMatchObject({
      properties: { success: { example: true } },
    })
    expect(document.components?.schemas?.RegistrationAvailabilityDto).toMatchObject({
      properties: { username: { example: 'ntdm11' } },
    })
    expect(document.components?.schemas?.RegistrationVerificationRequestDto).not.toMatchObject({
      properties: { username: expect.anything() },
    })
    expect(document.components?.schemas?.LoginDto).toMatchObject({
      properties: {
        identifier: {
          description: 'Username, email address, or E.164 phone number',
        },
      },
      required: expect.arrayContaining(['identifier', 'password']),
    })
  })
})
