import {
  assembleChoiceSet,
  mapDecisionOutput,
  rankPersonalChoices,
  type PersonalChoiceSource,
} from './choice-set'
import { assertDecisionRefs } from '../decision-output'
import { DecisionProviderError } from '../interface'

const imageTypes = [
  { key: 'receipt', label: 'Hóa đơn bán lẻ', description: 'Phiếu in nhiệt' },
  { key: 'parking_ticket', label: 'Vé gửi xe', description: null },
]
const categories = [
  { id: '1', label: 'Ăn uống' },
  { id: '2', label: 'Di chuyển' },
]

function personal(id: string, placeKey: string | null, lastSelectedAt: string | null) {
  return {
    id,
    label: `Choice ${id.length > 3 ? 'big' : id}`,
    description: null,
    placeKey,
    lastSelectedAt: lastSelectedAt ? new Date(lastSelectedAt) : null,
  } satisfies PersonalChoiceSource
}

describe('assembleChoiceSet', () => {
  it('gives each choice a short request-scoped ref and maps refs back to ids', () => {
    const set = assembleChoiceSet({
      imageTypes,
      categories,
      personal: [personal('900000000000000001', null, null)],
      maxChoices: 64,
    })

    expect(set.choices).toEqual({
      imageTypes: [
        { ref: 't1', label: 'Hóa đơn bán lẻ', description: 'Phiếu in nhiệt' },
        { ref: 't2', label: 'Vé gửi xe' },
      ],
      categories: [
        { ref: 'c1', label: 'Ăn uống' },
        { ref: 'c2', label: 'Di chuyển' },
      ],
      personal: [{ ref: 'p1', label: 'Choice big' }],
    })
    // Database ids never reach the provider.
    expect(JSON.stringify(set.choices)).not.toContain('900000000000000001')
    expect(
      mapDecisionOutput(set, {
        imageType: { ref: 't2', confidence: 0.93 },
        category: { ref: 'c2', confidence: 0.7 },
        personal: { ref: 'p1', confidence: 0.85 },
      }),
    ).toEqual({
      imageType: { id: 'parking_ticket', confidence: 0.93 },
      category: { id: '2', confidence: 0.7 },
      personalChoice: { id: '900000000000000001', confidence: 0.85 },
    })
  })

  it('maps "no choice" to null', () => {
    const set = assembleChoiceSet({ imageTypes, categories, personal: [], maxChoices: 64 })
    expect(
      mapDecisionOutput(set, {
        imageType: { ref: 't1', confidence: 0.5 },
        category: null,
        personal: null,
      }),
    ).toEqual({
      imageType: { id: 'receipt', confidence: 0.5 },
      category: null,
      personalChoice: null,
    })
  })

  it('rejects refs outside the set through assertDecisionRefs', () => {
    const set = assembleChoiceSet({ imageTypes, categories, personal: [], maxChoices: 64 })
    expect(() =>
      assertDecisionRefs(set.choices, {
        imageType: { ref: 't1', confidence: 0.5 },
        category: { ref: 'c9', confidence: 0.5 },
        personal: null,
      }),
    ).toThrow(DecisionProviderError)
    expect(() =>
      assertDecisionRefs(set.choices, {
        imageType: { ref: 'c1', confidence: 0.5 },
        category: null,
        personal: null,
      }),
    ).toThrow(DecisionProviderError)
  })

  it('offers at most 20 personal choices and respects the provider choice limit', () => {
    const many = Array.from({ length: 30 }, (_, index) => personal(String(index + 1), null, null))
    expect(
      assembleChoiceSet({ imageTypes, categories, personal: many, maxChoices: 64 }).choices
        .personal,
    ).toHaveLength(20)
    const tight = assembleChoiceSet({ imageTypes, categories, personal: many, maxChoices: 7 })
    expect(tight.choices.imageTypes).toHaveLength(2)
    expect(tight.choices.categories).toHaveLength(2)
    expect(tight.choices.personal).toHaveLength(3)
  })

  it('changes the version when the offered choices change', () => {
    const base = { imageTypes, categories, personal: [], maxChoices: 64 }
    const first = assembleChoiceSet(base)
    expect(assembleChoiceSet(base).version).toBe(first.version)
    expect(first.version).toMatch(/^[0-9a-f]{16}$/)
    expect(
      assembleChoiceSet({ ...base, categories: [{ id: '1', label: 'Ăn ngoài' }] }).version,
    ).not.toBe(first.version)
  })
})

describe('rankPersonalChoices', () => {
  it('puts the same place first, then the most recently selected, then the newest', () => {
    const ranked = rankPersonalChoices(
      [
        personal('1', null, '2026-10-01T00:00:00Z'),
        personal('2', 'w3gvk1c', '2026-09-01T00:00:00Z'),
        personal('3', null, '2026-10-20T00:00:00Z'),
        personal('4', null, null),
        personal('5', null, null),
        personal('6', 'w3gvk1c', null),
      ],
      'w3gvk1c',
    )
    expect(ranked.map((choice) => choice.id)).toEqual(['2', '6', '3', '1', '5', '4'])
  })
})
