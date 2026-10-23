export function formatMoney(amountMinor: string, currency = 'VND', locale = 'vi-VN') {
  const amount = Number(amountMinor)
  if (!Number.isSafeInteger(amount)) return `${amountMinor} ${currency}`
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount)
  return currency === 'VND' ? formatted.replace(/\s*₫/, '₫') : formatted
}

export function localMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function localDate(date = new Date()) {
  return `${localMonth(date)}-${String(date.getDate()).padStart(2, '0')}`
}

export function startOfLocalDay(date = new Date()) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}
