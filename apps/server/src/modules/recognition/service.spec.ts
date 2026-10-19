import type { Repository } from 'typeorm'
import type { RecognitionConfig } from '../../configs/app.config'
import type { MediaService } from '../media/service'
import {
  JobStatus,
  RecognitionJobEntity,
  type RecognitionSuggestion,
} from './entities/recognition-job.entity'
import { RecognitionService } from './service'

describe('RecognitionService', () => {
  afterEach(() => jest.useRealTimers())

  it('does not reclaim a job while a request longer than 60 seconds is still running', async () => {
    jest.useFakeTimers()
    const job: RecognitionJobEntity = Object.assign(new RecognitionJobEntity(), {
      id: '1',
      userId: '2',
      mediaAssetId: '3',
      status: JobStatus.Pending,
      attempts: 0,
      maxAttempts: 3,
      availableAt: new Date(),
      leaseExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const query = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () =>
        (job.status === JobStatus.Pending && job.availableAt.getTime() <= Date.now()) ||
        (job.status === JobStatus.Processing &&
          job.leaseExpiresAt !== null &&
          job.leaseExpiresAt.getTime() < Date.now())
          ? job
          : null,
      ),
    }
    const jobs = {
      createQueryBuilder: jest.fn(() => query),
      save: jest.fn(async (value: RecognitionJobEntity) => value),
    } as unknown as Repository<RecognitionJobEntity>
    const provider = {
      name: 'google-ai-studio',
      recognize: jest.fn(
        () =>
          new Promise<RecognitionSuggestion>((resolve) => {
            setTimeout(() => resolve({ confidence: {} }), 90_000)
          }),
      ),
    }
    const service = new RecognitionService(jobs, {} as MediaService, provider, {
      timeoutMs: 120_000,
    } as RecognitionConfig)

    const processing = service.processNext()
    await jest.advanceTimersByTimeAsync(65_000)
    expect(await service.processNext()).toBeNull()
    expect(provider.recognize).toHaveBeenCalledTimes(1)

    await jest.advanceTimersByTimeAsync(25_000)
    expect(await processing).toEqual(expect.objectContaining({ status: JobStatus.Succeeded }))
  })
})
