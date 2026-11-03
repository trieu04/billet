import { describe, expect, it } from 'vitest'
import { toDecisionCandidates, toRuleContext } from './decision'
import {
  applySuggestion,
  bestSuggestion,
  createDraft,
  finalizeProvenance,
  merge,
  userEdit,
} from './merge'
import type { MergeConfig } from './merge'
import { toMerchantKey } from './keys'
import { parseReceipt, toOcrCandidates } from './receipt-parser'
import { CAPTURE_TIME, receiptFixtures } from './receipt-fixtures'
import { evaluateRules } from './rule-evaluator'
import type { InferenceResult, SuggestionRule } from './types'

const config: MergeConfig = {
  thresholds: { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 },
}

const parkingRule: SuggestionRule = {
  id: 'rule-parking-a',
  origin: 'learned',
  conditions: { choiceId: 'choice-parking-a' },
  actions: { amountMinor: '5000', currency: 'VND', categoryId: 'cat-transport' },
  confidence: 0.8, // 4 of 5 previous tickets cost 5.000 VND
  updatedAt: '2026-10-25T00:00:00.000Z',
}

const parkingInference: InferenceResult = {
  id: 'inf-parking',
  status: 'succeeded',
  choiceSetVersion: 'v1',
  imageType: { id: 'parking_ticket', confidence: 0.93 },
  category: null,
  personalChoice: { id: 'choice-parking-a', confidence: 0.85 },
  provider: 'fake',
  model: 'fake',
  latencyMs: 2400,
}

function fixture(name: string) {
  const found = receiptFixtures.find((item) => item.name.startsWith(name))
  if (!found) throw new Error(`missing fixture ${name}`)
  return found
}

describe('photo suggestion pipeline', () => {
  it('parking ticket: OCR has no total, the personal rule fills amount and category', () => {
    const generation = 1
    let draft = createDraft({ generation, captureTime: CAPTURE_TIME })

    // OCR arrives first: header and date only.
    const ocr = toOcrCandidates(
      parseReceipt(fixture('parking ticket').lines, { captureTime: CAPTURE_TIME }),
      generation,
    )
    expect(ocr.map((candidate) => candidate.field).sort()).toEqual(['merchant', 'occurredAt'])
    draft = merge(draft, ocr, config)
    expect(draft.values.merchant).toBe('BÃI GIỮ XE TÒA A')
    expect(draft.values.amountMinor).toBeUndefined()

    // Decision picks the personal choice; the rule supplies what is not printed on the ticket.
    const context = toRuleContext(parkingInference, {
      merchantKey: toMerchantKey(draft.values.merchant),
    })
    const candidates = [
      ...toDecisionCandidates(parkingInference, generation),
      ...evaluateRules([parkingRule], context, { generation }),
    ]
    draft = merge(draft, candidates, config)

    expect(draft.values.amountMinor).toBe('5000')
    expect(draft.values.categoryId).toBe('cat-transport')
    expect(draft.provenance.amountMinor).toMatchObject({
      source: 'personal_rule',
      ruleId: 'rule-parking-a',
      choiceId: 'choice-parking-a',
      outcome: 'prefilled',
    })
    expect(finalizeProvenance(draft).occurredAt?.source).toBe('ocr')
  })

  it('receipt: OCR total wins over a later personal rule amount, rule stays out of the way', () => {
    const generation = 2
    let draft = createDraft({ generation, captureTime: CAPTURE_TIME })
    draft = merge(
      draft,
      toOcrCandidates(
        parseReceipt(fixture('coffee shop with diacritics').lines, { captureTime: CAPTURE_TIME }),
        generation,
      ),
      config,
    )
    expect(draft.values.amountMinor).toBe('58000')
    expect(draft.provenance.amountMinor?.source).toBe('ocr')

    const rule: SuggestionRule = {
      ...parkingRule,
      id: 'coffee',
      conditions: { merchantKey: 'highlands coffee' },
      actions: { amountMinor: '45000', currency: 'VND', categoryId: 'cat-drink' },
    }
    draft = merge(
      draft,
      evaluateRules([rule], { merchantKey: toMerchantKey(draft.values.merchant) }, { generation }),
      config,
    )
    expect(draft.values.amountMinor).toBe('58000')
    expect(draft.values.categoryId).toBe('cat-drink')
  })

  it('late results after the user edited become tap-to-apply suggestions', () => {
    const generation = 3
    let draft = createDraft({ generation, captureTime: CAPTURE_TIME })
    draft = userEdit(draft, 'amountMinor', '4000')

    const candidates = evaluateRules([parkingRule], toRuleContext(parkingInference), { generation })
    draft = merge(draft, candidates, config)
    expect(draft.values.amountMinor).toBe('4000')
    expect(draft.values.categoryId).toBeUndefined()

    const suggestion = bestSuggestion(draft, 'categoryId')
    expect(suggestion?.value).toBe('cat-transport')
    draft = applySuggestion(draft, 'categoryId', suggestion?.candidateId ?? '')
    expect(draft.values.categoryId).toBe('cat-transport')
    expect(finalizeProvenance(draft)).toMatchObject({
      amountMinor: { source: 'user', outcome: 'entered' },
      categoryId: { source: 'personal_rule', outcome: 'accepted', ruleId: 'rule-parking-a' },
    })
  })

  it('results from a retaken photo (older generation) are ignored', () => {
    const draft = createDraft({ generation: 5, captureTime: CAPTURE_TIME })
    const stale = evaluateRules([parkingRule], toRuleContext(parkingInference), { generation: 4 })
    expect(merge(draft, stale, config)).toBe(draft)
  })
})
