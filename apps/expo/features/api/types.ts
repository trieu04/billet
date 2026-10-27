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
}

export type Expense = {
  id: string
  amountMinor: string
  currency: string
  occurredAt: string
  occurredTimezone: string
  categoryId: string
  mediaAssetId: string | null
  recognitionJobId: string | null
  caption: string | null
  merchant: string | null
  location: string | null
  version: number
  createdAt: string
  updatedAt: string
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
