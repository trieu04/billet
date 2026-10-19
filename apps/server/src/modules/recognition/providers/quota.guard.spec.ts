import type { RecognitionConfig } from '../../../configs/app.config'
import { RecognitionRateLimitError } from '../interface'
import { RecognitionQuotaGuard } from './quota.guard'

function config(overrides: Partial<RecognitionConfig> = {}): RecognitionConfig {
  return {
    provider: 'google-ai-studio',
    googleAiStudioApiKeys: ['key-1', 'key-2'],
    googleAiStudioModel: 'gemini-test',
    timeoutMs: 10_000,
    requestsPerMinute: 2,
    tokensPerMinute: 100,
    requestsPerDay: 10,
    estimatedTokensPerRequest: 40,
    ...overrides,
  }
}

describe('RecognitionQuotaGuard', () => {
  it('enforces RPM before an upstream request', () => {
    const guard = new RecognitionQuotaGuard(config())
    guard.acquire(1_000_000)
    guard.acquire(1_000_001)

    expect(() => guard.acquire(1_000_002)).toThrow(RecognitionRateLimitError)
  })

  it('reconciles reservations with actual token usage and enforces TPM', () => {
    const guard = new RecognitionQuotaGuard(config({ requestsPerMinute: 10 }))
    const first = guard.acquire(1_000_000)
    guard.reconcile(first, 70)

    expect(() => guard.acquire(1_000_001)).toThrow(RecognitionRateLimitError)
  })

  it('enforces a rolling RPD window', () => {
    const guard = new RecognitionQuotaGuard(
      config({ requestsPerMinute: 10, tokensPerMinute: 1_000, requestsPerDay: 1 }),
    )
    guard.acquire(1_000_000)

    expect(() => guard.acquire(1_060_001)).toThrow(RecognitionRateLimitError)
    expect(() => guard.acquire(87_400_001)).not.toThrow()
  })
})
