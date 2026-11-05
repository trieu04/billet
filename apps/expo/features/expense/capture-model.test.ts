import { describe, expect, it } from 'vitest'
import type { Category, Expense, ExpenseList } from '../api/types'
import {
  amountDigits,
  amountSuggestionValues,
  formatDateTimeInput,
  parseDateTimeInput,
  findCategoryIdByCode,
  formatAmountInput,
  formatPlaceLabel,
  mergeSavedCaptures,
  nextScrollOffset,
  parseCaptureAmount,
  parseSuggestionGeneration,
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

describe('findCategoryIdByCode', () => {
  const categories = [
    { id: '1', code: 'food' },
    { id: '2', code: 'transport' },
  ] as Category[]

  it('returns the id of the category with the code', () => {
    expect(findCategoryIdByCode(categories, 'transport')).toBe('2')
  })

  it('returns undefined without a matching code or categories', () => {
    expect(findCategoryIdByCode(categories, 'bills')).toBeUndefined()
    expect(findCategoryIdByCode(categories, undefined)).toBeUndefined()
    expect(findCategoryIdByCode(null, 'food')).toBeUndefined()
  })
})

describe('parseSuggestionGeneration', () => {
  it('reads a positive generation from the route param', () => {
    expect(parseSuggestionGeneration('3')).toBe(3)
    expect(parseSuggestionGeneration(['4', '5'])).toBe(4)
    expect(parseSuggestionGeneration(undefined)).toBeUndefined()
    expect(parseSuggestionGeneration('0')).toBeUndefined()
    expect(parseSuggestionGeneration('abc')).toBeUndefined()
  })
})

describe('amount input', () => {
  it('groups digits like the journal', () => {
    expect(formatAmountInput('')).toBe('')
    expect(formatAmountInput('500')).toBe('500')
    expect(formatAmountInput('1000')).toBe('1.000')
    expect(formatAmountInput('1250000')).toBe('1.250.000')
  })

  it('reads the digits back from the grouped text', () => {
    expect(amountDigits('1.250.000')).toBe('1250000')
    expect(parseCaptureAmount(amountDigits(formatAmountInput('1250000')))).toBe('1250000')
  })

  it('caps the amount at 15 digits', () => {
    expect(amountDigits('1234567890123456789')).toBe('123456789012345')
  })
})

describe('formatPlaceLabel', () => {
  it('joins the useful parts of an address', () => {
    expect(
      formatPlaceLabel({
        name: '135 Nam Kỳ Khởi Nghĩa',
        street: 'Nam Kỳ Khởi Nghĩa',
        district: 'Quận 1',
        city: 'Hồ Chí Minh',
      }),
    ).toBe('135 Nam Kỳ Khởi Nghĩa, Quận 1, Hồ Chí Minh')
  })

  it('falls back to wider areas and returns nothing for an empty address', () => {
    expect(formatPlaceLabel({ subregion: 'Thủ Đức', region: 'Hồ Chí Minh' })).toBe(
      'Thủ Đức, Hồ Chí Minh',
    )
    expect(formatPlaceLabel({ name: ' ', city: null })).toBe('')
  })
})

describe('nextScrollOffset', () => {
  it('leaves a visible block alone', () => {
    expect(nextScrollOffset({ top: 100, bottom: 200, viewport: 300, offset: 0 })).toBeNull()
  })

  it('scrolls a block covered by the keyboard up just enough', () => {
    expect(nextScrollOffset({ top: 500, bottom: 560, viewport: 300, offset: 0 })).toBe(268)
  })

  it('scrolls back to a block above the viewport', () => {
    expect(nextScrollOffset({ top: 40, bottom: 100, viewport: 300, offset: 200 })).toBe(32)
    expect(nextScrollOffset({ top: 2, bottom: 100, viewport: 300, offset: 200 })).toBe(0)
  })

  it('shows the end of a block taller than the viewport', () => {
    expect(nextScrollOffset({ top: 10, bottom: 400, viewport: 300, offset: 0 })).toBe(108)
  })
})

describe('amountSuggestionValues', () => {
  it('reads short typed digits as thousands', () => {
    expect(amountSuggestionValues('12', [])).toEqual(['12000', '120000'])
    expect(amountSuggestionValues('125', [])).toEqual(['125000', '1250000'])
  })

  it('puts receipt amounts first, even before anything is typed', () => {
    expect(amountSuggestionValues('', ['58000'])).toEqual(['58000'])
    expect(amountSuggestionValues('12', ['58000'])).toEqual(['58000', '12000', '120000'])
  })

  it('does not repeat a value or offer what is already typed', () => {
    expect(amountSuggestionValues('12', ['12000', '12'])).toEqual(['12000', '120000'])
    expect(amountSuggestionValues('58000', ['58000'])).toEqual([])
  })

  it('stops guessing for long or zero-led input', () => {
    expect(amountSuggestionValues('1250', [])).toEqual([])
    expect(amountSuggestionValues('012', [])).toEqual([])
    expect(amountSuggestionValues('1.250', [])).toEqual([])
  })
})

describe('date time input', () => {
  it('round-trips a local time', () => {
    const iso = new Date(2026, 10, 5, 19, 7).toISOString()
    expect(formatDateTimeInput(iso)).toBe('05/11/2026 19:07')
    expect(parseDateTimeInput('05/11/2026 19:07')).toBe(iso)
  })

  it('rejects text that is not a real date', () => {
    expect(parseDateTimeInput('31/02/2026 10:00')).toBeNull()
    expect(parseDateTimeInput('5/11/2026')).toBeNull()
  })
})
