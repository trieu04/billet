import { DAY_MS, SUPPRESSION_DAYS } from '../constants'
import { canonicalConditions, type RuleActions, type RuleConditions } from './conditions'

// Pure learning core ("Rule và học" in docs/technical-design/03-photo-expense-suggestion.md).
// LearnerService loads the evidence and existing items, calls these functions and applies the
// returned actions. Nothing here touches the database or the clock.

export const LEARNING_WINDOW_DAYS = 180
export const LEARNING_MAX_EVIDENCE = 10
export const LEARNING_HALF_LIFE_DAYS = 60
export const LEARNING_MIN_SUPPORT = 3
export const LEARNING_DOMINANT_SHARE = 0.6
/** A learned rule whose amount falls below this share is disabled instead of lowered. */
export const LEARNING_DISABLE_BELOW_SHARE = 0.3
export const CHOICE_LABEL_MAX_LENGTH = 80

export type LearningKeyKind =
  | 'personal_choice'
  | 'image_type_place'
  | 'merchant'
  | 'image_type_merchant'

export interface LearningKey {
  kind: LearningKeyKind
  conditions: RuleConditions
}

/** Normalized learning features of one saved expense. */
export interface LearningFeatures {
  personalChoiceId: string | null
  imageType: string | null
  placeKey: string | null
  merchantKey: string | null
}

export interface EvidenceExpense {
  amountMinor: string
  currency: string
  occurredAt: Date
  categoryId: string
  merchant: string | null
  location: string | null
}

export type ItemOrigin = 'system' | 'default' | 'learned' | 'user'

export interface ExistingRule {
  id: string
  origin: ItemOrigin
  status: 'enabled' | 'disabled'
  deleted: boolean
  suppressedUntil: Date | null
  actions: RuleActions
  currency: string | null
  confidence: number
}

export interface ExistingChoice {
  id: string
  origin: ItemOrigin
  deleted: boolean
  suppressedUntil: Date | null
}

export interface KeyLearningInput {
  key: LearningKey
  currency: string
  /** Matching expenses; filtered again here for currency, window and count. */
  evidence: readonly EvidenceExpense[]
  now: Date
  rule: ExistingRule | null
  /**
   * For `personal_choice` keys: the choice itself (rules are only learned while it exists). For
   * `image_type_*` keys: the personal choice with exactly that image type and place/merchant key.
   */
  choice: ExistingChoice | null
  /** Display label of the key's image type, used to name a learned choice. */
  imageTypeLabel?: string
}

export type LearningAction =
  | {
      type: 'create_choice'
      imageType: string
      placeKey: string | null
      merchantKey: string | null
      label: string
      support: number
    }
  | { type: 'update_choice_support'; choiceId: string; support: number }
  | {
      type: 'upsert_rule'
      /** Existing learned row (possibly soft-deleted with an expired suppression) or null to insert. */
      ruleId: string | null
      conditions: RuleConditions
      actions: RuleActions
      currency: string
      confidence: number
      support: number
    }
  | {
      type: 'lower_rule'
      ruleId: string
      confidence: number
      support: number
      status: 'enabled' | 'disabled'
    }

/** Learning keys of an expense: `personalChoiceId`, `imageType+placeKey`, `merchantKey`, `imageType+merchantKey`. */
export function learningKeys(features: LearningFeatures): LearningKey[] {
  const keys: LearningKey[] = []
  if (features.personalChoiceId)
    keys.push({
      kind: 'personal_choice',
      conditions: { choiceId: features.personalChoiceId },
    })
  if (features.imageType && features.placeKey)
    keys.push({
      kind: 'image_type_place',
      conditions: { imageType: features.imageType, placeKey: features.placeKey },
    })
  if (features.merchantKey)
    keys.push({ kind: 'merchant', conditions: { merchantKey: features.merchantKey } })
  if (features.imageType && features.merchantKey)
    keys.push({
      kind: 'image_type_merchant',
      conditions: { imageType: features.imageType, merchantKey: features.merchantKey },
    })
  return keys.map((key) => ({ ...key, conditions: canonicalConditions(key.conditions) }))
}

/** Weight halves every {@link LEARNING_HALF_LIFE_DAYS}; future dates count as now. */
export function evidenceWeight(occurredAt: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - occurredAt.getTime()) / DAY_MS)
  return 0.5 ** (ageDays / LEARNING_HALF_LIFE_DAYS)
}

/** Most recent valid evidence in the currency: within the window, at most the evidence cap. */
export function selectEvidence(
  evidence: readonly EvidenceExpense[],
  currency: string,
  now: Date,
): EvidenceExpense[] {
  const since = now.getTime() - LEARNING_WINDOW_DAYS * DAY_MS
  return evidence
    .filter((expense) => expense.currency === currency && expense.occurredAt.getTime() >= since)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, LEARNING_MAX_EVIDENCE)
}

export interface WeightedValue {
  value: string
  share: number
  count: number
}

/** Weighted distribution of a value, highest share first (ties: more expenses, then newest). */
export function weightedShares(
  evidence: readonly EvidenceExpense[],
  now: Date,
  pick: (expense: EvidenceExpense) => string | null,
): WeightedValue[] {
  let total = 0
  const groups = new Map<string, { weight: number; count: number; newest: number }>()
  for (const expense of evidence) {
    const weight = evidenceWeight(expense.occurredAt, now)
    total += weight
    const value = pick(expense)
    if (value === null) continue
    const group = groups.get(value) ?? { weight: 0, count: 0, newest: 0 }
    group.weight += weight
    group.count += 1
    group.newest = Math.max(group.newest, expense.occurredAt.getTime())
    groups.set(value, group)
  }
  if (total === 0) return []
  return [...groups.entries()]
    .sort(([, a], [, b]) => b.weight - a.weight || b.count - a.count || b.newest - a.newest)
    .map(([value, group]) => ({ value, share: group.weight / total, count: group.count }))
}

/** True while a deleted item still blocks the learner. */
export function isSuppressed(item: { suppressedUntil: Date | null } | null, now: Date): boolean {
  return item?.suppressedUntil != null && item.suppressedUntil.getTime() > now.getTime()
}

export function suppressionEnd(now: Date): Date {
  return new Date(now.getTime() + SUPPRESSION_DAYS * DAY_MS)
}

/** Plan the learner's changes for one key. Never returns changes to `user` or `default` items. */
export function planKeyLearning(input: KeyLearningInput): LearningAction[] {
  const { key, now } = input
  const evidence = selectEvidence(input.evidence, input.currency, now)
  const actions: LearningAction[] = []

  if (key.kind === 'image_type_place' || key.kind === 'image_type_merchant') {
    const choiceAction = planChoice(input, evidence)
    if (choiceAction) actions.push(choiceAction)
  }

  // Rules keyed by a personal choice only make sense while that choice exists.
  if (key.kind === 'personal_choice' && (!input.choice || input.choice.deleted)) return actions

  const ruleAction = planRule(input, evidence)
  if (ruleAction) actions.push(ruleAction)
  return actions
}

function planChoice(
  input: KeyLearningInput,
  evidence: readonly EvidenceExpense[],
): LearningAction | null {
  const { choice, now, key } = input
  if (evidence.length < LEARNING_MIN_SUPPORT) return null
  if (choice && !choice.deleted) {
    return choice.origin === 'learned'
      ? { type: 'update_choice_support', choiceId: choice.id, support: evidence.length }
      : null
  }
  if (isSuppressed(choice, now)) return null
  const imageType = key.conditions.imageType
  if (!imageType) return null
  return {
    type: 'create_choice',
    imageType,
    placeKey: key.conditions.placeKey ?? null,
    merchantKey: key.conditions.merchantKey ?? null,
    label: learnedChoiceLabel(input, evidence),
    support: evidence.length,
  }
}

function planRule(
  input: KeyLearningInput,
  evidence: readonly EvidenceExpense[],
): LearningAction | null {
  const { rule, now, currency } = input
  if (rule && rule.origin !== 'learned') return null
  if (rule?.deleted && isSuppressed(rule, now)) return null

  const amounts = weightedShares(evidence, now, (expense) => expense.amountMinor)
  const dominant = amounts[0]
  if (
    dominant &&
    evidence.length >= LEARNING_MIN_SUPPORT &&
    dominant.count >= LEARNING_MIN_SUPPORT &&
    dominant.share >= LEARNING_DOMINANT_SHARE
  ) {
    const actions: RuleActions = { amountMinor: dominant.value, currency }
    const category = dominantValue(evidence, now, (expense) => expense.categoryId)
    if (category) actions.categoryId = category
    const merchant = dominantValue(evidence, now, (expense) => expense.merchant?.trim() || null)
    if (merchant) actions.merchant = merchant
    return {
      type: 'upsert_rule',
      ruleId: rule?.id ?? null,
      conditions: input.key.conditions,
      actions,
      currency,
      confidence: round(dominant.share),
      support: dominant.count,
    }
  }

  // Not (or no longer) dominant: lower or disable an active learned rule in this currency.
  if (!rule || rule.deleted || rule.currency !== currency) return null
  const current = amounts.find((entry) => entry.value === rule.actions.amountMinor)
  const share = round(current?.share ?? 0)
  const status = share < LEARNING_DISABLE_BELOW_SHARE ? 'disabled' : rule.status
  if (share === rule.confidence && status === rule.status) return null
  return {
    type: 'lower_rule',
    ruleId: rule.id,
    confidence: share,
    support: current?.count ?? 0,
    status,
  }
}

function dominantValue(
  evidence: readonly EvidenceExpense[],
  now: Date,
  pick: (expense: EvidenceExpense) => string | null,
): string | null {
  const top = weightedShares(evidence, now, pick)[0]
  return top && top.share >= LEARNING_DOMINANT_SHARE ? top.value : null
}

/** "Gửi xe – Tòa A": image type label plus the most common merchant (or location) text. */
function learnedChoiceLabel(input: KeyLearningInput, evidence: readonly EvidenceExpense[]): string {
  const typeLabel = input.imageTypeLabel ?? input.key.conditions.imageType ?? ''
  const place =
    mostCommon(evidence.map((expense) => expense.merchant?.trim() || null)) ??
    mostCommon(evidence.map((expense) => expense.location?.trim() || null)) ??
    input.key.conditions.merchantKey ??
    null
  const label = place ? `${typeLabel} – ${place}` : typeLabel
  return label.slice(0, CHOICE_LABEL_MAX_LENGTH).trim()
}

function mostCommon(values: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>()
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts)
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  return best
}

export interface EvictionCandidate {
  id: string
  origin: ItemOrigin
  /** `lastSelectedAt` for choices, `lastUsedAt` for rules. */
  lastUsedAt: Date | null
  support: number
  createdAt: Date
}

/**
 * Learned items to remove so that at most `cap` items remain: least recently used first, then
 * least supported, then oldest. `user` items are never evicted, so the result can fall short.
 */
export function selectEvictions(items: readonly EvictionCandidate[], cap: number): string[] {
  const excess = items.length - cap
  if (excess <= 0) return []
  return items
    .filter((item) => item.origin === 'learned')
    .sort(
      (a, b) =>
        (a.lastUsedAt ?? a.createdAt).getTime() - (b.lastUsedAt ?? b.createdAt).getTime() ||
        a.support - b.support ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    )
    .slice(0, excess)
    .map((item) => item.id)
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000
}
