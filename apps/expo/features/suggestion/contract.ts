import type { OcrBox, OcrLine, OcrResult } from './receipt-parser'
import type {
  ImageTypeKey,
  InferenceChoice,
  InferenceResult,
  SuggestionChoice,
  SuggestionImageType,
  SuggestionRule,
  SuggestionSnapshot,
} from './types'

// Narrowing for server responses that are cached or drive the merge. A malformed response is
// treated like "no suggestion", never as an error the user has to deal with.

type UnknownRecord = Record<string, unknown>

const IMAGE_TYPE_KEYS: readonly ImageTypeKey[] = [
  'receipt',
  'invoice',
  'parking_ticket',
  'transport_ticket',
  'payment_screenshot',
  'food',
  'product',
  'other',
]

function toImageTypeKey(value: unknown): ImageTypeKey | undefined {
  return IMAGE_TYPE_KEYS.find((key) => key === value)
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isString = (value: unknown): value is string => typeof value === 'string'

function optionalString(value: unknown): string | undefined {
  return isString(value) && value !== '' ? value : undefined
}

function parseChoice(value: unknown): InferenceChoice | null {
  if (!isRecord(value) || !isString(value.id) || !isNumber(value.confidence)) return null
  return { id: value.id, confidence: value.confidence }
}

const INFERENCE_STATUSES = ['succeeded', 'unavailable', 'disabled'] as const

/** `POST /expense-inferences` response, or `null` when it does not match the contract. */
export function parseInferenceResult(value: unknown): InferenceResult | null {
  if (!isRecord(value) || !isString(value.id)) return null
  const status = INFERENCE_STATUSES.find((item) => item === value.status)
  if (!status) return null
  const result: InferenceResult = {
    id: value.id,
    status,
    choiceSetVersion: isString(value.choiceSetVersion) ? value.choiceSetVersion : '',
    imageType: parseChoice(value.imageType),
    category: parseChoice(value.category),
    personalChoice: parseChoice(value.personalChoice),
    provider: isString(value.provider) ? value.provider : '',
    model: isString(value.model) ? value.model : '',
    latencyMs: isNumber(value.latencyMs) ? value.latencyMs : 0,
  }
  if (isString(value.reason)) result.reason = value.reason
  return result
}

function parseRule(value: unknown): SuggestionRule | null {
  if (!isRecord(value) || !isString(value.id) || !isRecord(value.conditions)) return null
  if (!isRecord(value.actions) || !isNumber(value.confidence)) return null
  const origin = (['default', 'learned', 'user'] as const).find((item) => item === value.origin)
  if (!origin) return null
  const { conditions, actions } = value
  return {
    id: value.id,
    origin,
    conditions: {
      choiceId: optionalString(conditions.choiceId),
      imageType: optionalString(conditions.imageType),
      placeKey: optionalString(conditions.placeKey),
      merchantKey: optionalString(conditions.merchantKey),
    },
    actions: {
      amountMinor: optionalString(actions.amountMinor),
      currency: optionalString(actions.currency),
      categoryId: optionalString(actions.categoryId),
      merchant: optionalString(actions.merchant),
    },
    confidence: value.confidence,
    updatedAt: isString(value.updatedAt) ? value.updatedAt : '',
  }
}

function parseSuggestionChoice(value: unknown): SuggestionChoice | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.label)) return null
  const choice: SuggestionChoice = { id: value.id, label: value.label }
  const imageType = toImageTypeKey(value.imageType)
  if (imageType) choice.imageType = imageType
  const placeKey = optionalString(value.placeKey)
  if (placeKey) choice.placeKey = placeKey
  const merchantKey = optionalString(value.merchantKey)
  if (merchantKey) choice.merchantKey = merchantKey
  return choice
}

function parseImageType(value: unknown): SuggestionImageType | null {
  const key = isRecord(value) ? toImageTypeKey(value.key) : undefined
  if (!isRecord(value) || !key || !isString(value.label)) return null
  const imageType: SuggestionImageType = { key, label: value.label }
  if (isString(value.description)) imageType.description = value.description
  return imageType
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null
  return value.map(parse).filter((item): item is T => item !== null)
}

/** `GET /suggestion-config` response (or the cached copy), or `null` when malformed. */
export function parseSnapshot(value: unknown): SuggestionSnapshot | null {
  if (!isRecord(value)) return null
  const { thresholds, decisionImage, features } = value
  if (!isRecord(thresholds) || !isRecord(decisionImage) || !isRecord(features)) return null
  const imageTypes = parseList(value.imageTypes, parseImageType)
  const choices = parseList(value.choices, parseSuggestionChoice)
  const rules = parseList(value.rules, parseRule)
  const defaultRules = parseList(value.defaultRules, parseRule)
  if (!imageTypes || !choices || !rules || !defaultRules) return null
  const { ocrAmount, personalRule, decisionCategory } = thresholds
  if (!isNumber(ocrAmount) || !isNumber(personalRule) || !isNumber(decisionCategory)) return null
  const { maxEdgePx, quality, retryQuality, targetBytes, maxBytes } = decisionImage
  if (
    !isNumber(maxEdgePx) ||
    !isNumber(quality) ||
    !isNumber(retryQuality) ||
    !isNumber(targetBytes) ||
    !isNumber(maxBytes)
  )
    return null
  if (typeof features.suggestions !== 'boolean') return null
  return {
    etag: optionalString(value.etag),
    imageTypes,
    choices,
    rules,
    defaultRules,
    thresholds: { ocrAmount, personalRule, decisionCategory },
    decisionImage: { maxEdgePx, quality, retryQuality, targetBytes, maxBytes },
    features: {
      suggestions: features.suggestions,
      ruleLearning: features.ruleLearning === true,
      location: features.location === true,
      decision: features.decision !== false,
    },
  }
}

const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,3}$/

/**
 * A locale the server accepts (`vi-VN`, `en-US`): Unicode extensions such as `-u-hc-h23` and
 * anything else that does not match are dropped.
 */
export function toRequestLocale(raw: string | null | undefined, fallback = 'vi-VN'): string {
  const subtags: string[] = []
  for (const part of (raw ?? '').split(/[-_]/)) {
    if (part.length <= 1 || subtags.length === 4) break
    subtags.push(part)
  }
  const locale = subtags.join('-')
  return LOCALE_PATTERN.test(locale) ? locale : fallback
}

function parseBox(value: unknown): OcrBox | undefined {
  if (!isRecord(value)) return undefined
  const { x, y, width, height } = value
  if (!isNumber(x) || !isNumber(y) || !isNumber(width) || !isNumber(height)) return undefined
  return { x, y, width, height }
}

/** Result of the native `BilletOcr.recognize`, or `null` when it does not match. */
export function parseOcrResult(value: unknown): OcrResult | null {
  if (!isRecord(value) || !Array.isArray(value.lines)) return null
  const lines: OcrLine[] = []
  for (const item of value.lines) {
    if (!isRecord(item) || !isString(item.text) || item.text.trim() === '') continue
    const box = parseBox(item.box)
    lines.push(box ? { text: item.text, box } : { text: item.text })
  }
  return { lines }
}
