const EXPONENTS: Record<string, number> = { VND: 0, JPY: 0, USD: 2, EUR: 2 }

export const CURRENCIES = ['VND', 'USD', 'EUR', 'JPY'] as const

/** Digits after the decimal point for a currency's minor unit. */
export function currencyExponent(currency: string): number {
  return EXPONENTS[currency] ?? 2
}

/** Parses what a person types ("55.000", "12,5", "1 200") into minor units; null if invalid. */
export function parseAmount(input: string, currency: string): string | null {
  const exponent = currencyExponent(currency)
  const text = input.trim().replace(/[\s_]/g, '')
  if (!/^\d[\d.,]*$/.test(text)) return null

  let whole = text
  let fraction = ''
  const separator = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','))
  if (exponent > 0 && separator >= 0) {
    const tail = text.slice(separator + 1)
    // "12,5" and "12.50" are decimals; "1.200" is a thousands group.
    if (tail.length > 0 && tail.length <= exponent) {
      whole = text.slice(0, separator)
      fraction = tail
    }
  }
  whole = whole.replace(/[.,]/g, '')
  if (!/^\d+$/.test(whole) || (fraction && !/^\d+$/.test(fraction))) return null
  const minor = BigInt(`${whole}${fraction.padEnd(exponent, '0')}`)
  return minor > 0n ? minor.toString() : null
}

/** Converts minor units into the plain number shown in an edit field. */
export function amountToInput(minor: string, currency: string): string {
  const exponent = currencyExponent(currency)
  if (exponent === 0) return minor
  const padded = minor.padStart(exponent + 1, '0')
  const whole = padded.slice(0, -exponent)
  const fraction = padded.slice(-exponent).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}

export function toMajor(minor: string | bigint, currency: string): number {
  return Number(minor) / 10 ** currencyExponent(currency)
}

export function formatMoney(minor: string | bigint, currency: string): string {
  const exponent = currencyExponent(currency)
  return toMajor(minor, currency).toLocaleString('vi-VN', {
    style: 'currency',
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  })
}

/** Short form for tight spaces: 1,2tr, 350k. Only meaningful for VND-sized numbers. */
export function formatCompactMoney(minor: string, currency: string): string {
  const value = toMajor(minor, currency)
  if (currency === 'VND') {
    if (value >= 1_000_000)
      return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`
    if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString('vi-VN')}k`
    return value.toLocaleString('vi-VN')
  }
  return value.toLocaleString('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })
}
