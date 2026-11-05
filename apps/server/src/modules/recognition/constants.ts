/** System image types offered to the decision model; seeded by migration, keys are stable. */
export const IMAGE_TYPE_KEYS = [
  'receipt',
  'invoice',
  'parking_ticket',
  'transport_ticket',
  'payment_screenshot',
  'food',
  'product',
  'other',
] as const

export type ImageTypeKey = (typeof IMAGE_TYPE_KEYS)[number]

export function isImageTypeKey(value: unknown): value is ImageTypeKey {
  return typeof value === 'string' && (IMAGE_TYPE_KEYS as readonly string[]).includes(value)
}

/** Fields that photo suggestions fill and record provenance for. */
export const SUGGESTION_FIELDS = ['amountMinor', 'occurredAt', 'merchant', 'categoryId'] as const
export type SuggestionField = (typeof SUGGESTION_FIELDS)[number]

export const SUGGESTION_SOURCES = [
  'user',
  'ocr',
  'personal_rule',
  'default_rule',
  'decision_model',
  'capture_time',
] as const
export type SuggestionSource = (typeof SUGGESTION_SOURCES)[number]

/** Saved outcomes. The client reports a kept prefill as `accepted`. */
export const FIELD_OUTCOMES = ['accepted', 'edited', 'entered', 'cleared', 'suggested'] as const
export type FieldOutcome = (typeof FIELD_OUTCOMES)[number]

/** Initial client thresholds, served through `GET /suggestion-config`. */
export const SUGGESTION_THRESHOLDS = {
  ocrAmount: 0.8,
  personalRule: 0.7,
  decisionCategory: 0.6,
} as const

/** Client compression parameters for the decision image, served through the snapshot. */
export const DECISION_IMAGE = {
  maxEdgePx: 1024,
  quality: 0.6,
  retryQuality: 0.45,
  targetBytes: 150_000,
  maxBytes: 400_000,
} as const

/** Confidence published for system default rules (category only). */
export const DEFAULT_RULE_CONFIDENCE = 0.5

/** Personal choices offered per inference request. */
export const MAX_PERSONAL_CHOICES_PER_REQUEST = 20

/** Provider calls are skipped when less than this remains of the request deadline. */
export const MIN_PROVIDER_BUDGET_MS = 1_000

/** Per-user caps; above them the least used `learned` item is evicted. */
export const MAX_PERSONAL_CHOICES_PER_USER = 100
export const MAX_RULES_PER_USER = 500

/** Deleting a choice or rule blocks the learner from recreating its key for this long. */
export const SUPPRESSION_DAYS = 90

/** Decision calls one admin can make from the playground per minute on one instance. */
export const PLAYGROUND_MAX_PER_MINUTE = 20

/** Inference records are removed after this many days. */
export const INFERENCE_RETENTION_DAYS = 90

/** In-process choice set cache. Personal choices are invalidated on change; TTL bounds staleness across instances. */
export const CHOICE_SET_CACHE_TTL_MS = 60_000
export const CHOICE_SET_CACHE_MAX_USERS = 1_000

export const DAY_MS = 86_400_000
