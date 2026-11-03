import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { DAY_MS, INFERENCE_RETENTION_DAYS } from '../constants'
import { InferenceService } from './inference.service'
import { LearnerService } from './learner.service'

const FIRST_RUN_DELAY_MS = 60_000

/**
 * Daily retention job: removes inference records older than 90 days and expired suppression
 * markers of deleted rules. Idempotent, so running on several instances is harmless.
 */
@Injectable()
export class InferenceCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InferenceCleanupService.name)
  private timers: NodeJS.Timeout[] = []

  constructor(
    private readonly inferences: InferenceService,
    private readonly learner: LearnerService,
  ) {}

  onModuleInit(): void {
    const run = () => void this.run().catch(() => undefined)
    const first = setTimeout(run, FIRST_RUN_DELAY_MS)
    const daily = setInterval(run, DAY_MS)
    first.unref()
    daily.unref()
    this.timers = [first, daily]
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) clearTimeout(timer)
  }

  async run(now = new Date()): Promise<number> {
    const removed = await this.inferences.deleteOlderThan(
      new Date(now.getTime() - INFERENCE_RETENTION_DAYS * DAY_MS),
    )
    await this.learner.purgeExpiredSuppressions(now)
    if (removed > 0)
      this.logger.log(JSON.stringify({ event: 'expense_inference_cleanup', removed }))
    return removed
  }
}
