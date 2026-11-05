import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryString, useApi } from '@/lib/api-client'
import { browserTimezone } from '@/lib/dates'
import { useScopedKey } from '@/lib/queries'

export type Expense = {
  id: string
  amountMinor: string
  currency: string
  occurredAt: string
  occurredTimezone: string
  categoryId: string
  mediaAssetId: string | null
  caption: string | null
  merchant: string | null
  location: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type CurrencyTotal = { currency: string; totalMinor: string; count: number }
export type ExpensePage = { data: Expense[]; nextCursor: string | null; totals: CurrencyTotal[] }

export type CalendarDay = {
  date: string
  totalMinor: string
  count: number
  representativeMediaId: string | null
  mediaAssetIds: string[]
}
export type CalendarMonth = {
  month: string
  currency: string
  totalMinor: string
  count: number
  days: CalendarDay[]
}

export function useExpenseList(range: { from: string; to: string }) {
  const api = useApi()
  const key = useScopedKey()
  return useInfiniteQuery({
    queryKey: key('expenses', 'list', range),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: ExpensePage) => page.nextCursor ?? undefined,
    queryFn: ({ pageParam }) =>
      api<ExpensePage>(`/expenses${queryString({ ...range, limit: 50, cursor: pageParam })}`),
  })
}

export function useCalendarMonth(month: string, currency: string | undefined) {
  const api = useApi()
  const key = useScopedKey()
  return useQuery({
    queryKey: key('calendar', month, currency),
    enabled: Boolean(currency),
    queryFn: () =>
      api<CalendarMonth>(
        `/expenses/calendar${queryString({ month, currency, timezone: browserTimezone() })}`,
      ),
  })
}

export function useExpense(id: string | undefined) {
  const api = useApi()
  const key = useScopedKey()
  return useQuery({
    queryKey: key('expenses', 'one', id),
    enabled: Boolean(id),
    queryFn: () => api<Expense>(`/expenses/${id}`),
  })
}
