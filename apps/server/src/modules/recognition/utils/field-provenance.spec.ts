import {
  acceptedRuleIds,
  fieldSourcesFromProvenance,
  parseFieldProvenance,
} from './field-provenance'

describe('parseFieldProvenance', () => {
  it('accepts the client provenance shape and derives legacy field sources', () => {
    const parsed = parseFieldProvenance({
      amountMinor: {
        source: 'personal_rule',
        ruleId: '12',
        choiceId: '7',
        confidence: 0.8,
        outcome: 'accepted',
      },
      categoryId: { source: 'decision_model', confidence: 0.6, outcome: 'edited' },
      merchant: { source: 'user', outcome: 'entered' },
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(fieldSourcesFromProvenance(parsed.value)).toEqual({
      amountMinor: 'personal_rule',
      merchant: 'user',
      categoryId: 'decision_model',
    })
    expect(acceptedRuleIds(parsed.value)).toEqual(['12'])
  })

  it.each([
    ['not an object', 'x'],
    ['unknown field', { caption: { source: 'user', outcome: 'entered' } }],
    ['unknown source', { merchant: { source: 'model', outcome: 'accepted' } }],
    ['client-only outcome', { merchant: { source: 'ocr', outcome: 'prefilled' } }],
    [
      'bad rule id',
      { amountMinor: { source: 'personal_rule', ruleId: '01', outcome: 'accepted' } },
    ],
    [
      'confidence out of range',
      { amountMinor: { source: 'ocr', confidence: 1.2, outcome: 'accepted' } },
    ],
    ['extra property', { amountMinor: { source: 'ocr', outcome: 'accepted', raw: '58.000' } }],
  ])('rejects %s', (_name, value) => {
    expect(parseFieldProvenance(value).ok).toBe(false)
  })
})
