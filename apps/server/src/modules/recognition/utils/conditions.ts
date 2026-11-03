import { createHash } from 'node:crypto'

/** AND over the present conditions; at least one must be set. */
export interface RuleConditions {
  choiceId?: string
  imageType?: string
  placeKey?: string
  merchantKey?: string
}

/** Actions of a rule. `amountMinor` requires `currency`; default rules carry a category only. */
export interface RuleActions {
  amountMinor?: string
  currency?: string
  categoryId?: string
  merchant?: string
}

export const CONDITION_KEYS = ['choiceId', 'imageType', 'placeKey', 'merchantKey'] as const

export function countConditions(conditions: RuleConditions): number {
  return CONDITION_KEYS.filter((key) => conditions[key] !== undefined).length
}

/** Conditions with keys in a fixed order and absent values dropped. */
export function canonicalConditions(conditions: RuleConditions): RuleConditions {
  const result: RuleConditions = {}
  for (const key of CONDITION_KEYS) {
    const value = conditions[key]
    if (value !== undefined && value !== null && value !== '') result[key] = value
  }
  return result
}

/**
 * Stable hash of a condition set; one rule per user and condition set. The seed migration
 * reproduces this for system default rules, so keep the format unchanged.
 */
export function conditionsHash(conditions: RuleConditions): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalConditions(conditions)))
    .digest('hex')
}
