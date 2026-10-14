import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'
import { In, Repository } from 'typeorm'
import { firebaseConfig, type FirebaseConfig } from '../../../configs/app.config'
import { PushDeviceEntity, PushPlatform } from '../entities/push-device.entity'

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, string>
}

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name)
  private messaging: Messaging | null = null

  constructor(
    @InjectRepository(PushDeviceEntity) private readonly devices: Repository<PushDeviceEntity>,
    @Inject(firebaseConfig.KEY) private readonly config: FirebaseConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.enabled) return
    try {
      const credential = cert({
        projectId: this.config.projectId,
        clientEmail: this.config.clientEmail,
        privateKey: this.config.privateKey,
      })
      const app = getApps()[0] ?? initializeApp({ credential })
      this.messaging = getMessaging(app)
    } catch (error: unknown) {
      this.logger.error(
        'Firebase initialization failed; push delivery is disabled',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  async register(userId: string, token: string, platform: PushPlatform) {
    const normalizedToken = token.trim()
    const existing = await this.devices.findOneBy({ token: normalizedToken })
    const device = existing ?? this.devices.create({ token: normalizedToken })
    Object.assign(device, { userId, platform, active: true })
    const saved = await this.devices.save(device)
    return { id: saved.id, platform: saved.platform, active: saved.active }
  }

  async unregister(userId: string, token: string): Promise<void> {
    await this.devices.update({ userId, token: token.trim(), active: true }, { active: false })
  }

  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    if (!this.messaging) return
    try {
      const devices = await this.devices.findBy({ userId, active: true })
      for (let offset = 0; offset < devices.length; offset += 500) {
        const batch = devices.slice(offset, offset + 500)
        const response = await this.messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          notification: { title: message.title, body: message.body },
          data: message.data,
        })
        const invalidIds = response.responses.flatMap((result, index) =>
          !result.success && isInvalidToken(result.error?.code) ? [batch[index].id] : [],
        )
        if (invalidIds.length) await this.devices.update({ id: In(invalidIds) }, { active: false })
      }
    } catch (error: unknown) {
      this.logger.error(
        `Push delivery failed for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}

function isInvalidToken(code?: string): boolean {
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
  )
}
