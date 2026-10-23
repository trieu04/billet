import type { Expense } from '@/features/api/types'

export type JournalDay = {
  date: Date
  expenses: Expense[]
  key: string
  totalMinor: string
}

function localDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function groupExpensesByDay(expenses: Expense[]): JournalDay[] {
  const groups = new Map<string, JournalDay>()
  for (const expense of expenses) {
    const key = localDayKey(expense.occurredAt)
    const current = groups.get(key)
    if (current) {
      current.expenses.push(expense)
      current.totalMinor = (BigInt(current.totalMinor) + BigInt(expense.amountMinor)).toString()
    } else {
      groups.set(key, {
        date: new Date(expense.occurredAt),
        expenses: [expense],
        key,
        totalMinor: expense.amountMinor,
      })
    }
  }
  return [...groups.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function formatJournalDay(date: Date, today = new Date()) {
  if (localDayKey(date) === localDayKey(today)) return 'Hôm nay'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (localDayKey(date) === localDayKey(yesterday)) return 'Hôm qua'
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })
    .format(date)
    .replace(/^./, (letter) => letter.toUpperCase())
}
