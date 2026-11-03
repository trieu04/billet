import type { SuggestionDraft } from './merge'
import type { FieldProvenance, SuggestionChoice, SuggestionField, SuggestionSource } from './types'

// User-facing labels for where a machine value came from ("nguồn gợi ý").

/** Label shown next to a machine value; `null` for the user's own values and the capture time. */
export function describeSource(
  entry: { source: SuggestionSource; choiceId?: string } | undefined,
  choices: readonly SuggestionChoice[],
): string | null {
  switch (entry?.source) {
    case 'ocr':
      return 'Từ hóa đơn'
    case 'personal_rule': {
      const label = choices.find((choice) => choice.id === entry.choiceId)?.label
      return label ? `Như lần trước: ${label}` : 'Như lần trước'
    }
    case 'default_rule':
      return 'Gợi ý mặc định'
    case 'decision_model':
      return 'Gợi ý'
    default:
      return null
  }
}

/** Provenance of a field whose current value was filled (or accepted) from a machine source. */
export function machineProvenance(
  draft: SuggestionDraft,
  field: SuggestionField,
): FieldProvenance | undefined {
  const entry = draft.provenance[field]
  if (draft.values[field] === undefined || !entry) return undefined
  if (entry.source === 'user' || entry.source === 'capture_time') return undefined
  return entry.outcome === 'prefilled' || entry.outcome === 'accepted' ? entry : undefined
}
