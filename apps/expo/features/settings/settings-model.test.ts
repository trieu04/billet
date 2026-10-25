import { describe, expect, it } from 'vitest'

import { majorToMinor, minorToMajor } from './settings-model'

describe('budget amount conversion', () => {
  it.each([
    ['100000', 'VND', '100000'],
    ['12.34', 'USD', '1234'],
    ['12,34', 'EUR', '1234'],
    ['500', 'JPY', '500'],
  ])('converts %s %s to minor units', (value, currency, expected) => {
    expect(majorToMinor(value, currency)).toBe(expected)
    expect(minorToMajor(expected, currency)).toBe(value.replace(',', '.'))
  })

  it.each(['', '0', '-1', '12.345', 'abc'])('rejects invalid budget %s', (value) => {
    expect(majorToMinor(value, 'VND')).toBeNull()
  })
})
