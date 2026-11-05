import { describe, expect, it } from 'vitest'
import { amountToInput, formatCompactMoney, formatMoney, parseAmount } from './money'

describe('parseAmount', () => {
  it('reads whole-unit currencies with thousands separators', () => {
    expect(parseAmount('55000', 'VND')).toBe('55000')
    expect(parseAmount('55.000', 'VND')).toBe('55000')
    expect(parseAmount('1,250,000', 'VND')).toBe('1250000')
    expect(parseAmount('1 200 000', 'VND')).toBe('1200000')
  })

  it('distinguishes decimals from thousands groups for two-decimal currencies', () => {
    expect(parseAmount('12,5', 'USD')).toBe('1250')
    expect(parseAmount('12.50', 'USD')).toBe('1250')
    expect(parseAmount('1.200', 'USD')).toBe('120000')
    expect(parseAmount('1,234.56', 'USD')).toBe('123456')
    expect(parseAmount('7', 'EUR')).toBe('700')
  })

  it('rejects empty, zero, negative, and non-numeric input', () => {
    for (const value of ['', '0', '0,00', '-5', 'abc', '12a'])
      expect(parseAmount(value, 'USD')).toBeNull()
  })
})

describe('amount formatting', () => {
  it('round-trips minor units through the edit field', () => {
    expect(amountToInput('1250', 'USD')).toBe('12.5')
    expect(amountToInput('5', 'USD')).toBe('0.05')
    expect(amountToInput('55000', 'VND')).toBe('55000')
    expect(parseAmount(amountToInput('1250', 'USD'), 'USD')).toBe('1250')
  })

  it('formats money for display', () => {
    expect(formatMoney('55000', 'VND')).toMatch(/^55\.000\s?₫$/)
    expect(formatMoney('1250', 'USD')).toContain('12,50')
  })

  it('abbreviates large VND values', () => {
    expect(formatCompactMoney('350000', 'VND')).toBe('350k')
    expect(formatCompactMoney('1200000', 'VND')).toBe('1,2tr')
  })
})
