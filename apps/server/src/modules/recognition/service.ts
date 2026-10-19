import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MediaService } from '../media/service'
import { recognitionConfig, type RecognitionConfig } from '../../configs/app.config'
import { JobStatus, RecognitionJobEntity } from './entities/recognition-job.entity'
import {
  RecognitionRateLimitError,
  RECOGNITION_PROVIDER,
  type RecognitionProvider,
} from './interface'
@Injectable()
export class RecognitionService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout
  constructor(
    @InjectRepository(RecognitionJobEntity) private readonly jobs: Repository<RecognitionJobEntity>,
    private readonly media: MediaService,
    @Inject(RECOGNITION_PROVIDER) private readonly provider: RecognitionProvider,
    @Inject(recognitionConfig.KEY) private readonly config: RecognitionConfig,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.processNext().catch(() => undefined), 5_000)
    this.timer.unref()
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }
  async create(userId: string, mediaAssetId: string) {
    await this.media.assertReady(userId, mediaAssetId)
    return this.response(
      await this.jobs.save(
        this.jobs.create({
          userId,
          mediaAssetId,
          status: JobStatus.Pending,
          provider: this.provider.name,
          suggestion: null,
          attempts: 0,
          maxAttempts: 3,
          availableAt: new Date(),
          leaseExpiresAt: null,
          failureReason: null,
        }),
      ),
    )
  }
  async get(userId: string, id: string) {
    const job = await this.jobs.findOneBy({ id, userId })
    if (!job) throw new NotFoundException('Recognition job not found')
    return this.response(job)
  }
  async assertAccepted(userId: string, id: string, mediaAssetId?: string) {
    const job = await this.jobs.findOneBy({ id, userId })
    if (!job) throw new NotFoundException('Recognition job not found')
    if (job.status !== JobStatus.Succeeded)
      throw new BadRequestException('Recognition job has not succeeded')
    if (mediaAssetId && job.mediaAssetId !== mediaAssetId)
      throw new BadRequestException('Recognition job does not belong to the selected media')
    return job
  }
  async processNext() {
    const job = await this.jobs
      .createQueryBuilder('j')
      .where(
        '(j.status = :pending AND j.availableAt <= now()) OR (j.status = :processing AND j.leaseExpiresAt < now())',
        { pending: JobStatus.Pending, processing: JobStatus.Processing },
      )
      .orderBy('j.id', 'ASC')
      .getOne()
    if (!job) return null
    job.attempts += 1
    job.status = JobStatus.Processing
    // Keep the lease beyond the upstream timeout, with time for media I/O and persistence.
    job.leaseExpiresAt = new Date(Date.now() + this.config.timeoutMs + 60_000)
    await this.jobs.save(job)
    try {
      job.suggestion = await this.provider.recognize(job.userId, job.mediaAssetId)
      job.status = JobStatus.Succeeded
      job.failureReason = null
    } catch (error: unknown) {
      if (error instanceof RecognitionRateLimitError) {
        job.attempts -= 1
        job.status = JobStatus.Pending
        job.availableAt = new Date(Date.now() + error.retryAfterMs)
        job.failureReason = null
        job.leaseExpiresAt = null
        return this.response(await this.jobs.save(job))
      }
      job.status = job.attempts >= job.maxAttempts ? JobStatus.Failed : JobStatus.Pending
      job.availableAt = new Date(Date.now() + 2 ** job.attempts * 5_000)
      job.failureReason =
        error instanceof Error ? error.message.slice(0, 500) : 'Recognition failed'
    }
    job.leaseExpiresAt = null
    return this.response(await this.jobs.save(job))
  }
  private response(j: RecognitionJobEntity) {
    return {
      id: j.id,
      mediaAssetId: j.mediaAssetId,
      status: j.status,
      provider: j.provider,
      suggestion: j.suggestion,
      attempts: j.attempts,
      failureReason: j.failureReason,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }
  }
}
