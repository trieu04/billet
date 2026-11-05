import { describe, expect, it } from 'vitest'
import { fillSeries, periodFor } from './api'

describe('periodFor', () => {
  const now = new Date(2026, 10, 3, 15, 0)

  it('covers the last seven days up to the end of today', () => {
    const period = periodFor('7d', now)
    expect(period.from).toEqual(new Date(2026, 9, 28))
    expect(period.to).toEqual(new Date(2026, 10, 4))
  })

  it('starts the month view on the 1st and counts elapsed days', () => {
    const period = periodFor('month', now)
    expect(period.from).toEqual(new Date(2026, 10, 1))
    expect(period.days).toBe(3)
  })

  it('stays within the 366 day limit of the report API for twelve months', () => {
    const period = periodFor('year', new Date(2028, 2, 20))
    expect(period.granularity).toBe('month')
    expect(period.days).toBeLessThanOrEqual(366)
  })
})

describe('fillSeries', () => {
  it('adds zero days between the points that have spending', () => {
    const period = periodFor('7d', new Date(2026, 10, 3))
    const filled = fillSeries(period, [{ bucket: '2026-11-01', totalMinor: '50000', count: 2 }])
    expect(filled).toHaveLength(7)
    expect(filled.find((point) => point.bucket === '2026-11-01')).toMatchObject({
      totalMinor: 50000,
      count: 2,
    })
    expect(filled[0]).toMatchObject({ bucket: '2026-10-28', totalMinor: 0 })
  })

  it('lists twelve month buckets for the yearly view', () => {
    const filled = fillSeries(periodFor('year', new Date(2026, 10, 3)), [])
    expect(filled.map((point) => point.bucket)[0]).toBe('2025-12')
    expect(filled.at(-1)?.bucket).toBe('2026-11')
    expect(filled).toHaveLength(12)
  })
})
