import { describe, expect, it, vi } from 'vitest'

import type { Expense, ExpenseList } from '@/features/api/types'
import { loadAllJournalPages } from './journal-pages'

const expense = (id: string): Expense => ({
  id,
  amountMinor: '1000',
  currency: 'VND',
  occurredAt: '2026-10-20T08:00:00+07:00',
  occurredTimezone: 'Asia/Ho_Chi_Minh',
  categoryId: '1',
  mediaAssetId: null,
  recognitionJobId: null,
  caption: null,
  merchant: null,
  location: null,
  version: 1,
  createdAt: '2026-10-20T08:00:00+07:00',
  updatedAt: '2026-10-20T08:00:00+07:00',
})

describe('journal pagination', () => {
  it('loads every cursor and keeps the complete-query totals from the first page', async () => {
    const pages: Record<string, ExpenseList> = {
      first: {
        data: [expense('3'), expense('2')],
        nextCursor: 'page-2',
        totals: [{ currency: 'VND', totalMinor: '3000', count: 3 }],
      },
      'page-2': {
        data: [expense('1')],
        nextCursor: null,
        totals: [{ currency: 'VND', totalMinor: '3000', count: 3 }],
      },
    }
    const loadPage = vi.fn((cursor: string | null) =>
      Promise.resolve(pages[cursor ?? 'first'] as ExpenseList),
    )

    await expect(loadAllJournalPages(loadPage)).resolves.toEqual({
      data: [expense('3'), expense('2'), expense('1')],
      nextCursor: null,
      totals: [{ currency: 'VND', totalMinor: '3000', count: 3 }],
    })
    expect(loadPage).toHaveBeenCalledTimes(2)
    expect(loadPage).toHaveBeenNthCalledWith(1, null)
    expect(loadPage).toHaveBeenNthCalledWith(2, 'page-2')
  })

  it('rejects a repeated cursor instead of looping forever', async () => {
    const loadPage = vi.fn().mockResolvedValue({
      data: [],
      nextCursor: 'same-cursor',
      totals: [],
    })

    await expect(loadAllJournalPages(loadPage)).rejects.toThrow('repeated cursor')
    expect(loadPage).toHaveBeenCalledTimes(2)
  })
})
