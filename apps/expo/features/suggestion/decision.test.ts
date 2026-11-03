import { describe, expect, it } from 'vitest'
import { toDecisionCandidates, toRuleContext } from './decision'
import type { InferenceResult } from './types'

const base: InferenceResult = {
  id: 'inf-1',
  status: 'succeeded',
  choiceSetVersion: 'v1',
  imageType: { id: 'parking_ticket', confidence: 0.93 },
  category: { id: 'cat-transport', confidence: 0.7 },
  personalChoice: { id: 'choice-a', confidence: 0.85 },
  provider: 'fake',
  model: 'fake',
  latencyMs: 1800,
}

describe('toDecisionCandidates', () => {
  it('maps the category to a decision_model candidate', () => {
    expect(toDecisionCandidates(base, 2)).toEqual([
      {
        id: 'decision:inf-1:categoryId',
        generation: 2,
        field: 'categoryId',
        value: 'cat-transport',
        source: 'decision_model',
        confidence: 0.7,
      },
    ])
  })

  it('returns nothing without a category or a successful inference', () => {
    expect(toDecisionCandidates({ ...base, category: null }, 1)).toEqual([])
    expect(toDecisionCandidates({ ...base, status: 'unavailable', reason: 'timeout' }, 1)).toEqual(
      [],
    )
    expect(toDecisionCandidates({ ...base, status: 'disabled' }, 1)).toEqual([])
    expect(toDecisionCandidates(null, 1)).toEqual([])
  })
})

describe('toRuleContext', () => {
  it('combines the inference with local keys', () => {
    expect(toRuleContext(base, { placeKey: 'w3gvk1c', merchantKey: 'bai giu xe' })).toEqual({
      choiceId: 'choice-a',
      imageType: 'parking_ticket',
      placeKey: 'w3gvk1c',
      merchantKey: 'bai giu xe',
    })
  })

  it('keeps local keys when the inference is unavailable', () => {
    expect(toRuleContext({ ...base, status: 'unavailable' }, { merchantKey: 'x' })).toEqual({
      choiceId: null,
      imageType: null,
      placeKey: null,
      merchantKey: 'x',
    })
    expect(toRuleContext(null)).toEqual({
      choiceId: null,
      imageType: null,
      placeKey: null,
      merchantKey: null,
    })
  })
})
