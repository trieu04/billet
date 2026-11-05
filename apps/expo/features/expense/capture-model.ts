import type { Category, Expense, ExpenseList } from '@/features/api/types'

export type SavedCapture = { expense: Expense; imageUri?: string }
export type PhotoBounds = { x: number; y: number; width: number; height: number }

export function parseCaptureAmount(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const normalized = trimmed.replace(/^0+/, '')
  return normalized || null
}

const MAX_AMOUNT_DIGITS = 15

/** Digits of what was typed into the amount field, which shows them grouped. */
export function amountDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS)
}

/** Groups amount digits the way the journal shows money: `1250000` → `1.250.000`. */
export function formatAmountInput(digits: string): string {
  return amountDigits(digits).replace(/\B(?=(\d{3})+$)/g, '.')
}

/** Longest typed amount that still reads as shorthand for thousands, like `12` for 12.000. */
const MAX_SHORTHAND_DIGITS = 3

/**
 * Amounts to offer while typing: what the receipt says first, then the typed digits read as
 * thousands (`12` → `12000`, `120000`). Never offers what is already typed.
 */
export function amountSuggestionValues(typed: string, machineValues: readonly string[]): string[] {
  const digits = amountDigits(typed)
  const shorthand =
    /^[1-9]/.test(digits) && digits.length <= MAX_SHORTHAND_DIGITS
      ? [`${digits}000`, `${digits}0000`]
      : []
  return [...new Set([...machineValues, ...shorthand])].filter((value) => value !== digits)
}

type PlaceAddress = {
  name?: string | null
  street?: string | null
  district?: string | null
  subregion?: string | null
  city?: string | null
  region?: string | null
}

/** Short place text from a reverse-geocoded address, without parts that repeat one another. */
export function formatPlaceLabel(address: PlaceAddress): string {
  const parts: string[] = []
  const candidates = [
    address.name,
    address.street,
    address.district ?? address.subregion,
    address.city ?? address.region,
  ]
  for (const candidate of candidates) {
    const part = candidate?.trim()
    if (!part) continue
    if (parts.some((kept) => kept.toLowerCase().includes(part.toLowerCase()))) continue
    parts.push(part)
  }
  return parts.join(', ').slice(0, 240)
}

const REVEAL_MARGIN = 8

/** Scroll position that brings a block into view, or `null` when it is already visible. */
export function nextScrollOffset({
  top,
  bottom,
  viewport,
  offset,
}: {
  top: number
  bottom: number
  viewport: number
  offset: number
}): number | null {
  // The inputs sit at the end of a block, so one taller than the viewport shows its end.
  if (bottom - top + REVEAL_MARGIN * 2 > viewport) return bottom - viewport + REVEAL_MARGIN
  if (top < offset) return Math.max(0, top - REVEAL_MARGIN)
  if (bottom > offset + viewport) return bottom - viewport + REVEAL_MARGIN
  return null
}

/** Generation of the suggestion session passed as a route param; `undefined` when absent. */
export function parseSuggestionGeneration(
  value: string | string[] | undefined,
): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined
  return Number(raw)
}

export function findCategoryIdByCode(
  categories: Category[] | null | undefined,
  code: string | undefined,
): string | undefined {
  if (!code) return undefined
  return categories?.find((category) => category.code === code)?.id
}

export function reconcileSavedCaptures(
  captures: SavedCapture[],
  expenses: Expense[],
): SavedCapture[] {
  const serverIds = new Set(expenses.map((expense) => expense.id))
  return captures.filter((capture) => !serverIds.has(capture.expense.id))
}

export function removeSavedCapture(captures: SavedCapture[], id: string): SavedCapture[] {
  return captures.filter((capture) => capture.expense.id !== id)
}

// Keep confirmed saves visible while the journal request catches up, without counting twice.
export function mergeSavedCaptures(
  journal: ExpenseList | null,
  captures: SavedCapture[],
  dayStart: Date,
): ExpenseList {
  const result: ExpenseList = {
    data: [...(journal?.data ?? [])],
    totals: (journal?.totals ?? []).map((total) => ({ ...total })),
    nextCursor: journal?.nextCursor ?? null,
  }
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  for (const { expense } of captures) {
    const occurredAt = new Date(expense.occurredAt)
    if (occurredAt < dayStart || occurredAt >= dayEnd) continue
    if (result.data.some((item) => item.id === expense.id)) continue
    result.data.push(expense)
    const total = result.totals.find((item) => item.currency === expense.currency)
    if (total) {
      total.count += 1
      total.totalMinor = (BigInt(total.totalMinor) + BigInt(expense.amountMinor)).toString()
    } else {
      result.totals.push({ currency: expense.currency, totalMinor: expense.amountMinor, count: 1 })
    }
  }
  result.data.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
  return result
}

/** An instant as the `DD/MM/YYYY HH:mm` text of the time field, in local time. */
export function formatDateTimeInput(value: string): string {
  const date = new Date(value)
  const part = (number: number) => String(number).padStart(2, '0')
  return `${part(date.getDate())}/${part(date.getMonth() + 1)}/${date.getFullYear()} ${part(date.getHours())}:${part(date.getMinutes())}`
}

/** The instant typed in the time field; `null` when it is not a real date and time. */
export function parseDateTimeInput(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [day, month, year, hour, minute] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day, hour, minute)
  const real =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  return real ? date.toISOString() : null
}
