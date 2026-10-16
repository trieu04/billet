export type CalendarAggregateRow = {
  month: string
  day: string
  total: string
  count: string
  thumbnail_id: string | null
  media_ids: string[] | null
}

type CalendarMonth = {
  month: string
  currency: string
  totalMinor: string
  count: number
  days: {
    date: string
    totalMinor: string
    count: number
    representativeMediaId: string | null
    mediaAssetIds: string[]
  }[]
}

export function buildCalendarHistory(
  rows: CalendarAggregateRow[],
  throughMonth: string,
  currency: string,
): CalendarMonth[] {
  const rowsByMonth = new Map<string, CalendarAggregateRow[]>()
  for (const row of rows) {
    const monthRows = rowsByMonth.get(row.month) ?? []
    monthRows.push(row)
    rowsByMonth.set(row.month, monthRows)
  }

  const firstMonth = rows[0]?.month ?? throughMonth
  return monthRange(firstMonth, throughMonth).map((month) => {
    const monthRows = rowsByMonth.get(month) ?? []
    return {
      month,
      currency,
      totalMinor: monthRows.reduce((sum, row) => sum + BigInt(row.total), 0n).toString(),
      count: monthRows.reduce((sum, row) => sum + Number(row.count), 0),
      days: monthRows.map((row) => ({
        date: row.day,
        totalMinor: row.total,
        count: Number(row.count),
        representativeMediaId: row.thumbnail_id,
        mediaAssetIds: row.media_ids ?? [],
      })),
    }
  })
}

function monthRange(fromMonth: string, throughMonth: string) {
  if (fromMonth > throughMonth) return [throughMonth]
  const [startYear, startMonth] = fromMonth.split('-').map(Number)
  const [endYear, endMonth] = throughMonth.split('-').map(Number)
  const months: string[] = []

  for (
    let index = startYear * 12 + startMonth - 1;
    index <= endYear * 12 + endMonth - 1;
    index += 1
  ) {
    const year = Math.floor(index / 12)
    const month = (index % 12) + 1
    months.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return months
}
