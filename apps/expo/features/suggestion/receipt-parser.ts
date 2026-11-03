import { stripDiacritics } from './keys'
import type { SuggestionCandidate } from './types'

// Pure parser for Vietnamese receipt text produced by on-device OCR. OCR may drop diacritics or
// misread `đ`, so every keyword is matched against diacritic-free lowercase text and amounts are
// anchored on digits and separators rather than on currency symbols.

export type OcrBox = { x: number; y: number; width: number; height: number }
export type OcrLine = { text: string; box?: OcrBox }
export type OcrResult = { lines: readonly OcrLine[] }

export type ReceiptAmountCandidate = {
  /** Positive integer VND, as a string of minor units. */
  value: string
  confidence: number
  lineIndex: number
}

export type ReceiptDateCandidate = {
  /** ISO 8601 instant. */
  value: string
  confidence: number
  lineIndex: number
  hasTime: boolean
}

export type ReceiptMerchantCandidate = {
  value: string
  confidence: number
  lineIndex: number
}

/** Candidates per field, best first. Empty arrays when nothing plausible was found. */
export type ReceiptCandidates = {
  amounts: ReceiptAmountCandidate[]
  dates: ReceiptDateCandidate[]
  merchants: ReceiptMerchantCandidate[]
}

export type ReceiptParseOptions = {
  /**
   * When the receipt shows a date without a time, the candidate takes this instant if the date is
   * the same local day, and 12:00 local time otherwise.
   */
  captureTime?: string | Date
  /** Offset used to read receipt dates, in minutes east of UTC. Defaults to Vietnam (+07:00). */
  utcOffsetMinutes?: number
}

const DEFAULT_UTC_OFFSET_MINUTES = 7 * 60
const MIN_AMOUNT = 1_000
const MAX_AMOUNT = 999_999_999
const MERCHANT_SCAN_LINES = 8
const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

export function ocrLinesFromText(text: string): OcrLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => ({ text: line }))
    .filter((line) => line.text.trim().length > 0)
}

export function parseReceipt(
  input: OcrResult | readonly OcrLine[],
  options: ReceiptParseOptions = {},
): ReceiptCandidates {
  const lines = 'lines' in input ? input.lines : input
  return {
    amounts: parseAmounts(lines),
    dates: parseDates(lines, options),
    merchants: parseMerchants(lines),
  }
}

/** Best candidate per field as merge candidates (`ocr` source, one id per field). */
export function toOcrCandidates(
  parsed: ReceiptCandidates,
  generation: number,
): SuggestionCandidate[] {
  const result: SuggestionCandidate[] = []
  const amount = parsed.amounts[0]
  if (amount) {
    result.push({
      id: 'ocr:amountMinor',
      generation,
      field: 'amountMinor',
      value: amount.value,
      source: 'ocr',
      confidence: amount.confidence,
    })
  }
  const date = parsed.dates[0]
  if (date) {
    result.push({
      id: 'ocr:occurredAt',
      generation,
      field: 'occurredAt',
      value: date.value,
      source: 'ocr',
      confidence: date.confidence,
    })
  }
  const merchant = parsed.merchants[0]
  if (merchant) {
    result.push({
      id: 'ocr:merchant',
      generation,
      field: 'merchant',
      value: merchant.value,
      source: 'ocr',
      confidence: merchant.confidence,
    })
  }
  return result
}

// ---------------------------------------------------------------------------------------------
// Amounts

type LineKind = 'excluded' | 'subtotal' | 'total' | 'other'

type AmountToken = { value: number; hasSeparator: boolean; hasCurrency: boolean }

const CASH_LINE =
  /\b(?:tien mat|tien khach dua|khach dua|khach tra|tien thua|tien thoi|thoi lai|tra lai|tien tra lai|cash|change|tien tip)\b/
const CONTACT_LINE =
  /\b(?:dt|tel|sdt|hotline|phone|fax|zalo|mst|ma so thue|tax code|stk|dia chi|dc|ma don|ma hd|so hd|so hoa don|bill no|order no|bien so|so ve|ma ve)\b/
const TAX_OR_DISCOUNT_LINE =
  /\b(?:vat|thue|gtgt|giam gia|chiet khau|khuyen mai|discount|phi dich vu|phi phuc vu|service charge|voucher|diem tich luy|tich diem|points?)\b/
const SUBTOTAL_LINE =
  /\b(?:tam tinh|tong tien hang|tong hang|cong tien hang|tien hang|subtotal|sub total|tong tam|truoc thue|truoc giam gia)\b/

// Highest tier first; the first matching pattern decides the base confidence.
const TOTAL_TIERS: ReadonlyArray<{ pattern: RegExp; confidence: number }> = [
  {
    pattern:
      /\b(?:tong cong thanh toan|tong tien thanh toan|tong thanh toan|so tien thanh toan|tien thanh toan|can thanh toan|phai thanh toan|grand total|amount due|total due|balance due)\b/,
    confidence: 0.95,
  },
  { pattern: /\bthanh toan\b/, confidence: 0.92 },
  {
    pattern: /\b(?:tong cong|tong tien|tong so tien|tong bill|tong don|total)\b/,
    confidence: 0.9,
  },
  { pattern: /\bthanh tien\b/, confidence: 0.7 },
]

const CURRENCY_SUFFIX = /^\s*(?:vnd|dong|d|₫)(?![a-z])/
const AMOUNT_ONLY_LINE = /^[\s:]*\d[\d.,]*\s*(?:vnd|dong|d|₫)?\s*$/
const NUMBER_TOKEN = /\d[\d.,]*/g
const GROUPED_NUMBER = /^(\d{1,3})((?:[.,]\d{3})+)(?:[.,]\d{1,2})?$/
const FALLBACK_BEST = 0.45
const FALLBACK_OTHER = 0.3
const SUBTOTAL_CONFIDENCE = 0.45

function classifyLine(norm: string): { kind: LineKind; confidence: number } {
  // Parenthesised notes such as "(da gom VAT 8%)" must not turn a total into a tax line.
  const core = norm
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:da|bao)\s+gom\b.*$/, ' ')
    .replace(/\bincl\w*\b.*$/, ' ')
  if (CONTACT_LINE.test(core) || CASH_LINE.test(core)) return { kind: 'excluded', confidence: 0 }
  if (SUBTOTAL_LINE.test(core)) return { kind: 'subtotal', confidence: SUBTOTAL_CONFIDENCE }
  if (TAX_OR_DISCOUNT_LINE.test(core)) return { kind: 'excluded', confidence: 0 }
  for (const tier of TOTAL_TIERS) {
    if (tier.pattern.test(core)) return { kind: 'total', confidence: tier.confidence }
  }
  return { kind: 'other', confidence: 0 }
}

// Remove spans that look like amounts but are not (dates, times, percentages).
function maskNonAmounts(norm: string): string {
  return norm
    .replace(DATE_PATTERN, (match) => ' '.repeat(match.length))
    .replace(ISO_DATE_PATTERN, (match) => ' '.repeat(match.length))
    .replace(TIME_PATTERN, (match) => ' '.repeat(match.length))
    .replace(/\d[\d.,]*\s*%/g, (match) => ' '.repeat(match.length))
}

function extractAmountTokens(norm: string, allowBareDigits: boolean): AmountToken[] {
  const masked = maskNonAmounts(norm)
  const tokens: AmountToken[] = []
  for (const match of masked.matchAll(NUMBER_TOKEN)) {
    const raw = match[0].replace(/[.,]+$/, '')
    if (raw.startsWith('0')) continue
    const end = (match.index ?? 0) + match[0].length
    const hasCurrency = CURRENCY_SUFFIX.test(masked.slice(end))
    const grouped = GROUPED_NUMBER.exec(raw)
    let value: number
    let hasSeparator: boolean
    if (grouped) {
      value = Number(grouped[1] + (grouped[2] ?? '').replace(/[.,]/g, ''))
      hasSeparator = true
    } else if (/^\d+$/.test(raw)) {
      if (!hasCurrency && !allowBareDigits) continue
      value = Number(raw)
      hasSeparator = false
    } else {
      continue
    }
    if (!Number.isSafeInteger(value) || value < MIN_AMOUNT || value > MAX_AMOUNT) continue
    tokens.push({ value, hasSeparator, hasCurrency })
  }
  return tokens
}

function isAmountOnlyLine(norm: string): boolean {
  return AMOUNT_ONLY_LINE.test(maskNonAmounts(norm))
}

function verticalOverlap(a: OcrBox, b: OcrBox): number {
  const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return overlap / Math.min(a.height, b.height)
}

// OCR often splits "TONG CONG" and "58.000" into separate lines of the same row.
function findPairedLine(
  lines: readonly OcrLine[],
  norms: readonly string[],
  index: number,
): number | null {
  const label = lines[index]
  if (!label) return null
  let best: number | null = null
  let bestX = Number.POSITIVE_INFINITY
  let sawBoxes = false
  for (let candidate = 0; candidate < lines.length; candidate += 1) {
    const other = lines[candidate]
    const otherNorm = norms[candidate]
    if (candidate === index || !other || otherNorm === undefined) continue
    if (!label.box || !other.box) continue
    sawBoxes = true
    if (!isAmountOnlyLine(otherNorm)) continue
    if (other.box.x < label.box.x) continue
    if (!(verticalOverlap(label.box, other.box) >= 0.5)) continue
    if (other.box.x < bestX) {
      best = candidate
      bestX = other.box.x
    }
  }
  if (best !== null) return best
  if (sawBoxes) return null
  const next = norms[index + 1]
  return next !== undefined && isAmountOnlyLine(next) ? index + 1 : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseAmounts(lines: readonly OcrLine[]): ReceiptAmountCandidate[] {
  const norms = lines.map((line) => stripDiacritics(line.text))
  const found = new Map<number, ReceiptAmountCandidate>()
  const fallback: Array<{ value: number; hasCurrency: boolean; lineIndex: number }> = []

  const record = (value: number, confidence: number, lineIndex: number) => {
    const existing = found.get(value)
    if (
      existing &&
      (existing.confidence > confidence ||
        (existing.confidence === confidence && existing.lineIndex > lineIndex))
    ) {
      return
    }
    found.set(value, { value: String(value), confidence, lineIndex })
  }

  norms.forEach((norm, lineIndex) => {
    const { kind, confidence: base } = classifyLine(norm)
    if (kind === 'excluded') return

    if (kind === 'other') {
      for (const token of extractAmountTokens(norm, false)) {
        fallback.push({ value: token.value, hasCurrency: token.hasCurrency, lineIndex })
      }
      return
    }

    let paired = false
    let tokens = extractAmountTokens(norm, true)
    if (tokens.length === 0) {
      const pairedIndex = findPairedLine(lines, norms, lineIndex)
      const pairedNorm = pairedIndex === null ? undefined : norms[pairedIndex]
      if (pairedNorm !== undefined) {
        tokens = extractAmountTokens(pairedNorm, true)
        paired = tokens.length > 0
      }
    }
    // The amount is the last number on a total row ("Tong cong 3 mon 58.000").
    const token = tokens[tokens.length - 1]
    if (!token) return
    const confidence = clamp(
      base +
        (token.hasCurrency ? 0.03 : 0) -
        (paired ? 0.05 : 0) -
        (token.hasSeparator || token.hasCurrency ? 0 : 0.05),
      0,
      0.99,
    )
    record(token.value, confidence, lineIndex)
  })

  if (found.size === 0 && fallback.length > 0) {
    // No labelled row: the largest standalone amount is a weak guess for the total.
    const ranked = [...fallback].sort((a, b) => b.value - a.value || b.lineIndex - a.lineIndex)
    ranked.forEach((entry, rank) => {
      const confidence =
        (rank === 0 ? FALLBACK_BEST : FALLBACK_OTHER) + (entry.hasCurrency ? 0.05 : 0)
      record(entry.value, confidence, entry.lineIndex)
    })
  } else {
    for (const entry of fallback) {
      if (!found.has(entry.value)) record(entry.value, FALLBACK_OTHER, entry.lineIndex)
    }
  }

  return [...found.values()].sort(
    (a, b) => b.confidence - a.confidence || b.lineIndex - a.lineIndex,
  )
}

// ---------------------------------------------------------------------------------------------
// Dates

const DATE_PATTERN = /(?<!\d)(\d{1,2})\s?([/\-.])\s?(\d{1,2})\s?\2\s?(\d{4}|\d{2})(?!\d)/g
const ISO_DATE_PATTERN = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g
const LONG_DATE_PATTERN = /ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/g
const TIME_PATTERN = /(?<!\d)(\d{1,2})\s?[:h]\s?(\d{2})(?:\s?:\s?(\d{2}))?(?:\s?(am|pm))?(?![\d])/g
const DATE_KEYWORD = /\b(?:ngay|date|thoi gian|gio|time|in luc|vao|ra)\b/

type YearMonthDay = { year: number; month: number; day: number }

function isValidDay({ year, month, day }: YearMonthDay): boolean {
  if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1) return false
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function findDates(norm: string): Array<YearMonthDay & { shortYear: boolean }> {
  const dates: Array<YearMonthDay & { shortYear: boolean }> = []
  const push = (year: number, month: number, day: number, shortYear: boolean) => {
    if (isValidDay({ year, month, day })) dates.push({ year, month, day, shortYear })
  }
  for (const match of norm.matchAll(ISO_DATE_PATTERN)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), false)
  }
  for (const match of norm.matchAll(LONG_DATE_PATTERN)) {
    push(Number(match[3]), Number(match[2]), Number(match[1]), false)
  }
  for (const match of norm.matchAll(DATE_PATTERN)) {
    const yearText = match[4] ?? ''
    const shortYear = yearText.length === 2
    push(
      shortYear ? 2000 + Number(yearText) : Number(yearText),
      Number(match[3]),
      Number(match[1]),
      shortYear,
    )
  }
  return dates
}

function findTime(norm: string): { hour: number; minute: number } | null {
  // Dates such as "12.03.25" or "12/03/2025" must not be read as clock times.
  const masked = norm.replace(DATE_PATTERN, (match) => ' '.repeat(match.length))
  for (const match of masked.matchAll(TIME_PATTERN)) {
    let hour = Number(match[1])
    const minute = Number(match[2])
    const meridiem = match[4]
    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    if (hour < 24 && minute < 60) return { hour, minute }
  }
  return null
}

function localDayStart(instantMs: number, offsetMinutes: number): number {
  const local = instantMs + offsetMinutes * MINUTE_MS
  return Math.floor(local / DAY_MS) * DAY_MS - offsetMinutes * MINUTE_MS
}

function parseDates(
  lines: readonly OcrLine[],
  options: ReceiptParseOptions,
): ReceiptDateCandidate[] {
  const offset = options.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES
  const captureMs =
    options.captureTime === undefined ? Number.NaN : new Date(options.captureTime).getTime()
  const candidates: ReceiptDateCandidate[] = []

  lines.forEach((line, lineIndex) => {
    const norm = stripDiacritics(line.text)
    const dates = findDates(norm)
    if (dates.length === 0) return
    const time = findTime(norm)
    const keyword = DATE_KEYWORD.test(norm)
    for (const date of dates) {
      const dayStartMs = Date.UTC(date.year, date.month - 1, date.day) - offset * MINUTE_MS
      let instantMs: number
      if (time) {
        instantMs = dayStartMs + (time.hour * 60 + time.minute) * MINUTE_MS
      } else if (Number.isFinite(captureMs) && localDayStart(captureMs, offset) === dayStartMs) {
        instantMs = captureMs
      } else {
        instantMs = dayStartMs + 12 * 60 * MINUTE_MS
      }
      const confidence = clamp(
        0.7 + (keyword ? 0.15 : 0) + (time ? 0.05 : 0) - (date.shortYear ? 0.1 : 0),
        0,
        0.95,
      )
      candidates.push({
        value: new Date(instantMs).toISOString(),
        confidence,
        lineIndex,
        hasTime: time !== null,
      })
    }
  })

  const unique = new Map<string, ReceiptDateCandidate>()
  for (const candidate of candidates) {
    const existing = unique.get(candidate.value)
    if (!existing || existing.confidence < candidate.confidence) {
      unique.set(candidate.value, candidate)
    }
  }
  return [...unique.values()].sort(
    (a, b) => b.confidence - a.confidence || a.lineIndex - b.lineIndex,
  )
}

// ---------------------------------------------------------------------------------------------
// Merchant

const BOILERPLATE_LINE =
  /\b(?:hoa don|phieu|receipt|invoice|bill|ban hang|gtgt|cam on|thank|welcome|xin chao|hen gap lai|wifi|password|website|email|ngay|date|gio|thu ngan|nhan vien|khach hang|so ban|quay|pos|stt|mst|ma so thue|hotline|tel|sdt|dt|fax|zalo|vat|tax)\b/
const BOILERPLATE_SUBSTRING = /(?:www\.|https?:|@|\.com\b|\.vn\b)/
const TABLE_HEADER_WORDS = /\b(?:stt|ten hang|mat hang|don gia|so luong|sl|dvt|thanh tien)\b/g
const ADDRESS_PREFIX = /^(?:dia chi|d\/c|dc|add(?:ress)?|dchi)\b/
const ADDRESS_ABBREVIATION = /(?:^|[\s,])(?:tp|q|p|f|h|tx|x)\.\s?[a-z0-9]/

// The item table starts after the header block; stop looking for a merchant there.
function isMerchantStopLine(norm: string): boolean {
  return (norm.match(TABLE_HEADER_WORDS) ?? []).length >= 2
}

function isAddressLine(norm: string): boolean {
  if (ADDRESS_PREFIX.test(norm)) return true
  const hasComma = norm.includes(',')
  if (hasComma && /\d/.test(norm)) return true
  if (hasComma && ADDRESS_ABBREVIATION.test(norm)) return true
  // "12 Nguyen Hue 1": house number followed by a street name; "7 Eleven" stays valid.
  return /^\d+[a-z]?(?:[/-]\d+[a-z]?)*\s+\S+\s+\S+/.test(norm)
}

function cleanMerchantText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '')
    .trim()
}

function isPlausibleMerchant(text: string, norm: string): boolean {
  if (text.length < 3 || text.length > 50) return false
  const letters = (text.match(/\p{L}/gu) ?? []).length
  const digits = (text.match(/\p{N}/gu) ?? []).length
  const visible = text.replace(/\s/g, '').length
  if (letters < 3 || digits / visible > 0.4 || letters / visible < 0.6) return false
  if (BOILERPLATE_LINE.test(norm) || BOILERPLATE_SUBSTRING.test(norm)) return false
  if (isAddressLine(norm)) return false
  if (findDates(norm).length > 0) return false
  return true
}

function parseMerchants(lines: readonly OcrLine[]): ReceiptMerchantCandidate[] {
  const merchants: ReceiptMerchantCandidate[] = []
  const limit = Math.min(lines.length, MERCHANT_SCAN_LINES)
  for (let lineIndex = 0; lineIndex < limit; lineIndex += 1) {
    const line = lines[lineIndex]
    if (!line) continue
    const norm = stripDiacritics(line.text)
    if (isMerchantStopLine(norm)) break
    const text = cleanMerchantText(line.text)
    if (!isPlausibleMerchant(text, stripDiacritics(text))) continue
    const letters = text.match(/\p{L}/gu) ?? []
    const upper = letters.filter((letter) => letter === letter.toUpperCase()).length
    const shout = letters.length > 0 && upper / letters.length >= 0.7
    const confidence = clamp(
      0.72 - merchants.length * 0.06 - lineIndex * 0.04 + (shout ? 0.05 : 0),
      0.3,
      0.8,
    )
    merchants.push({ value: text, confidence, lineIndex })
  }
  return merchants.sort((a, b) => b.confidence - a.confidence || a.lineIndex - b.lineIndex)
}
