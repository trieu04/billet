import { describe, expect, it } from 'vitest'
import { fitWithin } from './compress-image'
import { formatCost, formatLatency, formatPercent } from './format'

describe('admin formatting', () => {
  it('converts micro USD to dollars', () => {
    expect(formatCost(1_500_000)).toContain('1,5')
  })

  it('shows a dash when nothing can be computed', () => {
    expect(formatPercent(0, 0)).toBe('–')
    expect(formatLatency(null)).toBe('–')
  })
})

describe('fitWithin', () => {
  it('scales the longest edge down and keeps the ratio', () => {
    expect(fitWithin(4000, 2000, 1024)).toEqual({ width: 1024, height: 512 })
    expect(fitWithin(2000, 4000, 1024)).toEqual({ width: 512, height: 1024 })
  })

  it('never upscales', () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 })
  })
})
