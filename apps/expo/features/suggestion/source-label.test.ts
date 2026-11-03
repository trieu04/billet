import { describe, expect, it } from 'vitest'
import { createDraft, merge, userEdit } from './merge'
import { describeSource, machineProvenance } from './source-label'

const choices = [{ id: 'c1', label: 'Gửi xe – Tòa A' }]

describe('describeSource', () => {
  it('names every machine source', () => {
    expect(describeSource({ source: 'ocr' }, choices)).toBe('Từ hóa đơn')
    expect(describeSource({ source: 'personal_rule', choiceId: 'c1' }, choices)).toBe(
      'Như lần trước: Gửi xe – Tòa A',
    )
    expect(describeSource({ source: 'personal_rule' }, choices)).toBe('Như lần trước')
    expect(describeSource({ source: 'default_rule' }, choices)).toBe('Gợi ý mặc định')
    expect(describeSource({ source: 'decision_model' }, choices)).toBe('Gợi ý')
  })

  it('has no label for the user and the capture time', () => {
    expect(describeSource({ source: 'user' }, choices)).toBeNull()
    expect(describeSource({ source: 'capture_time' }, choices)).toBeNull()
    expect(describeSource(undefined, choices)).toBeNull()
  })
})

describe('machineProvenance', () => {
  it('reports machine-filled values only', () => {
    let draft = createDraft({ generation: 1, captureTime: '2026-10-30T10:00:00.000Z' })
    draft = merge(
      draft,
      [
        {
          id: 'ocr:amount',
          generation: 1,
          field: 'amountMinor',
          value: '58000',
          source: 'ocr',
          confidence: 0.95,
        },
      ],
      { thresholds: { ocrAmount: 0.8, personalRule: 0.7, decisionCategory: 0.6 } },
    )
    expect(machineProvenance(draft, 'amountMinor')?.source).toBe('ocr')
    expect(machineProvenance(draft, 'occurredAt')).toBeUndefined()
    expect(
      machineProvenance(userEdit(draft, 'amountMinor', '60000'), 'amountMinor'),
    ).toBeUndefined()
  })
})
