import { CanActivate, type ExecutionContext, INestApplication } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { appConfig } from '../src/configs/app.config'
import { configureApplication } from '../src/configure-application'
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard'
import { NotificationsController } from '../src/modules/notification/controller'
import { NotificationsService } from '../src/modules/notification/services/notification.service'
import { PushNotificationsService } from '../src/modules/notification/services/push.service'

const userId = '1'
const notificationId = '42'
const notification = {
  id: notificationId,
  type: 'expense.processed',
  title: 'Receipt processed',
  body: 'Your receipt is ready to review.',
  metadata: { expenseId: 'expense-1' },
  isRead: false,
  readAt: null,
  createdAt: '2026-10-14T00:00:00.000Z',
}

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { id: userId, email: 'trieu@example.com' }
    return true
  }
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>
  const notifications = {
    list: jest.fn().mockResolvedValue({ data: [notification], page: 1, limit: 20, total: 1 }),
    unreadCount: jest.fn().mockResolvedValue({ count: 1 }),
    markRead: jest.fn().mockResolvedValue({
      ...notification,
      isRead: true,
      readAt: '2026-10-14T00:01:00.000Z',
    }),
    markAllRead: jest.fn().mockResolvedValue({ updatedCount: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
  }
  const push = { register: jest.fn(), unregister: jest.fn() }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [appConfig] })],
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notifications },
        { provide: PushNotificationsService, useValue: push },
        JwtAuthGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .compile()

    app = module.createNestApplication()
    configureApplication(app)
    await app.init()
  })

  afterAll(async () => app.close())

  it('lists only through the authenticated user scope', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications?page=1&limit=20')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ data: [notification], total: 1 }))

    expect(notifications.list).toHaveBeenCalledWith(userId, 1, 20)
  })

  it('validates pagination input', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications?limit=101').expect(400)
  })

  it('supports unread and read-state operations', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .expect(200)
      .expect({ count: 1 })
    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .expect(200)
    await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .expect(200)
      .expect({ updatedCount: 1 })
    await request(app.getHttpServer()).delete(`/api/v1/notifications/${notificationId}`).expect(204)
  })
})
