import { assertDecisionRefs, parseDecisionSelections, parseDecisionText } from './decision-output'
import { DecisionProviderError, type DecisionInput, type DecisionOutput } from './interface'

const choices: DecisionInput['choices'] = {
  imageTypes: [
    { ref: 't1', label: 'Receipt' },
    { ref: 't2', label: 'Food' },
  ],
  categories: [{ ref: 'c1', label: 'Food' }],
  personal: [{ ref: 'p1', label: 'Parking' }],
}

function reasonOf(action: () => unknown): string | undefined {
  try {
    action()
  } catch (error: unknown) {
    if (error instanceof DecisionProviderError) return error.reason
    throw error
  }
  return undefined
}

describe('parseDecisionSelections', () => {
  it('accepts a full result', () => {
    expect(
      parseDecisionSelections({
        imageType: { ref: 't1', confidence: 0.9 },
        category: { ref: 'c1', confidence: 0.5 },
        personal: { ref: 'p1', confidence: 0 },
      }),
    ).toEqual({
      imageType: { ref: 't1', confidence: 0.9 },
      category: { ref: 'c1', confidence: 0.5 },
      personal: { ref: 'p1', confidence: 0 },
    })
  })

  it('allows null or missing category and personal', () => {
    expect(
      parseDecisionSelections({ imageType: { ref: 't2', confidence: 1 }, category: null }),
    ).toEqual({ imageType: { ref: 't2', confidence: 1 }, category: null, personal: null })
  })

  it('drops unknown keys', () => {
    const result = parseDecisionSelections({
      imageType: { ref: 't1', confidence: 0.4, note: 'x' },
      reasoning: 'because',
    })
    expect(result.imageType).toEqual({ ref: 't1', confidence: 0.4 })
    expect(result).not.toHaveProperty('reasoning')
  })

  it.each([
    ['non-object', 'text'],
    ['array', []],
    ['missing imageType', { category: null }],
    ['null imageType', { imageType: null }],
    ['ref not a string', { imageType: { ref: 1, confidence: 0.5 } }],
    ['empty ref', { imageType: { ref: '', confidence: 0.5 } }],
    ['confidence as string', { imageType: { ref: 't1', confidence: '0.5' } }],
    ['confidence above 1', { imageType: { ref: 't1', confidence: 1.2 } }],
    ['confidence below 0', { imageType: { ref: 't1', confidence: -0.1 } }],
    ['NaN confidence', { imageType: { ref: 't1', confidence: Number.NaN } }],
    ['category not an object', { imageType: { ref: 't1', confidence: 1 }, category: 'c1' }],
  ])('rejects %s as invalid_output', (_name, value) => {
    expect(reasonOf(() => parseDecisionSelections(value))).toBe('invalid_output')
  })
})

describe('parseDecisionText', () => {
  const body = '{"imageType":{"ref":"t1","confidence":0.8},"category":null,"personal":null}'

  it('parses plain JSON and fenced JSON', () => {
    expect(parseDecisionText(body).imageType.ref).toBe('t1')
    expect(parseDecisionText(`\`\`\`json\n${body}\n\`\`\``).imageType.ref).toBe('t1')
  })

  it('rejects unparsable text', () => {
    expect(reasonOf(() => parseDecisionText('not json'))).toBe('invalid_output')
    expect(reasonOf(() => parseDecisionText(''))).toBe('invalid_output')
  })
})

describe('assertDecisionRefs', () => {
  const output: DecisionOutput = {
    imageType: { ref: 't1', confidence: 0.9 },
    category: { ref: 'c1', confidence: 0.7 },
    personal: null,
  }

  it('returns an output whose refs are all in the set', () => {
    expect(assertDecisionRefs(choices, output)).toBe(output)
  })

  it('rejects a ref outside its own list, even when it exists in another list', () => {
    expect(
      reasonOf(() =>
        assertDecisionRefs(choices, { ...output, imageType: { ref: 'c1', confidence: 1 } }),
      ),
    ).toBe('invalid_output')
    expect(
      reasonOf(() =>
        assertDecisionRefs(choices, { ...output, category: { ref: 't1', confidence: 1 } }),
      ),
    ).toBe('invalid_output')
  })

  it('rejects unknown personal refs and ignores null selections', () => {
    expect(
      reasonOf(() =>
        assertDecisionRefs(choices, { ...output, personal: { ref: 'p9', confidence: 1 } }),
      ),
    ).toBe('invalid_output')
    expect(
      reasonOf(() => assertDecisionRefs(choices, { ...output, category: null })),
    ).toBeUndefined()
  })

  it('rejects a category selection when the request offered none', () => {
    expect(reasonOf(() => assertDecisionRefs({ ...choices, categories: [] }, output))).toBe(
      'invalid_output',
    )
  })
})
