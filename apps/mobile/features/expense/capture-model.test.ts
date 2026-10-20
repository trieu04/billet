import { describe, expect, it } from 'vitest'
import type { Expense, ExpenseList } from '../api/types'
import {
  mergeSavedCaptures,
  parseCaptureAmount,
  reconcileSavedCaptures,
  removeSavedCapture,
} from './capture-model'

const day = new Date('2026-10-20T00:00:00+07:00')
const expense: Expense = {
  id: '1',
  amountMinor: '58000',
  currency: 'VND',
  occurredAt: '2026-10-20T08:42:00+07:00',
  occurredTimezone: 'Asia/Ho_Chi_Minh',
  categoryId: '1',
  mediaAssetId: '10',
  recognitionJobId: null,
  caption: null,
  merchant: null,
  location: null,
  version: 1,
  createdAt: '2026-10-20T08:42:00+07:00',
  updatedAt: '2026-10-20T08:42:00+07:00',
}

describe('capture amount', () => {
  it('normalizes leading zeros without changing precision', () => {
    expect(parseCaptureAmount(' 00058000 ')).toBe('58000')
    expect(parseCaptureAmount('9007199254740993')).toBe('9007199254740993')
  })
  it.each(['', '0', '000', '-100', '1.5', 'abc', '1e3'])('rejects invalid input %s', (value) => {
    expect(parseCaptureAmount(value)).toBeNull()
  })
})

describe('capture → journal reconciliation', () => {
  it('inserts a confirmed save and updates totals before the journal response arrives', () => {
    const merged = mergeSavedCaptures(null, [{ expense }], day)
    expect(merged.data).toEqual([expense])
    expect(merged.totals).toEqual([{ currency: 'VND', totalMinor: '58000', count: 1 }])
  })
  it('does not duplicate a save already returned by the API or mutate server data', () => {
    const journal: ExpenseList = {
      data: [expense],
      totals: [{ currency: 'VND', totalMinor: '58000', count: 1 }],
      nextCursor: null,
    }
    expect(mergeSavedCaptures(journal, [{ expense }, { expense }], day)).toEqual(journal)
    expect(journal.totals[0]?.count).toBe(1)
  })
  it('keeps new expenses first and currency totals separate using exact arithmetic', () => {
    const older = {
      ...expense,
      id: '2',
      amountMinor: '9007199254740993',
      occurredAt: '2026-10-20T07:00:00+07:00',
    }
    const usd = { ...expense, id: '3', currency: 'USD', amountMinor: '1250' }
    const merged = mergeSavedCaptures(
      null,
      [{ expense: older }, { expense }, { expense: usd }],
      day,
    )
    expect(merged.data.map((item) => item.id)).toEqual(['1', '3', '2'])
    expect(merged.totals.find((total) => total.currency === 'VND')?.totalMinor).toBe(
      '9007199254798993',
    )
    expect(merged.totals.find((total) => total.currency === 'USD')?.totalMinor).toBe('1250')
  })
  it('evicts captures after the server returns them', () => {
    const pending = [{ expense }]

    expect(reconcileSavedCaptures(pending, [expense])).toEqual([])
    expect(reconcileSavedCaptures(pending, [])).toEqual(pending)
  })
  it('removes a deleted optimistic capture', () => {
    expect(removeSavedCapture([{ expense }], expense.id)).toEqual([])
  })
  it('does not add captures from another day', () => {
    const yesterday = { ...expense, id: '2', occurredAt: '2026-10-19T23:59:59+07:00' }
    const tomorrow = { ...expense, id: '3', occurredAt: '2026-10-21T00:00:00+07:00' }
    expect(
      mergeSavedCaptures(null, [{ expense: yesterday }, { expense: tomorrow }], day).data,
    ).toEqual([])
  })
})
