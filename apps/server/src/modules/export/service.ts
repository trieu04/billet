import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { randomBytes } from 'node:crypto'
import { DataSource, Repository } from 'typeorm'
import { OBJECT_STORAGE, type ObjectStorage } from '../../common/storage/interface'
import { JobStatus } from '../recognition/entities/recognition-job.entity'
import type { CreateExportDto } from './dto'
import { ExportJobEntity } from './entities/export-job.entity'
@Injectable()
export class ExportService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout
  constructor(
    @InjectRepository(ExportJobEntity) private readonly jobs: Repository<ExportJobEntity>,
    private readonly db: DataSource,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.processNext().catch(() => undefined), 5000)
    this.timer.unref()
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }
  async create(userId: string, input: CreateExportDto) {
    const from = input.from ? new Date(input.from) : null,
      to = input.to ? new Date(input.to) : null
    if (from && to && from >= to) throw new BadRequestException('Export range is invalid')
    if (from && to && to.getTime() - from.getTime() > 366 * 86400000)
      throw new BadRequestException('Export range cannot exceed 366 days')
    return this.response(
      await this.jobs.save(
        this.jobs.create({
          userId,
          status: JobStatus.Pending,
          from,
          to,
          currency: input.currency ?? null,
          snapshotAt: null,
          storageKey: null,
          downloadExpiresAt: null,
          attempts: 0,
          availableAt: new Date(),
          leaseExpiresAt: null,
          failureReason: null,
        }),
      ),
    )
  }
  async get(userId: string, id: string) {
    return this.response(await this.owned(userId, id))
  }
  async list(userId: string, limit: number) {
    const jobs = await this.jobs.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    })
    return jobs.map((job) => this.response(job))
  }
  async download(userId: string, id: string) {
    const job = await this.jobs
      .createQueryBuilder('j')
      .addSelect('j.storageKey')
      .where('j.id=:id AND j.userId=:userId', { id, userId })
      .getOne()
    if (!job) throw new NotFoundException('Export not found')
    if (
      job.status !== JobStatus.Succeeded ||
      !job.storageKey ||
      !job.downloadExpiresAt ||
      job.downloadExpiresAt < new Date()
    )
      throw new BadRequestException('Export is not available for download')
    return this.storage.open(`exports/${job.storageKey}`)
  }
  async processNext() {
    const job = await this.jobs
      .createQueryBuilder('j')
      .addSelect('j.storageKey')
      .where(
        '(j.status=:pending AND j.availableAt <= now()) OR (j.status=:processing AND j.leaseExpiresAt < now())',
        { pending: JobStatus.Pending, processing: JobStatus.Processing },
      )
      .orderBy('j.id', 'ASC')
      .getOne()
    if (!job) return
    job.status = JobStatus.Processing
    job.attempts += 1
    job.leaseExpiresAt = new Date(Date.now() + 5 * 60_000)
    await this.jobs.save(job)
    try {
      const snapshot = new Date()
      const params: unknown[] = [job.userId, snapshot]
      let where = 'e.user_id=$1 AND e.deleted_at IS NULL AND e.updated_at <= $2'
      if (job.from) {
        params.push(job.from)
        where += ` AND e.occurred_at >= $${params.length}`
      }
      if (job.to) {
        params.push(job.to)
        where += ` AND e.occurred_at < $${params.length}`
      }
      if (job.currency) {
        params.push(job.currency)
        where += ` AND e.currency = $${params.length}`
      }
      const rows = await this.db.query<Record<string, string | null>[]>(
        `SELECT e.occurred_at::text,e.amount_minor::text,e.currency,e.caption,c.name category,e.merchant,e.location FROM expenses e JOIN categories c ON c.id=e.category_id WHERE ${where} ORDER BY e.occurred_at,e.id`,
        params,
      )
      const header = [
        'occurred_at',
        'amount_minor',
        'currency',
        'caption',
        'category',
        'merchant',
        'location',
      ]
      const csv =
        [
          header.join(','),
          ...rows.map((r) =>
            [
              r.occurred_at,
              r.amount_minor,
              r.currency,
              r.caption,
              r.category,
              r.merchant,
              r.location,
            ]
              .map(csvCell)
              .join(','),
          ),
        ].join('\r\n') + '\r\n'
      const key = `${job.userId}/${randomBytes(24).toString('hex')}.csv`
      await this.storage.put(`exports/${key}`, Buffer.from(csv))
      job.status = JobStatus.Succeeded
      job.snapshotAt = snapshot
      job.storageKey = key
      job.downloadExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      job.leaseExpiresAt = null
      job.failureReason = null
    } catch (error: unknown) {
      job.status = JobStatus.Failed
      job.failureReason = error instanceof Error ? error.message.slice(0, 500) : 'Export failed'
      job.leaseExpiresAt = null
    }
    await this.jobs.save(job)
  }
  private async owned(userId: string, id: string) {
    const job = await this.jobs.findOneBy({ id, userId })
    if (!job) throw new NotFoundException('Export not found')
    return job
  }
  private response(j: ExportJobEntity) {
    return {
      id: j.id,
      status: j.status,
      from: j.from?.toISOString() ?? null,
      to: j.to?.toISOString() ?? null,
      currency: j.currency,
      snapshotAt: j.snapshotAt?.toISOString() ?? null,
      downloadExpiresAt: j.downloadExpiresAt?.toISOString() ?? null,
      failureReason: j.failureReason,
      createdAt: j.createdAt.toISOString(),
    }
  }
}
export function csvCell(value: string | null | undefined) {
  let text = value ?? ''
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
