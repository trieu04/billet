import { startOfLocalDay } from '../../api/format'

export const statisticsPeriods = ['Hôm nay', 'Tuần', 'Tháng', 'Năm'] as const

export type StatisticsPeriod = (typeof statisticsPeriods)[number]

export function reportRange(period: StatisticsPeriod, anchor = new Date()) {
  const to = new Date(anchor)
  to.setHours(23, 59, 59, 999)
  const from = startOfLocalDay(to)
  if (period === 'Tuần') from.setDate(from.getDate() - 6)
  else if (period === 'Tháng') from.setDate(1)
  else if (period === 'Năm') from.setMonth(0, 1)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity: period === 'Năm' ? ('month' as const) : ('day' as const),
  }
}
