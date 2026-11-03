import { DAY_MS } from '../constants'
import {
  evidenceWeight,
  learningKeys,
  planKeyLearning,
  selectEvictions,
  selectEvidence,
  type EvidenceExpense,
  type ExistingRule,
  type KeyLearningInput,
  type LearningKey,
} from './learning'

const now = new Date('2026-10-31T00:00:00Z')

function expense(amountMinor: string, daysAgo: number, extra: Partial<EvidenceExpense> = {}) {
  return {
    amountMinor,
    currency: 'VND',
    occurredAt: new Date(now.getTime() - daysAgo * DAY_MS),
    categoryId: '2',
    merchant: 'Tòa A',
    location: null,
    ...extra,
  } satisfies EvidenceExpense
}

const placeKey: LearningKey = {
  kind: 'image_type_place',
  conditions: { imageType: 'parking_ticket', placeKey: 'w3gvk1c' },
}
const choiceKey: LearningKey = { kind: 'personal_choice', conditions: { choiceId: '41' } }

function input(overrides: Partial<KeyLearningInput>): KeyLearningInput {
  return {
    key: placeKey,
    currency: 'VND',
    evidence: [],
    now,
    rule: null,
    choice: null,
    imageTypeLabel: 'Vé gửi xe',
    ...overrides,
  }
}

function learnedRule(overrides: Partial<ExistingRule> = {}): ExistingRule {
  return {
    id: '9',
    origin: 'learned',
    status: 'enabled',
    deleted: false,
    suppressedUntil: null,
    actions: { amountMinor: '5000', currency: 'VND', categoryId: '2' },
    currency: 'VND',
    confidence: 0.8,
    ...overrides,
  }
}

describe('learningKeys', () => {
  it('derives the four learning keys from normalized features', () => {
    expect(
      learningKeys({
        personalChoiceId: '41',
        imageType: 'parking_ticket',
        placeKey: 'w3gvk1c',
        merchantKey: 'bai xe toa a',
      }).map((key) => [key.kind, key.conditions]),
    ).toEqual([
      ['personal_choice', { choiceId: '41' }],
      ['image_type_place', { imageType: 'parking_ticket', placeKey: 'w3gvk1c' }],
      ['merchant', { merchantKey: 'bai xe toa a' }],
      ['image_type_merchant', { imageType: 'parking_ticket', merchantKey: 'bai xe toa a' }],
    ])
    expect(
      learningKeys({
        personalChoiceId: null,
        imageType: 'food',
        placeKey: null,
        merchantKey: null,
      }),
    ).toEqual([])
  })
})

describe('evidence selection and decay', () => {
  it('halves the weight every 60 days', () => {
    expect(evidenceWeight(now, now)).toBe(1)
    expect(evidenceWeight(new Date(now.getTime() - 60 * DAY_MS), now)).toBeCloseTo(0.5)
    expect(evidenceWeight(new Date(now.getTime() - 120 * DAY_MS), now)).toBeCloseTo(0.25)
    expect(evidenceWeight(new Date(now.getTime() + DAY_MS), now)).toBe(1)
  })

  it('keeps at most 10 expenses within 180 days in the same currency, newest first', () => {
    const evidence = [
      ...Array.from({ length: 12 }, (_, index) => expense('5000', index)),
      expense('5000', 181),
      expense('5', 0, { currency: 'USD' }),
    ]
    const selected = selectEvidence(evidence, 'VND', now)
    expect(selected).toHaveLength(10)
    expect(selected.every((item) => item.currency === 'VND')).toBe(true)
    expect(selected[0].occurredAt.getTime()).toBe(now.getTime())
  })
})

describe('planKeyLearning', () => {
  it('learns nothing below three expenses', () => {
    expect(planKeyLearning(input({ evidence: [expense('5000', 1), expense('5000', 2)] }))).toEqual(
      [],
    )
  })

  it('creates a learned choice and an amount rule at three agreeing expenses', () => {
    const actions = planKeyLearning(
      input({ evidence: [expense('5000', 1), expense('5000', 2), expense('5000', 3)] }),
    )
    expect(actions).toEqual([
      {
        type: 'create_choice',
        imageType: 'parking_ticket',
        placeKey: 'w3gvk1c',
        merchantKey: null,
        label: 'Vé gửi xe – Tòa A',
        support: 3,
      },
      {
        type: 'upsert_rule',
        ruleId: null,
        conditions: placeKey.conditions,
        actions: { amountMinor: '5000', currency: 'VND', categoryId: '2', merchant: 'Tòa A' },
        currency: 'VND',
        confidence: 1,
        support: 3,
      },
    ])
  })

  it('sets confidence to the weighted share of the dominant amount (4 of 5 → 0.8)', () => {
    const actions = planKeyLearning(
      input({
        key: choiceKey,
        choice: { id: '41', origin: 'learned', deleted: false, suppressedUntil: null },
        evidence: [
          expense('5000', 0),
          expense('5000', 0),
          expense('7000', 0),
          expense('5000', 0),
          expense('5000', 0),
        ],
      }),
    )
    expect(actions).toEqual([
      expect.objectContaining({ type: 'upsert_rule', confidence: 0.8, support: 4 }),
    ])
  })

  it('weights recent expenses higher than old ones', () => {
    // Two recent 7.000 expenses outweigh three old 5.000 ones, but two are too few to learn from.
    const actions = planKeyLearning(
      input({
        key: { kind: 'merchant', conditions: { merchantKey: 'toa a' } },
        evidence: [
          expense('7000', 0),
          expense('7000', 1),
          expense('5000', 170),
          expense('5000', 171),
          expense('5000', 172),
        ],
      }),
    )
    expect(actions).toEqual([])
  })

  it('lowers, then disables a learned rule that is no longer dominant', () => {
    const lowered = planKeyLearning(
      input({
        key: { kind: 'merchant', conditions: { merchantKey: 'toa a' } },
        rule: learnedRule(),
        evidence: [expense('5000', 0), expense('5000', 0), expense('6000', 0), expense('7000', 0)],
      }),
    )
    expect(lowered).toEqual([
      { type: 'lower_rule', ruleId: '9', confidence: 0.5, support: 2, status: 'enabled' },
    ])

    const disabled = planKeyLearning(
      input({
        key: { kind: 'merchant', conditions: { merchantKey: 'toa a' } },
        rule: learnedRule(),
        evidence: [expense('5000', 0), expense('6000', 0), expense('7000', 0), expense('8000', 0)],
      }),
    )
    expect(disabled).toEqual([
      { type: 'lower_rule', ruleId: '9', confidence: 0.25, support: 1, status: 'disabled' },
    ])
  })

  it('never modifies user items', () => {
    const evidence = [expense('9000', 0), expense('9000', 1), expense('9000', 2)]
    expect(
      planKeyLearning(
        input({
          evidence,
          rule: learnedRule({ origin: 'user' }),
          choice: { id: '41', origin: 'user', deleted: false, suppressedUntil: null },
        }),
      ),
    ).toEqual([])
  })

  it('updates support of an existing learned choice instead of creating another', () => {
    const actions = planKeyLearning(
      input({
        evidence: [expense('5000', 0), expense('6000', 1), expense('7000', 2)],
        choice: { id: '41', origin: 'learned', deleted: false, suppressedUntil: null },
      }),
    )
    expect(actions).toEqual([{ type: 'update_choice_support', choiceId: '41', support: 3 }])
  })

  it('respects suppression of deleted items, and relearns once it expires', () => {
    const evidence = [expense('5000', 0), expense('5000', 1), expense('5000', 2)]
    const suppressed = { suppressedUntil: new Date(now.getTime() + DAY_MS), deleted: true }
    expect(
      planKeyLearning(
        input({
          evidence,
          rule: learnedRule(suppressed),
          choice: { id: '41', origin: 'learned', ...suppressed },
        }),
      ),
    ).toEqual([])

    const expired = { suppressedUntil: new Date(now.getTime() - DAY_MS), deleted: true }
    const actions = planKeyLearning(
      input({
        evidence,
        rule: learnedRule(expired),
        choice: { id: '41', origin: 'learned', ...expired },
      }),
    )
    expect(actions.map((action) => action.type)).toEqual(['create_choice', 'upsert_rule'])
    expect(actions[1]).toMatchObject({ ruleId: '9' })
  })

  it('learns no rule for a deleted personal choice', () => {
    expect(
      planKeyLearning(
        input({
          key: choiceKey,
          choice: { id: '41', origin: 'learned', deleted: true, suppressedUntil: null },
          evidence: [expense('5000', 0), expense('5000', 1), expense('5000', 2)],
        }),
      ),
    ).toEqual([])
  })
})

describe('selectEvictions', () => {
  const at = (day: number) => new Date(now.getTime() - day * DAY_MS)

  it('evicts only learned items, least recently used first', () => {
    const items = [
      { id: '1', origin: 'user' as const, lastUsedAt: null, support: 0, createdAt: at(300) },
      { id: '2', origin: 'learned' as const, lastUsedAt: at(1), support: 5, createdAt: at(200) },
      { id: '3', origin: 'learned' as const, lastUsedAt: null, support: 3, createdAt: at(100) },
      { id: '4', origin: 'learned' as const, lastUsedAt: at(50), support: 1, createdAt: at(60) },
    ]
    expect(selectEvictions(items, 4)).toEqual([])
    expect(selectEvictions(items, 2)).toEqual(['3', '4'])
    expect(selectEvictions(items.slice(0, 1), 0)).toEqual([])
  })
})
