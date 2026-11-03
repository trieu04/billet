import {
  DecisionProviderError,
  DECISION_MAX_CHOICES,
  type DecisionInput,
  type DecisionOutput,
  type DecisionProvider,
} from '../interface'

export class DisabledDecisionProvider implements DecisionProvider {
  readonly id = 'disabled'
  readonly model = 'none'
  readonly limits: DecisionProvider['limits']

  constructor(maxImageBytes: number) {
    this.limits = { maxImageBytes, maxChoices: DECISION_MAX_CHOICES }
  }

  decide(_input: DecisionInput, _signal: AbortSignal): Promise<DecisionOutput> {
    return Promise.reject(
      new DecisionProviderError('disabled', 'Photo expense suggestions are disabled'),
    )
  }
}
