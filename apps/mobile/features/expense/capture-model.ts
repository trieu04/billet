import type { Expense, ExpenseList } from '@/features/api/types'

export type SavedCapture = { expense: Expense; imageUri?: string }
export type PhotoBounds = { x: number; y: number; width: number; height: number }

export function parseCaptureAmount(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const normalized = trimmed.replace(/^0+/, '')
  return normalized || null
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
