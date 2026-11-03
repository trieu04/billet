import { describe, expect, it } from 'vitest'
import {
  FIELD_PRIORITY,
  applySuggestion,
  bestSuggestion,
  createDraft,
  finalizeProvenance,
  merge,
  priorityOf,
  userEdit,
} from './merge'
import type { MergeConfig, SuggestionDraft } from './merge'
import type { CandidateSource, SuggestionCandidate, SuggestionField } from './types'

const CAPTURE = '2026-10-31T03:00:00.000Z'
const DAY = 24 * 60 * 60 * 1000
const config: MergeConfig = {
  thresholds: { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 },
}

function draft(): SuggestionDraft {
  return createDraft({ generation: 1, captureTime: CAPTURE })
}

let counter = 0
function candidate(
  field: SuggestionField,
  source: CandidateSource,
  value: string,
  confidence = 0.95,
  extra: Partial<SuggestionCandidate> = {},
): SuggestionCandidate {
  counter += 1
  return { id: `c${counter}`, generation: 1, field, value, source, confidence, ...extra }
}

function run(base: SuggestionDraft, ...candidates: SuggestionCandidate[]): SuggestionDraft {
  return merge(base, candidates, config)
}

function valueFor(field: SuggestionField, index: number): string {
  return field === 'amountMinor' ? `${index + 1}000` : `${field}-${index}`
}

describe('createDraft', () => {
  it('prefills occurredAt with the capture time', () => {
    const initial = draft()
    expect(initial.values).toEqual({ occurredAt: CAPTURE })
    expect(initial.provenance.occurredAt).toEqual({ source: 'capture_time', outcome: 'prefilled' })
    expect(initial.locked).toBe(false)
  })

  it('rejects an invalid capture time', () => {
    expect(() => createDraft({ generation: 1, captureTime: 'nope' })).toThrow(RangeError)
  })
})

describe('priority table', () => {
  it('matches the design', () => {
    expect(FIELD_PRIORITY).toEqual({
      amountMinor: ['user', 'ocr', 'personal_rule', 'default_rule'],
      occurredAt: ['user', 'ocr', 'capture_time'],
      merchant: ['user', 'ocr', 'personal_rule'],
      categoryId: ['user', 'personal_rule', 'decision_model', 'default_rule'],
    })
  })

  const cases: Array<[SuggestionField, CandidateSource[]]> = [
    ['amountMinor', ['ocr', 'personal_rule', 'default_rule']],
    ['merchant', ['ocr', 'personal_rule']],
    ['categoryId', ['personal_rule', 'decision_model', 'default_rule']],
  ]

  it.each(cases)('%s: a stronger source replaces a weaker one while unlocked', (field, sources) => {
    let state = draft()
    ;[...sources].reverse().forEach((source, index) => {
      state = run(state, candidate(field, source, valueFor(field, index), 0.95))
    })
    expect(state.provenance[field]?.source).toBe(sources[0])
    expect(state.values[field]).toBe(valueFor(field, sources.length - 1))
  })

  it.each(cases)('%s: a weaker source does not replace a stronger one', (field, sources) => {
    let state = draft()
    sources.forEach((source, index) => {
      state = run(state, candidate(field, source, valueFor(field, index), 0.95))
    })
    expect(state.provenance[field]?.source).toBe(sources[0])
    expect(state.values[field]).toBe(valueFor(field, 0))
    // Weaker values are dropped, not offered.
    expect(state.suggestions[field] ?? []).toHaveLength(0)
  })

  it('rejects sources that cannot fill a field', () => {
    expect(priorityOf('amountMinor', 'decision_model')).toBe(-1)
    expect(priorityOf('merchant', 'default_rule')).toBe(-1)
    const state = run(
      draft(),
      candidate('amountMinor', 'decision_model', '5000'),
      candidate('merchant', 'default_rule', 'Quán A'),
    )
    expect(state.values.amountMinor).toBeUndefined()
    expect(state.values.merchant).toBeUndefined()
    expect(state.suggestions).toEqual({})
  })

  it('an equal source with a different value becomes a suggestion instead of replacing', () => {
    const state = run(
      draft(),
      candidate('categoryId', 'personal_rule', 'food', 0.9),
      candidate('categoryId', 'personal_rule', 'transport', 0.95),
    )
    expect(state.values.categoryId).toBe('food')
    expect(state.suggestions.categoryId?.map((item) => item.value)).toEqual(['transport'])
  })

  it('the same value from a stronger source upgrades the provenance', () => {
    const state = run(
      draft(),
      candidate('categoryId', 'default_rule', 'food', 0.5, { ruleId: 'd1' }),
      candidate('categoryId', 'personal_rule', 'food', 0.9, { ruleId: 'p1' }),
    )
    expect(state.values.categoryId).toBe('food')
    expect(state.provenance.categoryId).toEqual({
      source: 'personal_rule',
      ruleId: 'p1',
      confidence: 0.9,
      outcome: 'prefilled',
    })
  })
})

describe('thresholds', () => {
  const cases: Array<[SuggestionField, CandidateSource, string, number]> = [
    ['amountMinor', 'ocr', '58000', 0.8],
    ['amountMinor', 'personal_rule', '5000', 0.7],
    ['categoryId', 'personal_rule', 'transport', 0.7],
    ['categoryId', 'decision_model', 'transport', 0.6],
  ]

  it.each(cases)('%s from %s prefills at the threshold', (field, source, value, threshold) => {
    const state = run(draft(), candidate(field, source, value, threshold))
    expect(state.values[field]).toBe(value)
    expect(state.provenance[field]?.outcome).toBe('prefilled')
  })

  it.each(cases)(
    '%s from %s is only a suggestion below the threshold',
    (field, source, value, threshold) => {
      const state = run(draft(), candidate(field, source, value, threshold - 0.01))
      expect(state.values[field]).toBeUndefined()
      expect(bestSuggestion(state, field)?.value).toBe(value)
      expect(state.provenance[field]).toMatchObject({ source, outcome: 'suggested' })
    },
  )

  it('uses the configured thresholds', () => {
    const strict: MergeConfig = {
      thresholds: { ocrAmount: 0.95, personalRule: 0.7, decisionCategory: 0.6 },
    }
    const state = merge(draft(), [candidate('amountMinor', 'ocr', '58000', 0.9)], strict)
    expect(state.values.amountMinor).toBeUndefined()
    expect(bestSuggestion(state, 'amountMinor')?.value).toBe('58000')
  })

  it('a below-threshold suggestion stays as an alternative after a weaker prefill', () => {
    const state = run(
      draft(),
      candidate('amountMinor', 'ocr', '60000', 0.5),
      candidate('amountMinor', 'personal_rule', '5000', 0.8),
    )
    expect(state.values.amountMinor).toBe('5000')
    expect(state.provenance.amountMinor?.source).toBe('personal_rule')
    expect(state.suggestions.amountMinor?.map((item) => item.value)).toEqual(['60000'])
  })

  it('drops a weaker pending suggestion once a stronger value is prefilled', () => {
    const state = run(
      draft(),
      candidate('amountMinor', 'personal_rule', '5000', 0.5),
      candidate('amountMinor', 'ocr', '58000', 0.9),
    )
    expect(state.values.amountMinor).toBe('58000')
    expect(state.suggestions.amountMinor).toEqual([])
  })
})

describe('OCR date', () => {
  const ocrDate = (offsetMs: number) =>
    candidate('occurredAt', 'ocr', new Date(Date.parse(CAPTURE) + offsetMs).toISOString(), 0.9)

  it('prefills a date within 30 days before capture and replaces the capture time', () => {
    const state = run(draft(), ocrDate(-2 * DAY))
    expect(state.values.occurredAt).toBe(new Date(Date.parse(CAPTURE) - 2 * DAY).toISOString())
    expect(state.provenance.occurredAt?.source).toBe('ocr')
    expect(state.provenance.occurredAt?.outcome).toBe('prefilled')
  })

  it('accepts exactly 30 days and the capture instant itself', () => {
    expect(run(draft(), ocrDate(-30 * DAY)).provenance.occurredAt?.source).toBe('ocr')
    expect(run(draft(), ocrDate(0)).provenance.occurredAt?.source).toBe('ocr')
  })

  it.each([
    ['in the future', 60_000],
    ['more than 30 days old', -30 * DAY - 1],
    ['months old', -90 * DAY],
  ])('only suggests a date %s', (_name, offset) => {
    const state = run(draft(), ocrDate(offset))
    expect(state.values.occurredAt).toBe(CAPTURE)
    expect(state.provenance.occurredAt?.source).toBe('capture_time')
    expect(bestSuggestion(state, 'occurredAt')?.source).toBe('ocr')
  })

  it('honours a configured window', () => {
    const narrow: MergeConfig = { ...config, ocrDateWindowDays: 1 }
    const state = merge(draft(), [ocrDate(-2 * DAY)], narrow)
    expect(state.provenance.occurredAt?.source).toBe('capture_time')
  })

  it('ignores an unparseable date', () => {
    const state = run(draft(), candidate('occurredAt', 'ocr', 'tomorrow', 0.9))
    expect(state.suggestions).toEqual({})
    expect(state.values.occurredAt).toBe(CAPTURE)
  })
})

describe('locking', () => {
  it('does not lock from merging machine candidates', () => {
    const state = run(draft(), candidate('amountMinor', 'ocr', '58000'))
    expect(state.locked).toBe(false)
  })

  it.each([
    ['edit', (d: SuggestionDraft) => userEdit(d, 'merchant', 'Quán A')],
    ['clear', (d: SuggestionDraft) => userEdit(d, 'amountMinor', '')],
    ['select', (d: SuggestionDraft) => userEdit(d, 'categoryId', 'food')],
  ])('locks on %s', (_name, action) => {
    expect(action(draft()).locked).toBe(true)
  })

  it('turns later candidates into tap-to-apply suggestions', () => {
    const locked = userEdit(draft(), 'merchant', 'Quán A')
    const state = run(
      locked,
      candidate('amountMinor', 'ocr', '58000', 0.99),
      candidate('categoryId', 'personal_rule', 'food', 0.99),
      candidate('merchant', 'ocr', 'Highlands', 0.99),
    )
    expect(state.values).toEqual({ occurredAt: CAPTURE, merchant: 'Quán A' })
    expect(state.suggestions.amountMinor?.[0]?.value).toBe('58000')
    expect(state.suggestions.categoryId?.[0]?.value).toBe('food')
    expect(state.suggestions.merchant?.[0]?.value).toBe('Highlands')
  })

  it('does not replace an earlier machine value after the user locked the draft', () => {
    const prefilled = run(draft(), candidate('amountMinor', 'personal_rule', '5000', 0.8))
    const state = run(
      userEdit(prefilled, 'merchant', 'x'),
      candidate('amountMinor', 'ocr', '58000', 0.95),
    )
    expect(state.values.amountMinor).toBe('5000')
    expect(state.provenance.amountMinor?.source).toBe('personal_rule')
    expect(bestSuggestion(state, 'amountMinor')?.value).toBe('58000')
  })

  it('applySuggestion applies the value, records accepted provenance and locks', () => {
    const pending = run(
      draft(),
      candidate('categoryId', 'personal_rule', 'food', 0.5, { ruleId: 'r1' }),
    )
    const id = bestSuggestion(pending, 'categoryId')?.candidateId ?? ''
    const state = applySuggestion(pending, 'categoryId', id)
    expect(state.values.categoryId).toBe('food')
    expect(state.provenance.categoryId).toEqual({
      source: 'personal_rule',
      ruleId: 'r1',
      confidence: 0.5,
      outcome: 'accepted',
    })
    expect(state.suggestions.categoryId).toEqual([])
    expect(state.locked).toBe(true)
  })

  it('applySuggestion ignores unknown suggestions', () => {
    const state = draft()
    expect(applySuggestion(state, 'categoryId', 'missing')).toBe(state)
  })

  it('keeps other alternatives after applying one', () => {
    const state = run(
      userEdit(draft(), 'merchant', 'x'),
      candidate('amountMinor', 'ocr', '58000', 0.9),
      candidate('amountMinor', 'personal_rule', '5000', 0.8),
    )
    const first = state.suggestions.amountMinor?.[0]
    expect(first?.value).toBe('58000')
    const applied = applySuggestion(state, 'amountMinor', first?.candidateId ?? '')
    expect(applied.values.amountMinor).toBe('58000')
    expect(applied.suggestions.amountMinor?.map((item) => item.value)).toEqual(['5000'])
  })
})

describe('userEdit provenance', () => {
  it('records edited when a machine value is replaced', () => {
    const prefilled = run(draft(), candidate('amountMinor', 'ocr', '58000', 0.9))
    const state = userEdit(prefilled, 'amountMinor', '60000')
    expect(state.values.amountMinor).toBe('60000')
    expect(state.provenance.amountMinor).toEqual({ source: 'user', outcome: 'edited' })
    expect(userEdit(state, 'amountMinor', '61000').provenance.amountMinor?.outcome).toBe('edited')
  })

  it('records entered when the field had no machine value', () => {
    const state = userEdit(draft(), 'amountMinor', ' 45000 ')
    expect(state.values.amountMinor).toBe('45000')
    expect(state.provenance.amountMinor).toEqual({ source: 'user', outcome: 'entered' })
  })

  it('records cleared and removes the value', () => {
    const prefilled = run(draft(), candidate('merchant', 'ocr', 'Highlands', 0.9))
    const state = userEdit(prefilled, 'merchant', '   ')
    expect(state.values.merchant).toBeUndefined()
    expect(state.provenance.merchant).toEqual({ source: 'user', outcome: 'cleared' })
    expect(state.locked).toBe(true)
  })

  it('clearing an empty field only locks', () => {
    const state = userEdit(draft(), 'merchant', null)
    expect(state.locked).toBe(true)
    expect(state.provenance.merchant).toBeUndefined()
  })

  it('selecting the already prefilled value counts as accepted', () => {
    const prefilled = run(
      draft(),
      candidate('categoryId', 'personal_rule', 'food', 0.9, { ruleId: 'r1' }),
    )
    const state = userEdit(prefilled, 'categoryId', 'food')
    expect(state.provenance.categoryId).toMatchObject({
      source: 'personal_rule',
      ruleId: 'r1',
      outcome: 'accepted',
    })
    expect(state.locked).toBe(true)
  })

  it('removes a suggestion that equals the typed value', () => {
    const pending = run(draft(), candidate('amountMinor', 'ocr', '58000', 0.5))
    const state = userEdit(pending, 'amountMinor', '58000')
    expect(state.suggestions.amountMinor).toEqual([])
  })

  it('reports an empty field with a pending suggestion as suggested', () => {
    const pending = run(draft(), candidate('amountMinor', 'ocr', '58000', 0.5))
    expect(pending.provenance.amountMinor).toMatchObject({ source: 'ocr', outcome: 'suggested' })
    expect(finalizeProvenance(pending).amountMinor).toBeUndefined()
  })
})

describe('generations and idempotency', () => {
  it('ignores candidates from another generation', () => {
    const state = run(
      draft(),
      candidate('amountMinor', 'ocr', '58000', 0.9, { generation: 0 }),
      candidate('amountMinor', 'ocr', '59000', 0.9, { generation: 2 }),
    )
    expect(state.values.amountMinor).toBeUndefined()
    expect(state.suggestions).toEqual({})
    expect(state.processed).toEqual([])
  })

  it('applies a candidate once per id', () => {
    const first = candidate('amountMinor', 'ocr', '58000', 0.9)
    const once = run(draft(), first)
    const twice = run(once, first)
    expect(twice).toBe(once)
    expect(once.processed).toEqual([first.id])
  })

  it('does not re-apply a processed candidate after the user changed the field', () => {
    const first = candidate('amountMinor', 'ocr', '58000', 0.9)
    const edited = userEdit(run(draft(), first), 'amountMinor', '60000')
    const state = run(edited, first)
    expect(state).toBe(edited)
    expect(state.values.amountMinor).toBe('60000')
  })

  it('does not re-offer a processed suggestion', () => {
    const first = candidate('amountMinor', 'ocr', '58000', 0.5)
    const once = run(draft(), first)
    expect(run(once, first)).toBe(once)
  })

  it('returns the same draft when nothing changes', () => {
    const state = draft()
    expect(run(state)).toBe(state)
    expect(run(state, candidate('amountMinor', 'ocr', '0', 0.9))).toBe(state)
  })

  it('does not mutate the input draft', () => {
    const state = draft()
    const snapshot = JSON.stringify(state)
    run(state, candidate('amountMinor', 'ocr', '58000', 0.9))
    userEdit(state, 'merchant', 'x')
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('ignores invalid values', () => {
    const state = run(
      draft(),
      candidate('amountMinor', 'ocr', '58.000', 0.9),
      candidate('amountMinor', 'ocr', '-5', 0.9),
      candidate('amountMinor', 'ocr', '', 0.9),
      candidate('merchant', 'ocr', '   ', 0.9),
      candidate('categoryId', 'personal_rule', 'food', Number.NaN),
    )
    expect(state.suggestions).toEqual({})
    expect(state.values).toEqual({ occurredAt: CAPTURE })
  })
})

describe('provenance', () => {
  it('records source, ids and confidence of machine values', () => {
    const state = run(
      draft(),
      candidate('amountMinor', 'personal_rule', '5000', 0.8, { ruleId: 'r1', choiceId: 'c1' }),
      candidate('categoryId', 'decision_model', 'transport', 0.7),
    )
    expect(state.provenance.amountMinor).toEqual({
      source: 'personal_rule',
      ruleId: 'r1',
      choiceId: 'c1',
      confidence: 0.8,
      outcome: 'prefilled',
    })
    expect(state.provenance.categoryId).toEqual({
      source: 'decision_model',
      confidence: 0.7,
      outcome: 'prefilled',
    })
  })

  it('finalizeProvenance reports kept machine values as accepted', () => {
    const state = userEdit(
      run(
        draft(),
        candidate('amountMinor', 'ocr', '58000', 0.9),
        candidate('categoryId', 'personal_rule', 'food', 0.9),
      ),
      'categoryId',
      'drink',
    )
    expect(finalizeProvenance(state)).toEqual({
      amountMinor: { source: 'ocr', confidence: 0.9, outcome: 'accepted' },
      occurredAt: { source: 'capture_time', outcome: 'accepted' },
      categoryId: { source: 'user', outcome: 'edited' },
    })
  })
})

describe('parking ticket example', () => {
  it('prefills the learned amount and category when OCR has no total', () => {
    const rule = { ruleId: 'rule-parking', choiceId: 'choice-parking-a' }
    const state = run(
      draft(),
      // Decision picked parking_ticket (0.93) and "Gui xe - Toa A" (0.85); OCR found no amount.
      candidate('categoryId', 'personal_rule', 'cat-transport', 0.8, rule),
      candidate('amountMinor', 'personal_rule', '5000', 0.8, rule),
    )
    expect(state.values.amountMinor).toBe('5000')
    expect(state.values.categoryId).toBe('cat-transport')
    expect(state.provenance.amountMinor).toEqual({
      source: 'personal_rule',
      ruleId: 'rule-parking',
      choiceId: 'choice-parking-a',
      confidence: 0.8,
      outcome: 'prefilled',
    })
    expect(state.locked).toBe(false)
  })
})
