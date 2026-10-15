import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotificationsService } from '../notification/services/notification.service'
import { UserSettingsEntity } from '../user/entities/user-settings.entity'
import { ReminderScheduleEntity } from './entities/reminder-schedule.entity'
@Injectable()
export class ReminderService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout
  constructor(
    @InjectRepository(ReminderScheduleEntity)
    private readonly schedules: Repository<ReminderScheduleEntity>,
    @InjectRepository(UserSettingsEntity) private readonly settings: Repository<UserSettingsEntity>,
    private readonly notifications: NotificationsService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.runDue().catch(() => undefined), 60_000)
    this.timer.unref()
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }
  async sync(userId: string) {
    const settings = await this.settings.findOneBy({ userId })
    if (!settings?.reminderEnabled || !settings.reminderTime) {
      await this.schedules.delete({ userId })
      return { enabled: false, nextRunAt: null }
    }
    let schedule = await this.schedules.findOneBy({ userId })
    schedule ??= this.schedules.create({ userId, lastLocalDate: null, leaseExpiresAt: null })
    schedule.nextRunAt = nextOccurrence(settings.timezone, settings.reminderTime, new Date())
    schedule = await this.schedules.save(schedule)
    return { enabled: true, nextRunAt: schedule.nextRunAt.toISOString() }
  }
  async runDue() {
    await this.reconcileSchedules()
    const due = await this.schedules
      .createQueryBuilder('s')
      .where('s.nextRunAt <= now()')
      .orderBy('s.nextRunAt', 'ASC')
      .take(50)
      .getMany()
    for (const schedule of due) await this.process(schedule)
  }
  private async reconcileSchedules() {
    const enabled = await this.settings.find({ where: { reminderEnabled: true } })
    for (const settings of enabled) {
      if (!settings.reminderTime) continue
      const schedule = await this.schedules.findOneBy({ userId: settings.userId })
      if (!schedule || settings.updatedAt > schedule.updatedAt) await this.sync(settings.userId)
    }
    await this.schedules
      .createQueryBuilder()
      .delete()
      .where(
        'user_id NOT IN (SELECT user_id FROM user_settings WHERE reminder_enabled = true AND reminder_time IS NOT NULL)',
      )
      .execute()
  }
  private async process(schedule: ReminderScheduleEntity) {
    const settings = await this.settings.findOneBy({ userId: schedule.userId })
    if (!settings?.reminderEnabled || !settings.reminderTime) {
      await this.schedules.delete(schedule.id)
      return
    }
    const localDate = formatLocalDate(new Date(), settings.timezone)
    await this.notifications.create({
      userId: schedule.userId,
      type: 'journal.reminder',
      title: 'Ghi lại hôm nay',
      body: 'Bạn có khoản chi nào muốn lưu vào Billet không?',
      metadata: { localDate },
      deduplicationKey: `journal-reminder:${localDate}`,
    })
    schedule.lastLocalDate = localDate
    schedule.nextRunAt = nextOccurrence(
      settings.timezone,
      settings.reminderTime,
      new Date(Date.now() + 60_000),
    )
    await this.schedules.save(schedule)
  }
}
function formatLocalDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
export function nextOccurrence(timeZone: string, time: string, after: Date) {
  const [hour, minute] = time.split(':').map(Number)
  for (let i = 1; i <= 60 * 48; i++) {
    const candidate = new Date(after.getTime() + i * 60_000)
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(candidate)
    if (
      Number(parts.find((p) => p.type === 'hour')?.value) === hour &&
      Number(parts.find((p) => p.type === 'minute')?.value) === minute
    )
      return candidate
  }
  throw new Error('Unable to calculate reminder time')
}
