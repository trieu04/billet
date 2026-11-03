import type {
  Category,
  DecisionChoice,
  ExpenseRule,
  ExpenseRuleActions,
  ExpenseRuleConditions,
} from '@/features/api/types'

// Pure helpers for the “Gợi ý tự động” settings screen.

export const IMAGE_TYPE_LABELS: Record<string, string> = {
  receipt: 'Hóa đơn',
  invoice: 'Hóa đơn VAT',
  parking_ticket: 'Vé gửi xe',
  transport_ticket: 'Vé di chuyển',
  payment_screenshot: 'Ảnh chụp thanh toán',
  food: 'Đồ ăn',
  product: 'Sản phẩm',
  other: 'Khác',
}

export function originLabel(origin: DecisionChoice['origin'] | ExpenseRule['origin']): string {
  switch (origin) {
    case 'learned':
      return 'Học từ lịch sử'
    case 'user':
      return 'Bạn tạo'
    default:
      return 'Mặc định'
  }
}

/** Label of an image type key, from the server list when available. */
export function imageTypeLabel(key: string, imageTypes: readonly DecisionChoice[] = []): string {
  return imageTypes.find((item) => item.key === key)?.label ?? IMAGE_TYPE_LABELS[key] ?? key
}

export function formatAmount(amountMinor: string, currency = 'VND'): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(
      Number(amountMinor),
    )
  } catch {
    return `${amountMinor} ${currency}`
  }
}

export function describeConditions(
  conditions: ExpenseRuleConditions,
  lookup: { choices: readonly DecisionChoice[]; imageTypes: readonly DecisionChoice[] },
): string {
  const parts: string[] = []
  if (conditions.choiceId) {
    const choice = lookup.choices.find((item) => item.id === conditions.choiceId)
    parts.push(choice ? `“${choice.label}”` : 'Lựa chọn đã xóa')
  }
  if (conditions.imageType) parts.push(imageTypeLabel(conditions.imageType, lookup.imageTypes))
  if (conditions.merchantKey) parts.push(`cửa hàng “${conditions.merchantKey}”`)
  if (conditions.placeKey) parts.push('tại một địa điểm')
  return parts.length > 0 ? `Khi ${parts.join(' · ')}` : 'Không có điều kiện'
}

export function describeActions(
  actions: ExpenseRuleActions,
  categories: readonly Category[],
): string {
  const parts: string[] = []
  if (actions.amountMinor) parts.push(formatAmount(actions.amountMinor, actions.currency ?? 'VND'))
  if (actions.categoryId) {
    parts.push(categories.find((item) => item.id === actions.categoryId)?.name ?? 'Danh mục khác')
  }
  if (actions.merchant) parts.push(actions.merchant)
  return parts.length > 0 ? `Điền ${parts.join(' · ')}` : 'Không điền gì'
}

export type RuleForm = {
  choiceId?: string
  imageType?: string
  merchantKey: string
  /** Kept from the rule being edited; the place key cannot be typed. */
  placeKey?: string
  amount: string
  categoryId?: string
  merchant: string
}

export function ruleToForm(rule: ExpenseRule | null): RuleForm {
  return {
    choiceId: rule?.conditions.choiceId,
    imageType: rule?.conditions.imageType,
    merchantKey: rule?.conditions.merchantKey ?? '',
    placeKey: rule?.conditions.placeKey,
    amount: rule?.actions.amountMinor ?? '',
    categoryId: rule?.actions.categoryId,
    merchant: rule?.actions.merchant ?? '',
  }
}

/** Validated request body, or an error message for the form. */
export function formToRuleInput(
  form: RuleForm,
  currency = 'VND',
):
  | { ok: true; conditions: ExpenseRuleConditions; actions: ExpenseRuleActions }
  | { ok: false; error: string } {
  const conditions: ExpenseRuleConditions = {}
  if (form.choiceId) conditions.choiceId = form.choiceId
  if (form.imageType) conditions.imageType = form.imageType
  if (form.merchantKey.trim()) conditions.merchantKey = form.merchantKey.trim()
  if (form.placeKey) conditions.placeKey = form.placeKey
  if (Object.keys(conditions).length === 0)
    return { ok: false, error: 'Chọn ít nhất một điều kiện.' }

  const actions: ExpenseRuleActions = {}
  const amount = form.amount.trim().replace(/[.,\s]/g, '')
  if (amount) {
    if (!/^[1-9]\d{0,17}$/.test(amount))
      return { ok: false, error: 'Số tiền chỉ gồm chữ số và lớn hơn 0.' }
    actions.amountMinor = amount
    actions.currency = currency
  }
  if (form.categoryId) actions.categoryId = form.categoryId
  if (form.merchant.trim()) actions.merchant = form.merchant.trim()
  if (Object.keys(actions).length === 0)
    return { ok: false, error: 'Chọn ít nhất một giá trị để điền.' }
  return { ok: true, conditions, actions }
}
