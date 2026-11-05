import { Injectable, Logger } from '@nestjs/common'
import type { InferenceStatus, InferenceUsage } from '../entities/expense-inference.entity'

export interface InferenceMetric {
  provider: string
  model: string
  /** Set for requests that are not user inferences; their cost still counts in the totals. */
  origin?: 'playground'
  status: InferenceStatus
  reason: string | null
  /** Whether the provider was called (counts as a provider request). */
  called: boolean
  /** Duration of the provider call; 0 when the provider was not called. */
  latencyMs: number
  imageBytes: number
  usage: InferenceUsage | null
}

export interface UsageTotals {
  requests: number
  inputTokens: number
  outputTokens: number
  costMicroUsd: number
  unavailable: Record<string, number>
}

interface Window {
  start: number
  totals: Map<string, UsageTotals>
}

const WINDOWS = { minute: 60_000, day: 86_400_000 } as const
type WindowName = keyof typeof WINDOWS

/**
 * Structured inference log lines plus in-process request/token totals per provider, emitted when a
 * minute or day window closes. Never receives images, amounts, place keys, or choice labels.
 */
@Injectable()
export class DecisionMetricsService {
  private readonly logger = new Logger('ExpenseInference')
  private readonly windows: Record<WindowName, Window> = {
    minute: { start: 0, totals: new Map() },
    day: { start: 0, totals: new Map() },
  }

  record(metric: InferenceMetric, now = Date.now()): void {
    this.logger.log(
      JSON.stringify({
        event: 'expense_inference',
        provider: metric.provider,
        model: metric.model,
        origin: metric.origin,
        status: metric.status,
        reason: metric.reason,
        latencyMs: metric.latencyMs,
        imageBytes: metric.imageBytes,
        inputTokens: metric.usage?.inputTokens,
        outputTokens: metric.usage?.outputTokens,
        costMicroUsd: metric.usage?.costMicroUsd,
      }),
    )
    for (const name of Object.keys(WINDOWS) as WindowName[]) this.accumulate(name, metric, now)
  }

  /** Totals of the current window, keyed by `provider/model`. */
  totals(name: WindowName, now = Date.now()): Map<string, UsageTotals> {
    this.roll(name, now)
    return this.windows[name].totals
  }

  private accumulate(name: WindowName, metric: InferenceMetric, now: number): void {
    this.roll(name, now)
    const key = `${metric.provider}/${metric.model}`
    const totals = this.windows[name].totals
    const entry = totals.get(key) ?? {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
      unavailable: {},
    }
    if (metric.called) entry.requests += 1
    entry.inputTokens += metric.usage?.inputTokens ?? 0
    entry.outputTokens += metric.usage?.outputTokens ?? 0
    entry.costMicroUsd += metric.usage?.costMicroUsd ?? 0
    if (metric.status === 'unavailable' && metric.reason)
      entry.unavailable[metric.reason] = (entry.unavailable[metric.reason] ?? 0) + 1
    totals.set(key, entry)
  }

  private roll(name: WindowName, now: number): void {
    const window = this.windows[name]
    const start = now - (now % WINDOWS[name])
    if (window.start === start) return
    for (const [key, totals] of window.totals)
      this.logger.log(
        JSON.stringify({
          event: 'expense_inference_usage',
          window: name,
          start: new Date(window.start).toISOString(),
          provider: key,
          ...totals,
        }),
      )
    window.start = start
    window.totals = new Map()
  }
}
