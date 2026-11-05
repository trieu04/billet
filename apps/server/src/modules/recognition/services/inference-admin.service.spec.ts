import type { ExpenseInferenceEntity } from '../entities/expense-inference.entity'
import { toInputDto, toOutputDto } from './inference-admin.service'

function row(overrides: Partial<ExpenseInferenceEntity>): ExpenseInferenceEntity {
  return {
    input: {
      locale: 'vi-VN',
      imageTypes: [
        { ref: 't1', label: 'Hóa đơn', description: 'Phiếu in nhiệt', targetId: 'receipt' },
        { ref: 't2', label: 'Vé gửi xe', targetId: 'parking_ticket' },
      ],
      categories: [{ ref: 'c1', label: 'Di chuyển', targetId: '2' }],
      personal: [{ ref: 'p1', label: 'Gửi xe chỗ A', targetId: '9' }],
    },
    output: {
      imageType: { ref: 't2', confidence: 0.9 },
      category: { ref: 'c1', confidence: 0.7 },
      personal: null,
    },
    ...overrides,
  } as ExpenseInferenceEntity
}

describe('inference admin detail', () => {
  it('lists the offered choices by label and marks the ones the provider picked', () => {
    const dto = toInputDto(row({}))

    expect(dto).toEqual({
      locale: 'vi-VN',
      imageTypes: [
        { ref: 't1', label: 'Hóa đơn', description: 'Phiếu in nhiệt', selected: false },
        { ref: 't2', label: 'Vé gửi xe', selected: true },
      ],
      categories: [{ ref: 'c1', label: 'Di chuyển', selected: true }],
      personal: [{ ref: 'p1', label: 'Gửi xe chỗ A', selected: false }],
    })
    // Database ids behind the refs are not exposed.
    expect(JSON.stringify(dto)).not.toContain('targetId')
  })

  it('resolves the output refs to labels', () => {
    expect(toOutputDto(row({}))).toEqual({
      imageType: { ref: 't2', label: 'Vé gửi xe', confidence: 0.9 },
      category: { ref: 'c1', label: 'Di chuyển', confidence: 0.7 },
      personal: null,
    })
  })

  it('returns null for records without a snapshot or output', () => {
    expect(toInputDto(row({ input: null }))).toBeNull()
    expect(toOutputDto(row({ output: null }))).toBeNull()
    expect(toOutputDto(row({ input: null }))?.imageType.label).toBeNull()
  })
})
