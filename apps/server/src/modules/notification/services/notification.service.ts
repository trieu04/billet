import { Injectable, NotFoundException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { RealtimeService } from '../../realtime/services/realtime.service'
import { type NotificationListResponseDto, type NotificationResponseDto } from '../dto'
import { NotificationEntity } from '../entities/notification.entity'
import { PushNotificationsService } from './push.service'

export interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  body: string
  metadata?: Record<string, unknown>
  deduplicationKey?: string
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
    private readonly realtime: RealtimeService,
    @Optional() private readonly push?: PushNotificationsService,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationResponseDto> {
    if (input.deduplicationKey) {
      const existing = await this.notifications.findOneBy({
        userId: input.userId,
        deduplicationKey: input.deduplicationKey,
      })
      if (existing) return this.toResponse(existing)
    }
    const saved = await this.notifications.save(
      this.notifications.create({
        ...input,
        type: input.type.trim(),
        title: input.title.trim(),
        body: input.body.trim(),
        metadata: input.metadata ?? {},
        readAt: null,
        deduplicationKey: input.deduplicationKey ?? null,
      }),
    )
    await this.realtime.publish(saved.userId, 'notification.created', {
      notificationId: saved.id,
    })
    await this.push?.sendToUser(saved.userId, {
      title: saved.title,
      body: saved.body,
      data: {
        notificationId: saved.id,
        type: saved.type,
        metadata: JSON.stringify(saved.metadata),
      },
    })
    return this.toResponse(saved)
  }

  async list(userId: string, page: number, limit: number): Promise<NotificationListResponseDto> {
    const [rows, total] = await this.notifications.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { data: rows.map((row) => this.toResponse(row)), page, limit, total }
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    return { count: await this.notifications.countBy({ userId, readAt: IsNull() }) }
  }

  async markRead(userId: string, id: string): Promise<NotificationResponseDto> {
    const notification = await this.findOwned(userId, id)
    if (!notification.readAt) {
      notification.readAt = new Date()
      await this.notifications.update(
        { id, userId, readAt: IsNull() },
        { readAt: notification.readAt },
      )
    }
    await this.realtime.publish(userId, 'notification.read', {
      notificationId: notification.id,
      readAt: notification.readAt?.toISOString() ?? null,
    })
    return this.toResponse(notification)
  }

  async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    )
    if (result.affected) {
      await this.realtime.publish(userId, 'notification.read-all', {
        updatedCount: result.affected,
      })
    }
    return { updatedCount: result.affected ?? 0 }
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.notifications.softDelete({ id, userId })
    if (!result.affected) throw new NotFoundException('Notification not found')
    await this.realtime.publish(userId, 'notification.deleted', { notificationId: id })
  }

  private async findOwned(userId: string, id: string): Promise<NotificationEntity> {
    const notification = await this.notifications.findOneBy({ id, userId })
    if (!notification) throw new NotFoundException('Notification not found')
    return notification
  }

  private toResponse(notification: NotificationEntity): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata,
      isRead: notification.readAt !== null,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    }
  }
}
