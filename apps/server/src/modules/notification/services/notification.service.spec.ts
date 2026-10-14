import { NotFoundException } from '@nestjs/common'
import type { Repository } from 'typeorm'
import type { RealtimeService } from '../../realtime/services/realtime.service'
import type { NotificationEntity } from '../entities/notification.entity'
import { NotificationsService } from './notification.service'

describe('NotificationsService', () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    countBy: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  }
  const realtime = { publish: jest.fn() }
  const service = new NotificationsService(
    repository as unknown as Repository<NotificationEntity>,
    realtime as unknown as RealtimeService,
  )

  beforeEach(() => jest.clearAllMocks())

  it('always scopes list queries to the current user', async () => {
    repository.findAndCount.mockResolvedValue([[], 0])

    await expect(service.list('1', 2, 10)).resolves.toEqual({
      data: [],
      page: 2,
      limit: 10,
      total: 0,
    })
    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: '1' }, skip: 10, take: 10 }),
    )
  })

  it('publishes only an identifier after creating a notification', async () => {
    const createdAt = new Date('2026-10-14T00:00:00.000Z')
    const entity = {
      id: '42',
      userId: '1',
      type: 'expense.processed',
      title: 'Receipt processed',
      body: 'Ready to review',
      metadata: { expenseId: 'expense-1' },
      readAt: null,
      createdAt,
    }
    repository.create.mockReturnValue(entity)
    repository.save.mockResolvedValue(entity)

    await service.create({
      userId: entity.userId,
      type: entity.type,
      title: entity.title,
      body: entity.body,
      metadata: entity.metadata,
    })

    expect(realtime.publish).toHaveBeenCalledWith('1', 'notification.created', {
      notificationId: '42',
    })
  })

  it('does not update a notification owned by another user', async () => {
    repository.findOneBy.mockResolvedValue(null)

    await expect(service.markRead('1', '42')).rejects.toBeInstanceOf(NotFoundException)
    expect(repository.findOneBy).toHaveBeenCalledWith({
      id: '42',
      userId: '1',
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('soft deletes only a notification owned by the current user', async () => {
    repository.softDelete.mockResolvedValue({ affected: 1 })

    await expect(service.remove('1', '42')).resolves.toBeUndefined()

    expect(repository.softDelete).toHaveBeenCalledWith({
      id: '42',
      userId: '1',
    })
    expect(realtime.publish).toHaveBeenCalledWith('1', 'notification.deleted', {
      notificationId: '42',
    })
  })
})
