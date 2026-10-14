import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { Repository } from 'typeorm'
import { authConfig, type AuthConfig } from '../../../configs/app.config'
import { EMAIL_DELIVERY, type EmailDelivery } from '../../email/interface'
import { SMS_DELIVERY, type SmsDelivery } from '../../sms/interface'
import { AuthChallengeEntity, type ChallengePurpose } from '../entities/auth-challenge.entity'

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(AuthChallengeEntity)
    private readonly challenges: Repository<AuthChallengeEntity>,
    @Inject(EMAIL_DELIVERY) private readonly email: EmailDelivery,
    @Inject(SMS_DELIVERY) private readonly sms: SmsDelivery,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async issue(
    destination: string,
    purpose: ChallengePurpose,
    userId: string | null,
  ): Promise<{ expiresIn: number }> {
    const normalized = destination.trim().toLowerCase()
    const previous = await this.challenges.findOne({
      where: { destination: normalized, purpose },
      order: { sentAt: 'DESC' },
    })
    if (previous && Date.now() - previous.sentAt.getTime() < 60_000)
      throw new BadRequestException('Please wait before requesting another code')
    await this.challenges.delete({ destination: normalized, purpose })
    const code = randomInt(0, 10_000).toString().padStart(4, '0')
    const now = new Date()
    await this.challenges.save(
      this.challenges.create({
        userId,
        destination: normalized,
        purpose,
        codeHash: this.hash(normalized, purpose, code),
        attempts: 0,
        sentAt: now,
        expiresAt: new Date(now.getTime() + 300_000),
      }),
    )
    try {
      if (purpose === 'registration_phone') {
        await this.sms.send({
          to: normalized,
          body: `Your Billet verification code is ${code}. It expires in 5 minutes.`,
        })
      } else {
        await this.email.send({
          to: normalized,
          subject: 'Your Billet verification code',
          text: `Your Billet verification code is ${code}. It expires in 5 minutes.`,
        })
      }
    } catch (error: unknown) {
      await this.challenges.delete({ destination: normalized, purpose })
      throw error
    }
    return { expiresIn: 300 }
  }

  async verify(
    destination: string,
    purpose: ChallengePurpose,
    code: string,
    userId?: string,
  ): Promise<void> {
    const normalized = destination.trim().toLowerCase()
    const challenge = await this.challenges.findOne({
      where: { destination: normalized, purpose },
      select: {
        id: true,
        userId: true,
        destination: true,
        purpose: true,
        codeHash: true,
        attempts: true,
        sentAt: true,
        expiresAt: true,
        createdAt: true,
      },
      order: { sentAt: 'DESC' },
    })
    if (
      !challenge ||
      challenge.expiresAt.getTime() < Date.now() ||
      (userId && challenge.userId !== userId)
    )
      throw new BadRequestException('Verification code is invalid or expired')
    if (challenge.attempts >= 5) {
      await this.challenges.delete(challenge.id)
      throw new BadRequestException('Too many verification attempts')
    }
    const actual = Buffer.from(this.hash(normalized, purpose, code))
    const expected = Buffer.from(challenge.codeHash)
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      await this.challenges.update(challenge.id, { attempts: challenge.attempts + 1 })
      throw new BadRequestException('Verification code is invalid or expired')
    }
    await this.challenges.delete(challenge.id)
  }

  private hash(destination: string, purpose: string, code: string): string {
    return createHmac('sha256', this.config.jwtSecret)
      .update(`${destination}:${purpose}:${code}`)
      .digest('hex')
  }
}
