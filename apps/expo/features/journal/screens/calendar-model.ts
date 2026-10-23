import type { Calendar } from '../../api/types'
import { colors } from '../../ui/theme'

export type Gradient = readonly [string, string]
export type CalendarPhoto = {
  gradient: Gradient
  mediaAssetId: string | null
}
export type CalendarDayModel = {
  count?: number
  date?: string
  day?: number
  dots?: number[]
  future?: boolean
  month?: number
  photos?: CalendarPhoto[]
  totalMinor?: string
}

export const calendarGradients = [
  [colors.peachSoft, colors.lavender],
  [colors.sage, colors.butter],
  [colors.butter, colors.peachSoft],
] as const

export function buildCalendar(
  month: string,
  calendar: Calendar | null,
  today = new Date(),
): CalendarDayModel[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const leading = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7
  const dayCount = new Date(year, monthNumber, 0).getDate()
  const byDay = new Map(calendar?.days.map((day) => [Number(day.date.slice(-2)), day]) ?? [])
  const cells: CalendarDayModel[] = [
    ...Array.from({ length: leading }, () => ({})),
    ...Array.from({ length: dayCount }, (_, index) => {
      const day = index + 1
      const entry = byDay.get(day)
      const count = entry?.count ?? 0
      const level = Math.min(5, Math.max(1, count))
      const mediaAssetIds =
        entry?.mediaAssetIds ?? (entry?.representativeMediaId ? [entry.representativeMediaId] : [])
      return {
        count,
        date: `${month}-${String(day).padStart(2, '0')}`,
        day,
        dots: count ? Array.from({ length: count }, () => level) : undefined,
        future: new Date(year, monthNumber - 1, day) > today,
        month: monthNumber,
        photos: count
          ? Array.from({ length: Math.min(3, count) }, (_, photo) => ({
              gradient: calendarGradients[photo % calendarGradients.length],
              mediaAssetId: mediaAssetIds[photo] ?? null,
            }))
          : undefined,
        totalMinor: entry?.totalMinor ?? '0',
      }
    }),
  ]
  const visibleCellCount = Math.ceil(cells.length / 7) * 7
  while (cells.length < visibleCellCount) cells.push({})
  return cells
}
