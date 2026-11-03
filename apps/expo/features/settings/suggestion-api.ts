import { apiRequest } from '@/features/api/client'
import type {
  DecisionChoice,
  DecisionChoiceInput,
  ExpenseRule,
  ExpenseRuleInput,
} from '@/features/api/types'

// CRUD for personal decision choices and expense rules. Updates carry the item's `version`; a
// stale version returns 409 and the caller reloads.

export function listDecisionChoices(token: string) {
  return apiRequest<DecisionChoice[]>('/decision-choices', { token })
}

export function createDecisionChoice(
  token: string,
  input: DecisionChoiceInput & { label: string },
) {
  return apiRequest<DecisionChoice>('/decision-choices', { body: input, method: 'POST', token })
}

export function updateDecisionChoice(
  token: string,
  choice: Pick<DecisionChoice, 'id' | 'version'>,
  input: DecisionChoiceInput,
) {
  return apiRequest<DecisionChoice>(`/decision-choices/${choice.id}`, {
    body: { ...input, version: choice.version },
    method: 'PATCH',
    token,
  })
}

export function deleteDecisionChoice(token: string, id: string) {
  return apiRequest<void>(`/decision-choices/${id}`, { method: 'DELETE', token })
}

export function listExpenseRules(token: string) {
  return apiRequest<ExpenseRule[]>('/expense-rules', { token })
}

export function createExpenseRule(
  token: string,
  input: Required<Pick<ExpenseRuleInput, 'conditions' | 'actions'>> & ExpenseRuleInput,
) {
  return apiRequest<ExpenseRule>('/expense-rules', { body: input, method: 'POST', token })
}

export function updateExpenseRule(
  token: string,
  rule: Pick<ExpenseRule, 'id' | 'version'>,
  input: ExpenseRuleInput,
) {
  return apiRequest<ExpenseRule>(`/expense-rules/${rule.id}`, {
    body: { ...input, version: rule.version },
    method: 'PATCH',
    token,
  })
}

export function deleteExpenseRule(token: string, id: string) {
  return apiRequest<void>(`/expense-rules/${id}`, { method: 'DELETE', token })
}
