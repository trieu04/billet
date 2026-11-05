import { useQuery } from '@tanstack/react-query'
import { queryString, useApi } from '@/lib/api-client'
import { addDays, browserTimezone, useToday } from '@/lib/dates'
import { useScopedKey } from '@/lib/queries'

export type Report = {
  range: { from: string; to: string; timezone: string }
  currency: string
  totalMinor: string
  count: number
  comparison: { totalMinor: string; count: number; changePercent: number | null }
  series: { bucket: string; totalMinor: string; count: number }[]
  categories: {
    categoryId: string
    code: string
    name: string
    totalMinor: string
    count: number
    sharePercent: number | null
  }[]
  insights: { type: 'highest_spend_day'; date: string; amountMinor: string }[]
}

export type PeriodId = '7d' | '30d' | 'month' | 'year'

export const PERIODS: { value: PeriodId; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: '12 tháng' },
]

export type Period = {
  from: Date
  to: Date
  granularity: 'day' | 'month'
  /** Number of days covered, for per-day averages. */
  days: number
}

export function periodFor(id: PeriodId, now = new Date()): Period {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = addDays(today, 1)
  if (id === '7d') return { from: addDays(tomorrow, -7), to: tomorrow, granularity: 'day', days: 7 }
  if (id === '30d')
    return { from: addDays(tomorrow, -30), to: tomorrow, granularity: 'day', days: 30 }
  if (id === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from, to: tomorrow, granularity: 'day', days: today.getDate() }
  }
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    from,
    to,
    granularity: 'month',
    days: Math.round((to.getTime() - from.getTime()) / 86_400_000),
  }
}

export function useReport(id: PeriodId, currency: string | undefined) {
  const api = useApi()
  const key = useScopedKey()
  const today = useToday().toDateString()
  return useQuery({
    queryKey: key('report', id, currency, today),
    enabled: Boolean(currency),
    queryFn: () => {
      const period = periodFor(id)
      return api<Report>(
        `/reports/spending${queryString({
          from: period.from.toISOString(),
          to: period.to.toISOString(),
          currency,
          timezone: browserTimezone(),
          granularity: period.granularity,
        })}`,
      )
    },
  })
}

/** Every bucket in the period, with zeros where nothing was spent, so the chart has no gaps. */
export function fillSeries(
  period: Period,
  series: Report['series'],
): { bucket: string; totalMinor: number; count: number }[] {
  const known = new Map(series.map((point) => [point.bucket, point]))
  const pad = (value: number) => String(value).padStart(2, '0')
  const buckets: string[] = []
  if (period.granularity === 'day') {
    for (let day = period.from; day < period.to; day = addDays(day, 1))
      buckets.push(`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`)
  } else {
    for (
      let at = period.from;
      at < period.to;
      at = new Date(at.getFullYear(), at.getMonth() + 1, 1)
    )
      buckets.push(`${at.getFullYear()}-${pad(at.getMonth() + 1)}`)
  }
  return buckets.map((bucket) => ({
    bucket,
    totalMinor: Number(known.get(bucket)?.totalMinor ?? 0),
    count: known.get(bucket)?.count ?? 0,
  }))
}
