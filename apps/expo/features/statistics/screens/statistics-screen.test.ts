import { describe, expect, it } from 'vitest'

import { reportRange } from './statistics-model'

describe('reportRange', () => {
  const anchor = new Date(2026, 9, 21, 14, 30)

  it('uses the current local day for Hôm nay', () => {
    const range = reportRange('Hôm nay', anchor)

    expect(new Date(range.from)).toEqual(new Date(2026, 9, 21, 0, 0, 0, 0))
    expect(new Date(range.to)).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999))
    expect(range.granularity).toBe('day')
  })

  it('keeps the existing rolling seven-day range', () => {
    const range = reportRange('Tuần', anchor)

    expect(new Date(range.from)).toEqual(new Date(2026, 9, 15, 0, 0, 0, 0))
    expect(new Date(range.to)).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999))
  })
})
