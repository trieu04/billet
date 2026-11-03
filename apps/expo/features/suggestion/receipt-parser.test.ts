import { describe, expect, it } from 'vitest'
import { CAPTURE_TIME, receiptFixtures } from './receipt-fixtures'
import { ocrLinesFromText, parseReceipt, toOcrCandidates } from './receipt-parser'
import type { ReceiptParseOptions } from './receipt-parser'

const options: ReceiptParseOptions = { captureTime: CAPTURE_TIME }

function amountOf(text: string): string | undefined {
  return parseReceipt(ocrLinesFromText(text), options).amounts[0]?.value
}

describe('parseReceipt fixtures', () => {
  it.each(receiptFixtures)('$name', ({ lines, expected }) => {
    const parsed = parseReceipt(lines, options)
    const amount = parsed.amounts[0]
    if (expected.amount) {
      expect(amount?.value).toBe(expected.amount)
      expect(amount?.confidence).toBeGreaterThanOrEqual(0.8)
    } else {
      expect(amount?.confidence ?? 0).toBeLessThan(0.8)
    }
    if (expected.date) expect(parsed.dates[0]?.value).toBe(expected.date)
    else expect(parsed.dates).toHaveLength(0)
    if (expected.merchant) expect(parsed.merchants[0]?.value).toBe(expected.merchant)
  })
})

describe('amount formats', () => {
  it.each([
    ['TỔNG CỘNG 58.000', '58000'],
    ['TỔNG CỘNG: 58,000đ', '58000'],
    ['TONG CONG 58.000 VND', '58000'],
    ['Tổng cộng 58.000 VNĐ', '58000'],
    ['THANH TOAN: 1.250.000', '1250000'],
    ['Tổng tiền 58000', '58000'],
    ['Tổng tiền: 58.000,00', '58000'],
    ['Thanh toán 2.500.000₫', '2500000'],
    ['TOTAL 120,000', '120000'],
    ['Tổng cộng (3 món) 58.000', '58000'],
  ])('reads "%s"', (text, expected) => {
    expect(amountOf(text)).toBe(expected)
  })

  it('returns nothing for amounts outside the VND range or malformed', () => {
    expect(amountOf('Tổng cộng 12,50')).toBeUndefined()
    expect(amountOf('Tổng cộng 500')).toBeUndefined()
    expect(amountOf('Tổng cộng 12.345.678.901')).toBeUndefined()
  })
})

describe('amount keyword preference', () => {
  it('prefers THANH TOAN over TONG CONG when they differ', () => {
    const amounts = parseReceipt(
      ocrLinesFromText('Tổng cộng 60.000\nGiảm giá 2.000\nThanh toán 58.000'),
    ).amounts
    expect(amounts[0]?.value).toBe('58000')
    expect(amounts[0]?.confidence).toBeGreaterThan(amounts[1]?.confidence ?? 1)
  })

  it('prefers a total over subtotal, tax and cash lines', () => {
    const text = [
      'Tạm tính 100.000',
      'VAT 10% 10.000',
      'Tổng cộng 110.000',
      'Tiền mặt 200.000',
      'Tiền thừa 90.000',
    ].join('\n')
    const amounts = parseReceipt(ocrLinesFromText(text)).amounts
    expect(amounts[0]?.value).toBe('110000')
    expect(amounts.map((amount) => amount.value)).not.toContain('200000')
    expect(amounts.map((amount) => amount.value)).not.toContain('90000')
    expect(amounts.map((amount) => amount.value)).not.toContain('10000')
  })

  it('prefers the later row when two totals have the same weight', () => {
    expect(amountOf('Tổng cộng 60.000\nTổng cộng 58.000')).toBe('58000')
  })

  it('keeps a total whose note mentions VAT', () => {
    expect(amountOf('Tổng cộng (đã bao gồm VAT 10%) 110.000')).toBe('110000')
    expect(amountOf('Tổng tiền đã gồm VAT 110.000')).toBe('110000')
  })

  it('keeps subtotal below the prefill confidence', () => {
    const [best] = parseReceipt(ocrLinesFromText('Tạm tính 58.000')).amounts
    expect(best?.value).toBe('58000')
    expect(best?.confidence).toBeLessThan(0.8)
  })

  it('does not treat phone numbers, dates or percentages as amounts', () => {
    const text = 'ĐT: 0903.123.456\nNgày 28/10/2026 08:42\nGiảm 10%\nHotline 1900 1234'
    expect(parseReceipt(ocrLinesFromText(text)).amounts).toHaveLength(0)
  })

  it('falls back to the largest standalone amount with low confidence', () => {
    const [best, other] = parseReceipt(ocrLinesFromText('Trà đào 35.000\nBánh 45.000')).amounts
    expect(best?.value).toBe('45000')
    expect(best?.confidence).toBeLessThan(0.6)
    expect(other?.value).toBe('35000')
  })

  it('gives separate-line pairs a slightly lower confidence than same-line totals', () => {
    const same = parseReceipt(ocrLinesFromText('Tổng cộng 58.000')).amounts[0]
    const paired = parseReceipt(ocrLinesFromText('Tổng cộng\n58.000')).amounts[0]
    expect(paired?.confidence).toBeLessThan(same?.confidence ?? 0)
    expect(paired?.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('pairs by row when boxes are present and ignores amounts in other rows', () => {
    const parsed = parseReceipt([
      { text: 'Tổng cộng', box: { x: 0.1, y: 0.5, width: 0.3, height: 0.03 } },
      { text: '99.000', box: { x: 0.7, y: 0.2, width: 0.2, height: 0.03 } },
      { text: '58.000', box: { x: 0.7, y: 0.5, width: 0.2, height: 0.03 } },
    ])
    expect(parsed.amounts[0]?.value).toBe('58000')
  })
})

describe('dates', () => {
  const date = (text: string, extra = options) => parseReceipt(ocrLinesFromText(text), extra).dates

  it.each([
    ['Ngày 28/10/2026', '2026-10-28T05:00:00.000Z'],
    ['28-10-2026', '2026-10-28T05:00:00.000Z'],
    ['28/10/26', '2026-10-28T05:00:00.000Z'],
    ['28.10.2026', '2026-10-28T05:00:00.000Z'],
    ['Ngày 28/10/2026 08:42', '2026-10-28T01:42:00.000Z'],
    ['08:42:15 28-10-26', '2026-10-28T01:42:00.000Z'],
    ['Ngay: 28/10/2026 8h05', '2026-10-28T01:05:00.000Z'],
    ['28/10/2026 08:42 PM', '2026-10-28T13:42:00.000Z'],
    ['Ngay 28 thang 10 nam 2026', '2026-10-28T05:00:00.000Z'],
    ['2026-10-28 08:42', '2026-10-28T01:42:00.000Z'],
    ['28 / 10 / 2026', '2026-10-28T05:00:00.000Z'],
  ])('reads "%s"', (text, expected) => {
    expect(date(text)[0]?.value).toBe(expected)
  })

  it('uses the capture instant for a date-only receipt from the same local day', () => {
    expect(date('31/10/2026')[0]?.value).toBe(CAPTURE_TIME)
  })

  it('honours the configured utc offset', () => {
    expect(
      date('28/10/2026 08:42', { captureTime: CAPTURE_TIME, utcOffsetMinutes: 0 })[0]?.value,
    ).toBe('2026-10-28T08:42:00.000Z')
  })

  it('rejects impossible dates and amounts that look like dates', () => {
    expect(date('31/02/2026')).toHaveLength(0)
    expect(date('32/10/2026')).toHaveLength(0)
    expect(date('28/13/2026')).toHaveLength(0)
    expect(date('Tổng cộng 1.250.000')).toHaveLength(0)
  })

  it('ranks labelled dates with a time above bare dates', () => {
    const dates = date('01/01/2026\nNgày: 28/10/2026 08:42')
    expect(dates[0]?.value).toBe('2026-10-28T01:42:00.000Z')
    expect(dates[0]?.confidence).toBeGreaterThan(dates[1]?.confidence ?? 1)
  })

  it('lowers confidence for two-digit years', () => {
    const long = date('28/10/2026')[0]
    const short = date('28/10/26')[0]
    expect(short?.confidence).toBeLessThan(long?.confidence ?? 0)
  })
})

describe('merchant', () => {
  const merchant = (text: string) => parseReceipt(ocrLinesFromText(text)).merchants[0]?.value

  it('takes the first plausible header line', () => {
    expect(merchant('Highlands Coffee\nHÓA ĐƠN')).toBe('Highlands Coffee')
  })

  it('skips digits, phones, addresses, tax codes and boilerplate', () => {
    const text = [
      '0903 123 456',
      'ĐT: 028 3822 1234',
      'MST: 0312345678',
      '12 Nguyễn Huệ, Quận 1',
      'Địa chỉ: Hà Nội',
      'HÓA ĐƠN THANH TOÁN',
      '28/10/2026',
      'Cơm Tấm Ba Ghiền',
    ].join('\n')
    expect(merchant(text)).toBe('Cơm Tấm Ba Ghiền')
  })

  it('keeps short numeric brand names and strips decoration', () => {
    expect(merchant('*** 7-Eleven ***')).toBe('7-Eleven')
    expect(merchant('Phở 24')).toBe('Phở 24')
  })

  it('returns nothing when no header line qualifies', () => {
    expect(merchant('0903123456\n58.000\n---')).toBeUndefined()
  })

  it('skips a house-number address but keeps a short numeric brand', () => {
    expect(merchant('12 Nguyễn Huệ Quận 1\n7 Eleven')).toBe('7 Eleven')
  })

  it('stops at the item table', () => {
    expect(merchant('STT Tên hàng SL Thành tiền\nCơm gà')).toBeUndefined()
  })

  it('gives the first line a higher confidence than later ones', () => {
    const merchants = parseReceipt(ocrLinesFromText('Quán A Một\nQuán Bê Hai')).merchants
    expect(merchants[0]?.value).toBe('Quán A Một')
    expect(merchants[0]?.confidence).toBeGreaterThan(merchants[1]?.confidence ?? 1)
  })
})

describe('toOcrCandidates', () => {
  it('maps the best candidate per field to ocr merge candidates', () => {
    const parsed = parseReceipt(
      ocrLinesFromText('Quán Cà Phê\nNgày 28/10/2026 08:42\nTổng cộng 58.000'),
      options,
    )
    const candidates = toOcrCandidates(parsed, 3)
    expect(candidates.map((candidate) => [candidate.id, candidate.field, candidate.value])).toEqual(
      [
        ['ocr:amountMinor', 'amountMinor', '58000'],
        ['ocr:occurredAt', 'occurredAt', '2026-10-28T01:42:00.000Z'],
        ['ocr:merchant', 'merchant', 'Quán Cà Phê'],
      ],
    )
    expect(
      candidates.every((candidate) => candidate.generation === 3 && candidate.source === 'ocr'),
    ).toBe(true)
  })

  it('omits fields without a candidate', () => {
    expect(toOcrCandidates(parseReceipt([]), 1)).toEqual([])
  })
})
