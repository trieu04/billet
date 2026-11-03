import type { DecisionInput } from '../interface'
import { buildDecisionPrompt, DECISION_RESPONSE_SCHEMA } from './prompt'

const input: DecisionInput = {
  image: { bytes: new Uint8Array([1]), mimeType: 'image/jpeg' },
  choices: {
    imageTypes: [
      { ref: 't1', label: 'Receipt', description: 'Printed bill' },
      { ref: 't2', label: 'Food' },
    ],
    categories: [{ ref: 'c1', label: 'Eating out' }],
    personal: [],
  },
  locale: 'vi',
}

describe('buildDecisionPrompt', () => {
  const prompt = buildDecisionPrompt(input)

  it('lists every ref with label and optional description', () => {
    expect(prompt).toContain('- t1: Receipt - Printed bill')
    expect(prompt).toContain('- t2: Food')
    expect(prompt).not.toContain('- t2: Food -')
    expect(prompt).toContain('- c1: Eating out')
  })

  it('marks empty lists, allows null, and asks for confidence', () => {
    expect(prompt).toContain('personal: (empty)')
    expect(prompt).toContain('null')
    expect(prompt).toContain('confidence')
    expect(prompt).toContain('"vi"')
  })
})

describe('DECISION_RESPONSE_SCHEMA', () => {
  it('requires imageType and allows null category and personal', () => {
    expect(DECISION_RESPONSE_SCHEMA.required).toContain('imageType')
    expect(DECISION_RESPONSE_SCHEMA.properties.category.anyOf[1]).toEqual({ type: 'null' })
    expect(DECISION_RESPONSE_SCHEMA.properties.personal.anyOf[1]).toEqual({ type: 'null' })
  })
})
