import {
  FIELD_OUTCOMES,
  SUGGESTION_FIELDS,
  SUGGESTION_SOURCES,
  type FieldOutcome,
  type SuggestionField,
  type SuggestionSource,
} from '../constants'

export interface FieldProvenance {
  source: SuggestionSource
  ruleId?: string
  choiceId?: string
  confidence?: number
  outcome: FieldOutcome
}

export type FieldProvenanceMap = Partial<Record<SuggestionField, FieldProvenance>>

const BIGINT_ID = /^[1-9]\d{0,18}$/
const ENTRY_KEYS = new Set(['source', 'ruleId', 'choiceId', 'confidence', 'outcome'])

/**
 * Narrow untrusted `fieldProvenance` input. Returns the normalized map, or a list of problems
 * suitable for a validation error message (never echoing values).
 */
export function parseFieldProvenance(
  value: unknown,
): { ok: true; value: FieldProvenanceMap } | { ok: false; errors: string[] } {
  if (!isRecord(value)) return { ok: false, errors: ['fieldProvenance must be an object'] }
  const errors: string[] = []
  const result: FieldProvenanceMap = {}
  for (const [field, raw] of Object.entries(value)) {
    if (!(SUGGESTION_FIELDS as readonly string[]).includes(field)) {
      errors.push(`fieldProvenance has an unknown field ${JSON.stringify(field.slice(0, 40))}`)
      continue
    }
    const path = `fieldProvenance.${field}`
    if (!isRecord(raw)) {
      errors.push(`${path} must be an object`)
      continue
    }
    for (const key of Object.keys(raw))
      if (!ENTRY_KEYS.has(key)) errors.push(`${path} has an unknown property`)
    const { source, outcome, ruleId, choiceId, confidence } = raw
    if (typeof source !== 'string' || !(SUGGESTION_SOURCES as readonly string[]).includes(source))
      errors.push(`${path}.source must be one of ${SUGGESTION_SOURCES.join(', ')}`)
    if (typeof outcome !== 'string' || !(FIELD_OUTCOMES as readonly string[]).includes(outcome))
      errors.push(`${path}.outcome must be one of ${FIELD_OUTCOMES.join(', ')}`)
    if (ruleId !== undefined && (typeof ruleId !== 'string' || !BIGINT_ID.test(ruleId)))
      errors.push(`${path}.ruleId must be a positive integer string`)
    if (choiceId !== undefined && (typeof choiceId !== 'string' || !BIGINT_ID.test(choiceId)))
      errors.push(`${path}.choiceId must be a positive integer string`)
    if (
      confidence !== undefined &&
      (typeof confidence !== 'number' ||
        !Number.isFinite(confidence) ||
        confidence < 0 ||
        confidence > 1)
    )
      errors.push(`${path}.confidence must be a number between 0 and 1`)
    if (errors.length > 0) continue
    const entry: FieldProvenance = {
      source: source as SuggestionSource,
      outcome: outcome as FieldOutcome,
    }
    if (typeof ruleId === 'string') entry.ruleId = ruleId
    if (typeof choiceId === 'string') entry.choiceId = choiceId
    if (typeof confidence === 'number') entry.confidence = confidence
    result[field as SuggestionField] = entry
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: result }
}

/** Legacy `fieldSources` (field → source) derived from provenance. */
export function fieldSourcesFromProvenance(provenance: FieldProvenanceMap): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of SUGGESTION_FIELDS) {
    const entry = provenance[field]
    if (entry) result[field] = entry.source
  }
  return result
}

/** Rule ids whose value the user kept (outcome `accepted`). */
export function acceptedRuleIds(provenance: FieldProvenanceMap): string[] {
  const ids = new Set<string>()
  for (const field of SUGGESTION_FIELDS) {
    const entry = provenance[field]
    if (entry?.ruleId && entry.outcome === 'accepted') ids.add(entry.ruleId)
  }
  return [...ids]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
