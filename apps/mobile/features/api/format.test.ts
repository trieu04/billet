import { describe, expect, it } from 'vitest'

import { formatMoney, localDate, localMonth, startOfLocalDay } from './format'

describe('API presentation helpers', () => {
  it('formats VND minor units without decimal places', () => {
    expect(formatMoney('58000', 'VND', 'vi-VN')).toContain('58.000')
  })

  it('creates local API date values', () => {
    const date = new Date(2026, 9, 15, 14, 30)
    expect(localMonth(date)).toBe('2026-10')
    expect(localDate(date)).toBe('2026-10-15')
    expect(startOfLocalDay(date).getHours()).toBe(0)
  })

  it('does not coerce unsafe integer amounts', () => {
    expect(formatMoney('999999999999999999', 'VND')).toBe('999999999999999999 VND')
  })
})
