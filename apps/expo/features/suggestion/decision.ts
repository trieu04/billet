import type { RuleContext } from './rule-evaluator'
import type { InferenceResult, SuggestionCandidate } from './types'

/** Decision Model category as a merge candidate; empty unless the inference succeeded with one. */
export function toDecisionCandidates(
  result: InferenceResult | null,
  generation: number,
): SuggestionCandidate[] {
  if (result?.status !== 'succeeded' || !result.category) return []
  return [
    {
      id: `decision:${result.id}:categoryId`,
      generation,
      field: 'categoryId',
      value: result.category.id,
      source: 'decision_model',
      confidence: result.category.confidence,
    },
  ]
}

/** Rule context facts that come from the inference; merge in `placeKey` and `merchantKey` yourself. */
export function toRuleContext(
  result: InferenceResult | null,
  extra: Pick<RuleContext, 'placeKey' | 'merchantKey'> = {},
): RuleContext {
  const succeeded = result?.status === 'succeeded' ? result : null
  return {
    choiceId: succeeded?.personalChoice?.id ?? null,
    imageType: succeeded?.imageType?.id ?? null,
    placeKey: extra.placeKey ?? null,
    merchantKey: extra.merchantKey ?? null,
  }
}
