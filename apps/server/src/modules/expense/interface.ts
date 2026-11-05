/** Inferences whose linked expenses are counted; `from` is inclusive and `to` exclusive. */
export interface InferenceOutcomeFilter {
  from: Date
  to: Date
  provider?: string
  model?: string
}

export interface FieldOutcomeCount {
  field: string
  outcome: string
  count: number
}

/** De-identified provenance of one expense linked to an inference. */
export interface LinkedExpenseFields {
  hasPhoto: boolean
  fields: {
    field: string
    source: string
    outcome: string
    confidence: number | null
  }[]
}
