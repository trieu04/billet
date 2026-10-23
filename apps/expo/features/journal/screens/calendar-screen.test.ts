import { describe, expect, it } from 'vitest'

import type { Calendar } from '@/features/api/types'
import { buildCalendar } from './calendar-model'

const october: Calendar = {
  month: '2026-10',
  currency: 'VND',
  totalMinor: '24000',
  count: 1,
  days: [
    {
      date: '2026-10-02',
      totalMinor: '24000',
      count: 1,
      representativeMediaId: null,
      mediaAssetIds: [],
    },
  ],
}

describe('buildCalendar', () => {
  it('uses only the five calendar rows October 2026 needs', () => {
    expect(buildCalendar('2026-10', october, new Date(2026, 9, 17))).toHaveLength(35)
  })

  it('keeps zero-expense dates as real interactive day models', () => {
    const emptyDay = buildCalendar('2026-10', october, new Date(2026, 9, 17)).find(
      (day) => day.date === '2026-10-01',
    )
    expect(emptyDay).toMatchObject({ day: 1, count: 0, totalMinor: '0' })
  })

  it('marks future dates so the UI can render them as muted cells', () => {
    const days = buildCalendar('2026-10', october, new Date(2026, 9, 17))
    expect(days.find((day) => day.date === '2026-10-18')).toMatchObject({ future: true })
  })

  it('keeps one spending dot per expense while limiting the visible photo stack to three', () => {
    const busyDayCalendar: Calendar = {
      ...october,
      count: 5,
      days: [
        {
          ...october.days[0],
          count: 5,
          representativeMediaId: '13',
          mediaAssetIds: ['13', '12', '11'],
        },
      ],
    }
    const busyDay = buildCalendar('2026-10', busyDayCalendar, new Date(2026, 9, 17)).find(
      (day) => day.date === '2026-10-02',
    )

    expect(busyDay?.dots).toHaveLength(5)
    expect(busyDay?.photos).toHaveLength(3)
    expect(busyDay?.photos?.map((photo) => photo.mediaAssetId)).toEqual(['13', '12', '11'])
  })
})
