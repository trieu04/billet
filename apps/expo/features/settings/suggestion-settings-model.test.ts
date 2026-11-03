import { describe, expect, it } from 'vitest'
import type { Category, DecisionChoice, ExpenseRule } from '@/features/api/types'
import {
  describeActions,
  describeConditions,
  formToRuleInput,
  originLabel,
  ruleToForm,
} from './suggestion-settings-model'

const choice: DecisionChoice = {
  id: '4',
  kind: 'personal',
  key: null,
  label: 'Gửi xe – Tòa A',
  description: null,
  imageType: 'parking_ticket',
  placeKey: null,
  merchantKey: null,
  origin: 'learned',
  status: 'enabled',
  support: 4,
  lastSelectedAt: null,
  version: 1,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const category: Category = {
  id: '2',
  code: 'transport',
  name: 'Di chuyển',
  color: '#fff',
  icon: 'car',
  sortOrder: 1,
  usageCount: 3,
  isCustom: false,
}

const rule: ExpenseRule = {
  id: '9',
  origin: 'learned',
  status: 'enabled',
  conditions: { choiceId: '4', placeKey: 'w3gv2c1' },
  actions: { amountMinor: '5000', currency: 'VND', categoryId: '2' },
  currency: 'VND',
  confidence: 0.8,
  support: 5,
  lastUsedAt: null,
  version: 3,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

describe('suggestion settings model', () => {
  it('describes rules in plain Vietnamese', () => {
    expect(describeConditions(rule.conditions, { choices: [choice], imageTypes: [] })).toBe(
      'Khi “Gửi xe – Tòa A” · tại một địa điểm',
    )
    expect(describeActions(rule.actions, [category])).toMatch(/^Điền 5\.000\s₫ · Di chuyển$/)
    expect(originLabel('learned')).toBe('Học từ lịch sử')
    expect(originLabel('user')).toBe('Bạn tạo')
  })

  it('round-trips a rule through the form and keeps the place key', () => {
    const result = formToRuleInput({ ...ruleToForm(rule), amount: '6.000' })
    expect(result).toEqual({
      ok: true,
      conditions: { choiceId: '4', placeKey: 'w3gv2c1' },
      actions: { amountMinor: '6000', currency: 'VND', categoryId: '2' },
    })
  })

  it('requires at least one condition and one action', () => {
    expect(formToRuleInput(ruleToForm(null))).toEqual({
      ok: false,
      error: 'Chọn ít nhất một điều kiện.',
    })
    expect(formToRuleInput({ ...ruleToForm(null), imageType: 'food' })).toEqual({
      ok: false,
      error: 'Chọn ít nhất một giá trị để điền.',
    })
    expect(formToRuleInput({ ...ruleToForm(null), imageType: 'food', amount: '0' })).toMatchObject({
      ok: false,
    })
  })
})
