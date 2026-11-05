export type InferenceStatus = 'succeeded' | 'unavailable' | 'disabled'
export type ItemStatus = 'enabled' | 'disabled'

export type Count = { key: string; count: number }
export type UsageTotals = { inputTokens: number; outputTokens: number; costMicroUsd: number }

export type Summary = {
  from: string
  to: string
  timezone: string
  total: number
  byStatus: Count[]
  byReason: Count[]
  byImageType: Count[]
  providerCalls: number
  latencyP50Ms: number | null
  latencyP95Ms: number | null
  usage: UsageTotals
  daily: {
    day: string
    total: number
    succeeded: number
    unavailable: number
    disabled: number
    costMicroUsd: number
  }[]
  byProvider: (UsageTotals & {
    provider: string
    model: string
    total: number
    providerCalls: number
    unavailable: number
  })[]
  fieldOutcomes: { field: string; outcome: string; count: number }[]
}

export type Inference = {
  id: string
  userId: string
  createdAt: string
  provider: string
  model: string
  status: InferenceStatus
  reason: string | null
  latencyMs: number
  providerCalled: boolean
  imageType: { key: string; label: string | null; confidence: number } | null
  category: { kind: 'system' | 'user'; code?: string; name?: string; confidence: number } | null
  personalChoice: { selected: true; confidence: number } | null
}

export type InferencePage = { data: Inference[]; nextCursor: string | null; hasMore: boolean }

export type InferenceChoice = {
  ref: string
  label: string
  description?: string
  selected: boolean
}

/** What the provider was offered; `null` for inferences recorded before it was kept. */
export type InferenceInput = {
  locale: string
  imageTypes: InferenceChoice[]
  categories: InferenceChoice[]
  personal: InferenceChoice[]
}

export type OutputSelection = { ref: string; label: string | null; confidence: number }

export type InferenceOutput = {
  imageType: OutputSelection
  category: OutputSelection | null
  personal: OutputSelection | null
}

export type InferenceDetail = Inference & {
  input?: InferenceInput | null
  output?: InferenceOutput | null
  usage: Partial<UsageTotals> | null
  imageBytes: number
  choiceSetVersion: string
  linkedExpenses: {
    hasPhoto: boolean
    fields: { field: string; source: string; outcome: string; confidence: number | null }[]
  }[]
}

export type ImageType = {
  key: string
  label: string
  description: string | null
  status: ItemStatus
  version: number
}

export type DefaultRule = {
  id: string
  imageType: string
  categoryId: string | null
  categoryName: string | null
  status: ItemStatus
  confidence: number
  version: number
}

export type DecisionImage = {
  maxEdgePx: number
  quality: number
  retryQuality: number
  targetBytes: number
  maxBytes: number
}

export type Catalog = {
  imageTypes: ImageType[]
  defaultRules: DefaultRule[]
  categories: { id: string; code: string; name: string }[]
  thresholds: { ocrAmount: number; personalRule: number; decisionCategory: number }
  decisionImage: DecisionImage
}

export type PlaygroundResult = {
  status: InferenceStatus
  reason?: string
  provider: string
  model: string
  latencyMs: number
  usage: Partial<UsageTotals> | null
  imageBytes: number
  choices: { kind: 'image_type' | 'category'; label: string }[]
  imageType: { label: string; confidence: number } | null
  category: { label: string; confidence: number } | null
  categoryMeetsThreshold: boolean
  defaultRule: { id: string; categoryName: string | null; confidence: number } | null
}
