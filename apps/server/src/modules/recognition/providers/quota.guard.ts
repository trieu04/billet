import { Inject, Injectable } from '@nestjs/common'
import { recognitionConfig, type RecognitionConfig } from '../../../configs/app.config'
import { RecognitionRateLimitError } from '../interface'

interface QuotaEntry {
  at: number
  tokens: number
}

@Injectable()
export class RecognitionQuotaGuard {
  private readonly entries: QuotaEntry[] = []

  constructor(@Inject(recognitionConfig.KEY) private readonly config: RecognitionConfig) {}

  acquire(now = Date.now()): QuotaEntry {
    this.prune(now)
    const minuteEntries = this.entries.filter((entry) => entry.at > now - 60_000)
    const minuteTokens = minuteEntries.reduce((total, entry) => total + entry.tokens, 0)
    const retryAt: number[] = []

    if (minuteEntries.length >= this.config.requestsPerMinute) {
      retryAt.push(minuteEntries[0].at + 60_000)
    }
    if (minuteTokens + this.config.estimatedTokensPerRequest > this.config.tokensPerMinute) {
      let tokensToExpire =
        minuteTokens + this.config.estimatedTokensPerRequest - this.config.tokensPerMinute
      for (const entry of minuteEntries) {
        tokensToExpire -= entry.tokens
        if (tokensToExpire <= 0) {
          retryAt.push(entry.at + 60_000)
          break
        }
      }
    }
    if (this.entries.length >= this.config.requestsPerDay) {
      retryAt.push(this.entries[0].at + 86_400_000)
    }
    if (retryAt.length > 0) {
      throw new RecognitionRateLimitError(Math.max(1_000, Math.max(...retryAt) - now))
    }

    const reservation = { at: now, tokens: this.config.estimatedTokensPerRequest }
    this.entries.push(reservation)
    return reservation
  }

  reconcile(reservation: QuotaEntry, actualTokens: number | undefined): void {
    if (actualTokens !== undefined && Number.isSafeInteger(actualTokens) && actualTokens >= 0) {
      reservation.tokens = actualTokens
    }
  }

  private prune(now: number): void {
    while (this.entries[0]?.at <= now - 86_400_000) this.entries.shift()
  }
}
