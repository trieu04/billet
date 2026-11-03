import type {
  CandidateSource,
  FieldOutcome,
  FieldProvenance,
  FieldProvenanceMap,
  SuggestionCandidate,
  SuggestionField,
  SuggestionSource,
  SuggestionThresholds,
} from './types'
import { SUGGESTION_FIELDS } from './types'

// Pure merge engine for the expense draft. All functions return new drafts and never mutate their
// input; when nothing changes the same draft instance is returned.

/**
 * Source priority per field, highest first. A source that is missing from a field's list can never
 * fill that field (for example `decision_model` never fills `amountMinor`).
 */
export const FIELD_PRIORITY: Readonly<Record<SuggestionField, readonly SuggestionSource[]>> = {
  amountMinor: ['user', 'ocr', 'personal_rule', 'default_rule'],
  occurredAt: ['user', 'ocr', 'capture_time'],
  merchant: ['user', 'ocr', 'personal_rule'],
  categoryId: ['user', 'personal_rule', 'decision_model', 'default_rule'],
}

export const DEFAULT_OCR_DATE_WINDOW_DAYS = 30

/**
 * The three thresholds come from the snapshot. The optional ones are not part of the snapshot
 * contract: they default to `DEFAULT_OPTIONAL_THRESHOLDS`.
 */
export type MergeThresholds = SuggestionThresholds & {
  ocrDate?: number
  ocrMerchant?: number
  defaultRule?: number
}

export const DEFAULT_OPTIONAL_THRESHOLDS = { ocrDate: 0.6, ocrMerchant: 0.6, defaultRule: 0 }

export type MergeConfig = {
  thresholds: MergeThresholds
  /** How far before the capture time an OCR date may be to prefill. Defaults to 30. */
  ocrDateWindowDays?: number
}

/** A machine value that is offered but not written into the draft. */
export type PendingSuggestion = {
  candidateId: string
  source: CandidateSource
  value: string
  confidence: number
  ruleId?: string
  choiceId?: string
}

export type SuggestionDraft = {
  /** Candidates from any other generation are ignored. */
  generation: number
  /** ISO instant the photo was captured; also the default `occurredAt`. */
  captureTime: string
  /** Set by the first user edit, clear or selection. Focus alone never locks. */
  locked: boolean
  values: Partial<Record<SuggestionField, string>>
  provenance: FieldProvenanceMap
  /** Tap-to-apply suggestions per field, best first. */
  suggestions: Partial<Record<SuggestionField, readonly PendingSuggestion[]>>
  /** Ids of candidates already handled in this generation. */
  processed: readonly string[]
}

export function createDraft(input: {
  generation: number
  captureTime: string | Date
}): SuggestionDraft {
  const capture = new Date(input.captureTime)
  if (Number.isNaN(capture.getTime())) throw new RangeError('captureTime must be a valid date')
  const captureTime = capture.toISOString()
  return {
    generation: input.generation,
    captureTime,
    locked: false,
    values: { occurredAt: captureTime },
    provenance: { occurredAt: { source: 'capture_time', outcome: 'prefilled' } },
    suggestions: {},
    processed: [],
  }
}

/** Higher is stronger; `-1` when the source cannot fill the field. */
export function priorityOf(field: SuggestionField, source: SuggestionSource): number {
  const index = FIELD_PRIORITY[field].indexOf(source)
  return index === -1 ? -1 : FIELD_PRIORITY[field].length - index
}

export function thresholdFor(
  field: SuggestionField,
  source: CandidateSource,
  thresholds: MergeThresholds,
): number {
  switch (source) {
    case 'ocr':
      if (field === 'amountMinor') return thresholds.ocrAmount
      if (field === 'occurredAt') return thresholds.ocrDate ?? DEFAULT_OPTIONAL_THRESHOLDS.ocrDate
      return thresholds.ocrMerchant ?? DEFAULT_OPTIONAL_THRESHOLDS.ocrMerchant
    case 'personal_rule':
      return thresholds.personalRule
    case 'decision_model':
      return thresholds.decisionCategory
    case 'default_rule':
      return thresholds.defaultRule ?? DEFAULT_OPTIONAL_THRESHOLDS.defaultRule
    case 'capture_time':
      return 0
  }
}

export function merge(
  draft: SuggestionDraft,
  candidates: readonly SuggestionCandidate[],
  config: MergeConfig,
): SuggestionDraft {
  let next = draft
  for (const candidate of candidates) next = applyCandidate(next, candidate, config)
  return next
}

/** The user typed, cleared or selected a value. `null`, empty or blank text clears the field. */
export function userEdit(
  draft: SuggestionDraft,
  field: SuggestionField,
  value: string | null | undefined,
): SuggestionDraft {
  const text = value?.trim() ?? ''
  const current = draft.values[field]
  const previous = draft.provenance[field]
  const hadMachineValue =
    current !== undefined && previous !== undefined && previous.source !== 'user'
  const values = { ...draft.values }
  const provenance = { ...draft.provenance }

  if (text === '') {
    delete values[field]
    if (current !== undefined) provenance[field] = { source: 'user', outcome: 'cleared' }
  } else {
    values[field] = text
    if (hadMachineValue && text === current) {
      provenance[field] = { ...previous, outcome: 'accepted' }
    } else {
      const edited =
        hadMachineValue || (previous?.source === 'user' && previous.outcome === 'edited')
      provenance[field] = { source: 'user', outcome: edited ? 'edited' : 'entered' }
    }
  }

  const remaining = (draft.suggestions[field] ?? []).filter((item) => item.value !== text)
  return refreshSuggestedProvenance({
    ...draft,
    locked: true,
    values,
    provenance,
    suggestions: { ...draft.suggestions, [field]: remaining },
  })
}

/** The user tapped a pending suggestion. Returns the draft unchanged if it no longer exists. */
export function applySuggestion(
  draft: SuggestionDraft,
  field: SuggestionField,
  candidateId: string,
): SuggestionDraft {
  const pending = draft.suggestions[field]?.find((item) => item.candidateId === candidateId)
  if (!pending) return draft
  const remaining = (draft.suggestions[field] ?? []).filter((item) => item.value !== pending.value)
  return refreshSuggestedProvenance({
    ...draft,
    locked: true,
    values: { ...draft.values, [field]: pending.value },
    provenance: {
      ...draft.provenance,
      [field]: provenanceOf(pending.source, pending, 'accepted'),
    },
    suggestions: { ...draft.suggestions, [field]: remaining },
  })
}

/** The best pending suggestion for a field, if any. */
export function bestSuggestion(
  draft: SuggestionDraft,
  field: SuggestionField,
): PendingSuggestion | undefined {
  return draft.suggestions[field]?.[0]
}

/**
 * Provenance to send when saving: machine values the user left alone count as `accepted`, and
 * fields that only had a pending suggestion are left out.
 */
export function finalizeProvenance(draft: SuggestionDraft): FieldProvenanceMap {
  const result: FieldProvenanceMap = {}
  for (const field of SUGGESTION_FIELDS) {
    const entry = draft.provenance[field]
    if (!entry || entry.outcome === 'suggested') continue
    result[field] = entry.outcome === 'prefilled' ? { ...entry, outcome: 'accepted' } : entry
  }
  return result
}

// ---------------------------------------------------------------------------------------------

function applyCandidate(
  draft: SuggestionDraft,
  candidate: SuggestionCandidate,
  config: MergeConfig,
): SuggestionDraft {
  const { field, source } = candidate
  if (candidate.generation !== draft.generation) return draft
  if (draft.processed.includes(candidate.id)) return draft
  const priority = priorityOf(field, source)
  if (priority < 0 || !Number.isFinite(candidate.confidence)) return draft
  const value = normalizeCandidateValue(field, candidate.value)
  if (value === null) return draft

  const seen: SuggestionDraft = { ...draft, processed: [...draft.processed, candidate.id] }
  const current = draft.values[field]
  const currentSource = current === undefined ? undefined : draft.provenance[field]?.source

  // After the user touched the draft, machine values are only offered, never applied.
  if (draft.locked || currentSource === 'user') return suggest(seen, candidate, value)

  const currentPriority = currentSource === undefined ? -1 : priorityOf(field, currentSource)
  if (priority < currentPriority) return seen

  const qualifies =
    candidate.confidence >= thresholdFor(field, source, config.thresholds) &&
    isOcrDateAllowed(candidate, value, draft.captureTime, config)
  if (!qualifies) return value === current ? seen : suggest(seen, candidate, value)

  if (current === undefined || priority > currentPriority)
    return prefill(seen, candidate, value, priority)
  // Equal priority never replaces the current value; a different value stays available to tap.
  return value === current ? seen : suggest(seen, candidate, value)
}

function normalizeCandidateValue(field: SuggestionField, raw: string): string | null {
  const value = raw.trim()
  if (value === '') return null
  switch (field) {
    case 'amountMinor':
      return /^[1-9]\d*$/.test(value) ? value : null
    case 'occurredAt': {
      const time = Date.parse(value)
      return Number.isNaN(time) ? null : new Date(time).toISOString()
    }
    default:
      return value
  }
}

function isOcrDateAllowed(
  candidate: SuggestionCandidate,
  isoValue: string,
  captureTime: string,
  config: MergeConfig,
): boolean {
  if (candidate.field !== 'occurredAt' || candidate.source !== 'ocr') return true
  const time = Date.parse(isoValue)
  const capture = Date.parse(captureTime)
  const windowMs = (config.ocrDateWindowDays ?? DEFAULT_OCR_DATE_WINDOW_DAYS) * 24 * 60 * 60 * 1000
  return time <= capture && time >= capture - windowMs
}

function provenanceOf(
  source: SuggestionSource,
  extras: { ruleId?: string; choiceId?: string; confidence?: number },
  outcome: FieldOutcome,
): FieldProvenance {
  const result: FieldProvenance = { source, outcome }
  if (extras.ruleId !== undefined) result.ruleId = extras.ruleId
  if (extras.choiceId !== undefined) result.choiceId = extras.choiceId
  if (extras.confidence !== undefined) result.confidence = extras.confidence
  return result
}

function prefill(
  draft: SuggestionDraft,
  candidate: SuggestionCandidate,
  value: string,
  priority: number,
): SuggestionDraft {
  const { field } = candidate
  // Alternatives weaker than the new value are noise; stronger ones stay available to tap.
  const kept = (draft.suggestions[field] ?? []).filter(
    (item) => item.value !== value && priorityOf(field, item.source) > priority,
  )
  return refreshSuggestedProvenance({
    ...draft,
    values: { ...draft.values, [field]: value },
    provenance: {
      ...draft.provenance,
      [field]: provenanceOf(candidate.source, candidate, 'prefilled'),
    },
    suggestions: { ...draft.suggestions, [field]: kept },
  })
}

function suggest(
  draft: SuggestionDraft,
  candidate: SuggestionCandidate,
  value: string,
): SuggestionDraft {
  const { field } = candidate
  if (draft.values[field] === value) return draft
  const priority = priorityOf(field, candidate.source)
  const existing = draft.suggestions[field] ?? []
  const duplicate = existing.find((item) => item.value === value)
  if (duplicate && priorityOf(field, duplicate.source) >= priority) return draft

  const pending: PendingSuggestion = {
    candidateId: candidate.id,
    source: candidate.source,
    value,
    confidence: candidate.confidence,
  }
  if (candidate.ruleId !== undefined) pending.ruleId = candidate.ruleId
  if (candidate.choiceId !== undefined) pending.choiceId = candidate.choiceId

  const list = [...existing.filter((item) => item.value !== value), pending].sort(
    (a, b) =>
      priorityOf(field, b.source) - priorityOf(field, a.source) || b.confidence - a.confidence,
  )
  return refreshSuggestedProvenance({
    ...draft,
    suggestions: { ...draft.suggestions, [field]: list },
  })
}

// An empty field that has a pending suggestion reports it as `suggested`; any other state wins.
function refreshSuggestedProvenance(draft: SuggestionDraft): SuggestionDraft {
  const provenance: FieldProvenanceMap = { ...draft.provenance }
  for (const field of SUGGESTION_FIELDS) {
    if (draft.values[field] !== undefined) continue
    const entry = provenance[field]
    if (entry && entry.outcome !== 'suggested') continue
    const best = draft.suggestions[field]?.[0]
    if (best) provenance[field] = provenanceOf(best.source, best, 'suggested')
    else delete provenance[field]
  }
  return { ...draft, provenance }
}
