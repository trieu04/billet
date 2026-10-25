export function majorToMinor(value: string, currency: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const factor = 10 ** fractionDigits(currency)
  const minor = Math.round(Number(normalized) * factor)
  return Number.isSafeInteger(minor) && minor > 0 ? String(minor) : null
}

export function minorToMajor(value: string, currency: string) {
  const factor = 10 ** fractionDigits(currency)
  return String(Number(value) / factor)
}

function fractionDigits(currency: string) {
  return (
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 0
  )
}
