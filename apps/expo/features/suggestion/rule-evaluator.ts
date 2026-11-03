import type {
  RuleActions,
  RuleConditions,
  RuleOrigin,
  SuggestionCandidate,
  SuggestionField,
  SuggestionRule,
} from './types'

// Evaluates expense rules (data, not code) against what is known about the photo and returns merge
// candidates. Pure: the caller re-runs it whenever the context changes.

/** What is known about the current photo; absent values never match a condition. */
export type RuleContext = {
  choiceId?: string | null
  imageType?: string | null
  placeKey?: string | null
  merchantKey?: string | null
}

export type RuleEvaluationOptions = {
  generation: number
  /** Only amount rules in this currency apply. Defaults to `VND`. */
  currency?: string
}

export const DEFAULT_RULE_CURRENCY = 'VND'

const CONDITION_KEYS = ['choiceId', 'imageType', 'placeKey', 'merchantKey'] as const

const ORIGIN_RANK: Record<RuleOrigin, number> = { user: 3, learned: 2, default: 1 }

// Default rules only carry a category; merge would reject their other fields anyway.
const RULE_FIELDS: readonly SuggestionField[] = ['amountMinor', 'categoryId', 'merchant']

export function countConditions(conditions: RuleConditions): number {
  return CONDITION_KEYS.filter((key) => conditions[key] !== undefined).length
}

export function ruleMatches(rule: SuggestionRule, context: RuleContext): boolean {
  if (countConditions(rule.conditions) === 0) return false
  return CONDITION_KEYS.every((key) => {
    const expected = rule.conditions[key]
    return expected === undefined || context[key] === expected
  })
}

/** Positive when `a` wins over `b`: more conditions, origin, confidence, then newer. */
export function compareRules(a: SuggestionRule, b: SuggestionRule): number {
  return (
    countConditions(a.conditions) - countConditions(b.conditions) ||
    ORIGIN_RANK[a.origin] - ORIGIN_RANK[b.origin] ||
    a.confidence - b.confidence ||
    timeOf(a.updatedAt) - timeOf(b.updatedAt) ||
    // Stable final tie-break so the result does not depend on input order.
    (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  )
}

function timeOf(iso: string): number {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? 0 : time
}

function actionValue(
  rule: SuggestionRule,
  field: SuggestionField,
  currency: string,
): string | undefined {
  const actions: RuleActions = rule.actions
  switch (field) {
    case 'amountMinor':
      if (rule.origin === 'default' || actions.currency !== currency) return undefined
      return actions.amountMinor && /^[1-9]\d*$/.test(actions.amountMinor)
        ? actions.amountMinor
        : undefined
    case 'categoryId':
      return actions.categoryId || undefined
    case 'merchant':
      return rule.origin === 'default' ? undefined : actions.merchant?.trim() || undefined
    case 'occurredAt':
      return undefined
  }
}

/** The winning rule per field among the rules that match the context. */
export function evaluateRules(
  rules: readonly SuggestionRule[],
  context: RuleContext,
  options: RuleEvaluationOptions,
): SuggestionCandidate[] {
  const currency = options.currency ?? DEFAULT_RULE_CURRENCY
  const matched = rules.filter((rule) => ruleMatches(rule, context))
  const candidates: SuggestionCandidate[] = []

  for (const field of RULE_FIELDS) {
    let winner: SuggestionRule | undefined
    let value: string | undefined
    for (const rule of matched) {
      const ruleValue = actionValue(rule, field, currency)
      if (ruleValue === undefined) continue
      if (!winner || compareRules(rule, winner) > 0) {
        winner = rule
        value = ruleValue
      }
    }
    if (!winner || value === undefined) continue
    const candidate: SuggestionCandidate = {
      id: `rule:${winner.id}:${field}`,
      generation: options.generation,
      field,
      value,
      source: winner.origin === 'default' ? 'default_rule' : 'personal_rule',
      confidence: winner.confidence,
      ruleId: winner.id,
    }
    if (winner.conditions.choiceId !== undefined) candidate.choiceId = winner.conditions.choiceId
    candidates.push(candidate)
  }
  return candidates
}
