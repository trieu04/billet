import { buildCalendarHistory } from './calendar'

describe('buildCalendarHistory', () => {
  it('fills empty months through the requested current month', () => {
    const result = buildCalendarHistory(
      [
        {
          month: '2026-08',
          day: '2026-08-31',
          total: '12000',
          count: '1',
          thumbnail_id: null,
          media_ids: null,
        },
        {
          month: '2026-10',
          day: '2026-10-02',
          total: '24000',
          count: '2',
          thumbnail_id: '9',
          media_ids: ['9', '10'],
        },
      ],
      '2026-10',
      'VND',
    )

    expect(result).toEqual([
      expect.objectContaining({ month: '2026-08', totalMinor: '12000', count: 1 }),
      expect.objectContaining({ month: '2026-09', totalMinor: '0', count: 0, days: [] }),
      expect.objectContaining({ month: '2026-10', totalMinor: '24000', count: 2 }),
    ])
    expect(result[2]?.days[0]).toMatchObject({
      representativeMediaId: '9',
      mediaAssetIds: ['9', '10'],
    })
  })

  it('returns only the requested month when there are no expenses', () => {
    expect(buildCalendarHistory([], '2026-10', 'VND')).toEqual([
      { month: '2026-10', currency: 'VND', totalMinor: '0', count: 0, days: [] },
    ])
  })
})
