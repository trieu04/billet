import { describe, expect, it } from 'vitest'

import type { Expense } from '@/features/api/types'
import { formatJournalDay, groupExpensesByDay } from './journal-model'

const expense = (id: string, occurredAt: string, amountMinor: string): Expense => ({
  id,
  amountMinor,
  occurredAt,
  currency: 'VND',
  occurredTimezone: 'Asia/Ho_Chi_Minh',
  categoryId: '1',
  mediaAssetId: null,
  recognitionJobId: null,
  caption: null,
  merchant: null,
  location: null,
  version: 1,
  createdAt: occurredAt,
  updatedAt: occurredAt,
})

describe('journal day shelves', () => {
  it('groups moments by local day and totals each shelf', () => {
    const groups = groupExpensesByDay([
      expense('3', '2026-10-20T12:00:00+07:00', '30000'),
      expense('2', '2026-10-20T08:00:00+07:00', '20000'),
      expense('1', '2026-10-19T18:00:00+07:00', '10000'),
    ])

    expect(groups.map(({ key, totalMinor }) => ({ key, totalMinor }))).toEqual([
      { key: '2026-10-20', totalMinor: '50000' },
      { key: '2026-10-19', totalMinor: '10000' },
    ])
  })

  it('uses conversational labels for recent days', () => {
    const today = new Date('2026-10-20T12:00:00+07:00')
    expect(formatJournalDay(new Date('2026-10-20T08:00:00+07:00'), today)).toBe('Hôm nay')
    expect(formatJournalDay(new Date('2026-10-19T08:00:00+07:00'), today)).toBe('Hôm qua')
  })
})
