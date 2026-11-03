// Shared contract and domain types for photo expense suggestions.
// Contract shapes follow docs/technical-design/03-photo-expense-suggestion.md (API table) and
// are intentionally local: they do not depend on features/api/types.ts.

export type SuggestionField = 'amountMinor' | 'occurredAt' | 'merchant' | 'categoryId'

export const SUGGESTION_FIELDS: readonly SuggestionField[] = [
  'amountMinor',
  'occurredAt',
  'merchant',
  'categoryId',
]

export type SuggestionSource =
  | 'user'
  | 'ocr'
  | 'personal_rule'
  | 'default_rule'
  | 'decision_model'
  | 'capture_time'

/** Sources that can arrive as a candidate; `user` only exists as a draft transition. */
export type CandidateSource = Exclude<SuggestionSource, 'user'>

/**
 * What happened to the value of a field, as recorded in `fieldProvenance`.
 *
 * - `prefilled`: a machine value was written into the draft and the user has not touched it. On
 *   save this means "kept as is" (see `finalizeProvenance`, which reports it as `accepted`).
 * - `accepted`: the user explicitly adopted a machine value (tapped a suggestion, or re-selected
 *   the value that was already prefilled).
 * - `edited`: the user replaced a machine value with their own value; `source` is `user`.
 * - `entered`: the user typed a value into a field that had no machine value; `source` is `user`.
 * - `cleared`: the user emptied the field; `source` is `user`.
 * - `suggested`: the field is empty and a machine value is only offered as tap-to-apply. Never
 *   part of the saved provenance.
 */
export type FieldOutcome = 'prefilled' | 'accepted' | 'edited' | 'entered' | 'cleared' | 'suggested'

export type FieldProvenance = {
  source: SuggestionSource
  ruleId?: string
  choiceId?: string
  confidence?: number
  outcome: FieldOutcome
}

export type FieldProvenanceMap = Partial<Record<SuggestionField, FieldProvenance>>

/**
 * A value proposed for one field. Values are strings for every field: `amountMinor` is a positive
 * integer in minor units, `occurredAt` an ISO 8601 instant, `merchant` free text, `categoryId` an
 * opaque identifier.
 */
export type SuggestionCandidate = {
  /** Unique within a generation; merge is idempotent per `(generation, id)`. */
  id: string
  generation: number
  field: SuggestionField
  value: string
  source: CandidateSource
  confidence: number
  ruleId?: string
  choiceId?: string
}

export type SuggestionThresholds = {
  ocrAmount: number
  personalRule: number
  decisionCategory: number
}

export type DecisionImageConfig = {
  maxEdgePx: number
  quality: number
  retryQuality: number
  targetBytes: number
  maxBytes: number
}

export type SuggestionFeatures = {
  suggestions: boolean
  ruleLearning: boolean
  location: boolean
  /**
   * A decision provider is configured on the server. When false, skip `POST /expense-inferences`
   * (OCR and rules still apply). Optional so older snapshots stay valid.
   */
  decision?: boolean
}

export type RuleOrigin = 'default' | 'learned' | 'user'

export type ImageTypeKey =
  | 'receipt'
  | 'invoice'
  | 'parking_ticket'
  | 'transport_ticket'
  | 'payment_screenshot'
  | 'food'
  | 'product'
  | 'other'

export type SuggestionImageType = {
  key: ImageTypeKey
  label: string
  description?: string
}

export type SuggestionChoice = {
  id: string
  label: string
  imageType?: ImageTypeKey
  placeKey?: string
  merchantKey?: string
}

/** AND over the present conditions; at least one must be set. */
export type RuleConditions = {
  choiceId?: string
  imageType?: string
  placeKey?: string
  merchantKey?: string
}

export type RuleActions = {
  /** Positive integer minor units; requires `currency`. Default rules never carry an amount. */
  amountMinor?: string
  currency?: string
  categoryId?: string
  merchant?: string
}

export type SuggestionRule = {
  id: string
  origin: RuleOrigin
  conditions: RuleConditions
  actions: RuleActions
  confidence: number
  /** ISO 8601 instant. */
  updatedAt: string
}

/** Response of `GET /suggestion-config`. */
export type SuggestionSnapshot = {
  etag?: string
  imageTypes: SuggestionImageType[]
  /** Personal choices that are enabled. */
  choices: SuggestionChoice[]
  /** Enabled `learned` and `user` rules. */
  rules: SuggestionRule[]
  /** System rules (`origin: default`), category only. */
  defaultRules: SuggestionRule[]
  thresholds: SuggestionThresholds
  decisionImage: DecisionImageConfig
  features: SuggestionFeatures
}

export type InferenceStatus = 'succeeded' | 'unavailable' | 'disabled'

export type InferenceChoice = { id: string; confidence: number }

/**
 * Response of `POST /expense-inferences`. `imageType.id` is the image type key (for example
 * `parking_ticket`), the same value rule conditions use; `category.id` is a category id and
 * `personalChoice.id` a personal choice id.
 */
export type InferenceResult = {
  id: string
  status: InferenceStatus
  reason?: string
  choiceSetVersion: string
  imageType: InferenceChoice | null
  category: InferenceChoice | null
  personalChoice: InferenceChoice | null
  provider: string
  model: string
  latencyMs: number
}
