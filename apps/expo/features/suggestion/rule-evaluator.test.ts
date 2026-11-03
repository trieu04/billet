import { describe, expect, it } from 'vitest'
import { compareRules, countConditions, evaluateRules, ruleMatches } from './rule-evaluator'
import type { SuggestionRule } from './types'

function rule(overrides: Partial<SuggestionRule> & Pick<SuggestionRule, 'id'>): SuggestionRule {
  return {
    origin: 'learned',
    conditions: { choiceId: 'choice-a' },
    actions: { amountMinor: '5000', currency: 'VND', categoryId: 'transport' },
    confidence: 0.8,
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

const options = { generation: 4 }

describe('ruleMatches', () => {
  it('requires every present condition to equal the context value', () => {
    const r = rule({ id: 'r', conditions: { imageType: 'parking_ticket', placeKey: 'w3gvk1c' } })
    expect(ruleMatches(r, { imageType: 'parking_ticket', placeKey: 'w3gvk1c' })).toBe(true)
    expect(ruleMatches(r, { imageType: 'parking_ticket', placeKey: 'w3gvk1d' })).toBe(false)
    expect(ruleMatches(r, { imageType: 'parking_ticket' })).toBe(false)
    expect(ruleMatches(r, { imageType: 'parking_ticket', placeKey: null })).toBe(false)
  })

  it('never matches a rule without conditions', () => {
    expect(ruleMatches(rule({ id: 'r', conditions: {} }), { choiceId: 'choice-a' })).toBe(false)
    expect(countConditions({})).toBe(0)
    expect(countConditions({ choiceId: 'a', merchantKey: 'b' })).toBe(2)
  })
})

describe('evaluateRules', () => {
  it('returns merge candidates for the winning rule per field', () => {
    const candidates = evaluateRules([rule({ id: 'r1' })], { choiceId: 'choice-a' }, options)
    expect(candidates).toEqual([
      {
        id: 'rule:r1:amountMinor',
        generation: 4,
        field: 'amountMinor',
        value: '5000',
        source: 'personal_rule',
        confidence: 0.8,
        ruleId: 'r1',
        choiceId: 'choice-a',
      },
      {
        id: 'rule:r1:categoryId',
        generation: 4,
        field: 'categoryId',
        value: 'transport',
        source: 'personal_rule',
        confidence: 0.8,
        ruleId: 'r1',
        choiceId: 'choice-a',
      },
    ])
  })

  it('returns nothing when no rule matches', () => {
    expect(evaluateRules([rule({ id: 'r1' })], { choiceId: 'other' }, options)).toEqual([])
    expect(evaluateRules([], { choiceId: 'choice-a' }, options)).toEqual([])
  })

  it('prefers the rule with more matched conditions', () => {
    const general = rule({
      id: 'general',
      origin: 'user',
      confidence: 1,
      actions: { amountMinor: '1000', currency: 'VND' },
    })
    const specific = rule({
      id: 'specific',
      origin: 'learned',
      confidence: 0.6,
      conditions: { choiceId: 'choice-a', placeKey: 'w3gvk1c' },
      actions: { amountMinor: '7000', currency: 'VND' },
    })
    const [amount] = evaluateRules(
      [general, specific],
      { choiceId: 'choice-a', placeKey: 'w3gvk1c' },
      options,
    )
    expect(amount?.ruleId).toBe('specific')
    expect(amount?.value).toBe('7000')
  })

  it('breaks ties by user over learned, then confidence, then newer', () => {
    const base = { actions: { amountMinor: '1000', currency: 'VND' } }
    const learned = rule({ id: 'learned', origin: 'learned', confidence: 0.99, ...base })
    const user = rule({ id: 'user', origin: 'user', confidence: 0.5, ...base })
    expect(compareRules(user, learned)).toBeGreaterThan(0)

    const high = rule({ id: 'high', confidence: 0.9, ...base })
    const low = rule({ id: 'low', confidence: 0.7, ...base })
    expect(compareRules(high, low)).toBeGreaterThan(0)

    const newer = rule({ id: 'newer', updatedAt: '2026-10-20T00:00:00.000Z', ...base })
    const older = rule({ id: 'older', updatedAt: '2026-10-10T00:00:00.000Z', ...base })
    expect(compareRules(newer, older)).toBeGreaterThan(0)

    for (const rules of [
      [learned, user],
      [user, learned],
    ]) {
      expect(evaluateRules(rules, { choiceId: 'choice-a' }, options)[0]?.ruleId).toBe('user')
    }
    for (const rules of [
      [older, newer],
      [newer, older],
    ]) {
      expect(evaluateRules(rules, { choiceId: 'choice-a' }, options)[0]?.ruleId).toBe('newer')
    }
  })

  it('is deterministic when everything ties', () => {
    const a = rule({ id: 'a' })
    const b = rule({ id: 'b' })
    expect(evaluateRules([a, b], { choiceId: 'choice-a' }, options)[0]?.ruleId).toBe('a')
    expect(evaluateRules([b, a], { choiceId: 'choice-a' }, options)[0]?.ruleId).toBe('a')
  })

  it('picks each field independently', () => {
    const amountOnly = rule({
      id: 'amount',
      conditions: { choiceId: 'choice-a', placeKey: 'w3gvk1c' },
      actions: { amountMinor: '7000', currency: 'VND' },
    })
    const categoryOnly = rule({
      id: 'category',
      origin: 'user',
      actions: { categoryId: 'transport' },
    })
    const candidates = evaluateRules(
      [amountOnly, categoryOnly],
      { choiceId: 'choice-a', placeKey: 'w3gvk1c' },
      options,
    )
    expect(candidates.map((c) => [c.field, c.ruleId])).toEqual([
      ['amountMinor', 'amount'],
      ['categoryId', 'category'],
    ])
  })

  it('maps default rules to default_rule and drops their amount and merchant', () => {
    const fallback = rule({
      id: 'default-parking',
      origin: 'default',
      conditions: { imageType: 'parking_ticket' },
      confidence: 0.6,
      actions: {
        amountMinor: '9999',
        currency: 'VND',
        categoryId: 'transport',
        merchant: 'Bãi xe',
      },
    })
    const candidates = evaluateRules([fallback], { imageType: 'parking_ticket' }, options)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      field: 'categoryId',
      source: 'default_rule',
      value: 'transport',
      ruleId: 'default-parking',
    })
    expect(candidates[0]?.choiceId).toBeUndefined()
  })

  it('lets a personal rule win a category over a default rule with the same conditions', () => {
    const fallback = rule({
      id: 'default',
      origin: 'default',
      conditions: { imageType: 'parking_ticket' },
      actions: { categoryId: 'other' },
      confidence: 1,
    })
    const learned = rule({
      id: 'learned',
      conditions: { imageType: 'parking_ticket' },
      actions: { categoryId: 'transport' },
      confidence: 0.7,
    })
    const [candidate] = evaluateRules([fallback, learned], { imageType: 'parking_ticket' }, options)
    expect(candidate?.ruleId).toBe('learned')
    expect(candidate?.source).toBe('personal_rule')
  })

  it('maps a merchant action and only uses amounts in the requested currency', () => {
    const r = rule({
      id: 'm',
      conditions: { merchantKey: 'highlands coffee' },
      actions: { amountMinor: '58000', currency: 'VND', merchant: ' Highlands Coffee ' },
    })
    const context = { merchantKey: 'highlands coffee' }
    expect(evaluateRules([r], context, options).map((c) => [c.field, c.value])).toEqual([
      ['amountMinor', '58000'],
      ['merchant', 'Highlands Coffee'],
    ])
    expect(
      evaluateRules([r], context, { ...options, currency: 'USD' }).map((c) => c.field),
    ).toEqual(['merchant'])
  })

  it('ignores malformed amounts', () => {
    const r = rule({ id: 'bad', actions: { amountMinor: '5.000', currency: 'VND' } })
    expect(evaluateRules([r], { choiceId: 'choice-a' }, options)).toEqual([])
    const missingCurrency = rule({ id: 'bad2', actions: { amountMinor: '5000' } })
    expect(evaluateRules([missingCurrency], { choiceId: 'choice-a' }, options)).toEqual([])
  })
})
