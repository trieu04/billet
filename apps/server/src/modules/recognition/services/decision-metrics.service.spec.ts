import { Logger } from '@nestjs/common'
import { DecisionMetricsService } from './decision-metrics.service'

describe('DecisionMetricsService', () => {
  it('totals requests, tokens, and unavailable reasons per provider and window', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    const metrics = new DecisionMetricsService()
    const base = { provider: 'fake', model: 'm', latencyMs: 10, imageBytes: 1_000 }
    const minute = Date.parse('2026-10-31T10:00:00Z')

    metrics.record(
      { ...base, status: 'succeeded', reason: null, called: true, usage: { inputTokens: 100 } },
      minute,
    )
    metrics.record(
      { ...base, status: 'unavailable', reason: 'timeout', called: true, usage: null },
      minute + 1_000,
    )
    metrics.record(
      { ...base, status: 'disabled', reason: 'suggestions_disabled', called: false, usage: null },
      minute + 2_000,
    )

    expect(metrics.totals('minute', minute + 3_000).get('fake/m')).toEqual({
      requests: 2,
      inputTokens: 100,
      outputTokens: 0,
      costMicroUsd: 0,
      unavailable: { timeout: 1 },
    })
    // A new minute starts empty and the closed window is logged; the day keeps accumulating.
    expect(metrics.totals('minute', minute + 61_000).size).toBe(0)
    expect(metrics.totals('day', minute + 61_000).get('fake/m')?.requests).toBe(2)
    const lines = log.mock.calls.map(([line]) => String(line))
    expect(lines.some((line) => line.includes('"window":"minute"'))).toBe(true)
    // Never logs image bytes, amounts, place keys, or labels.
    expect(lines.every((line) => !line.includes('placeKey') && !line.includes('label'))).toBe(true)
    log.mockRestore()
  })
})
