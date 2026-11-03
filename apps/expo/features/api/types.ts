export type User = {
  id: string
  username: string
  email: string
  displayName: string
}

export type AuthResponse = {
  accessToken: string
  refreshToken?: string
  tokenType: 'Bearer'
  expiresIn: number
  user: User
  requiresMfa: boolean
}

export type Category = {
  id: string
  code: string
  name: string
  color: string
  icon: string
  sortOrder: number
  usageCount: number
  isCustom: boolean
}

export type Expense = {
  id: string
  amountMinor: string
  currency: string
  occurredAt: string
  occurredTimezone: string
  categoryId: string
  mediaAssetId: string | null
  caption: string | null
  merchant: string | null
  location: string | null
  inferenceId?: string | null
  imageType?: string | null
  personalChoiceId?: string | null
  placeKey?: string | null
  merchantKey?: string | null
  fieldProvenance?: Record<string, ExpenseFieldProvenance>
  version: number
  createdAt: string
  updatedAt: string
}

/** One `fieldProvenance` entry of an expense (server `FieldProvenanceDto`). */
export type ExpenseFieldProvenance = {
  source: 'user' | 'ocr' | 'personal_rule' | 'default_rule' | 'decision_model' | 'capture_time'
  ruleId?: string
  choiceId?: string
  confidence?: number
  outcome: 'accepted' | 'edited' | 'entered' | 'cleared' | 'suggested'
}

export type ExpenseList = {
  data: Expense[]
  nextCursor: string | null
  totals: { currency: string; totalMinor: string; count: number }[]
}

export type Calendar = {
  month: string
  currency: string
  totalMinor: string
  count: number
  days: {
    date: string
    totalMinor: string
    count: number
    representativeMediaId: string | null
    mediaAssetIds: string[]
  }[]
}

export type CalendarHistory = {
  months: Calendar[]
}

export type SpendingReport = {
  currency: string
  totalMinor: string
  count: number
  comparison: { changePercent: number | null }
  series: { bucket: string; totalMinor: string; count: number }[]
  categories: {
    categoryId: string
    code: string
    name: string
    totalMinor: string
    count: number
    sharePercent: number | null
  }[]
  insights: { type: 'highest_spend_day'; date: string; amountMinor: string }[]
}

export type Settings = {
  id: string
  defaultCurrency: string
  timezone: string
  locale: string
  appearance: 'system' | 'light' | 'dark'
  reminderEnabled: boolean
  reminderTime: string | null
  suggestionsEnabled: boolean
  ruleLearningEnabled: boolean
  suggestionLocationEnabled: boolean
}

export type SettingsOptions = {
  currencies: string[]
  appearances: Settings['appearance'][]
}

export type Profile = User & {
  expenseCount: number
  settings: Settings
}

export type Budget = {
  month: string
  currency: string
  isSet: boolean
  limitMinor: string | null
  spentMinor: string
  remainingMinor: string | null
}

export type ExportJob = {
  id: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  from: string | null
  to: string | null
  currency: string | null
  snapshotAt: string | null
  downloadExpiresAt: string | null
  failureReason: string | null
  createdAt: string
}

export type MediaReservation = {
  id: string
  mimeType: string
  sizeBytes: string
  status: string
  uploadUrl: string
}

export type SuggestionItemStatus = 'enabled' | 'disabled'

/** `GET /decision-choices` item (server `DecisionChoiceResponseDto`). */
export type DecisionChoice = {
  id: string
  kind: 'image_type' | 'personal'
  key: string | null
  label: string
  description: string | null
  imageType: string | null
  placeKey: string | null
  merchantKey: string | null
  origin: 'system' | 'learned' | 'user'
  status: SuggestionItemStatus
  support: number
  lastSelectedAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type DecisionChoiceInput = {
  label?: string
  description?: string | null
  imageType?: string | null
  placeKey?: string | null
  merchantKey?: string | null
  status?: SuggestionItemStatus
}

export type ExpenseRuleConditions = {
  choiceId?: string
  imageType?: string
  placeKey?: string
  merchantKey?: string
}

export type ExpenseRuleActions = {
  amountMinor?: string
  currency?: string
  categoryId?: string
  merchant?: string
}

/** `GET /expense-rules` item (server `ExpenseRuleResponseDto`). */
export type ExpenseRule = {
  id: string
  origin: 'default' | 'learned' | 'user'
  status: SuggestionItemStatus
  conditions: ExpenseRuleConditions
  actions: ExpenseRuleActions
  currency: string | null
  confidence: number
  support: number
  lastUsedAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type ExpenseRuleInput = {
  conditions?: ExpenseRuleConditions
  actions?: ExpenseRuleActions
  status?: SuggestionItemStatus
}
