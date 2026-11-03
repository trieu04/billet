import type { DecisionConfigValues } from '../../../configs/app.config'
import { DECISION_MAX_CHOICES, type DecisionProvider } from '../interface'
import { DisabledDecisionProvider } from './disabled.provider'
import { FakeDecisionProvider } from './fake.provider'
import { GoogleAiStudioDecisionProvider } from './google-ai-studio.provider'
import { OpenAiCompatibleDecisionProvider } from './openai-compatible.provider'

/**
 * Select the adapter named by `EXPENSE_DECISION_PROVIDER`. Throws when the selected adapter is
 * missing required settings, so a misconfigured provider can never be built silently.
 */
export function createDecisionProvider(config: DecisionConfigValues): DecisionProvider {
  const common = { maxImageBytes: config.maxImageBytes, maxChoices: DECISION_MAX_CHOICES }
  switch (config.provider) {
    case 'disabled':
      return new DisabledDecisionProvider(config.maxImageBytes)
    case 'fake':
      return new FakeDecisionProvider({
        maxImageBytes: config.maxImageBytes,
        model: config.model || undefined,
      })
    case 'google-ai-studio':
      requireSettings(config.provider, {
        EXPENSE_DECISION_MODEL: config.model,
        EXPENSE_DECISION_GOOGLE_API_KEYS: config.googleApiKeys.join(','),
      })
      return new GoogleAiStudioDecisionProvider({
        ...common,
        model: config.model,
        apiKeys: config.googleApiKeys,
      })
    case 'openai-compatible':
      requireSettings(config.provider, {
        EXPENSE_DECISION_MODEL: config.model,
        EXPENSE_DECISION_BASE_URL: config.baseUrl,
        EXPENSE_DECISION_API_KEY: config.apiKey,
      })
      return new OpenAiCompatibleDecisionProvider({
        ...common,
        model: config.model,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
      })
  }
}

function requireSettings(provider: string, settings: Record<string, string>): void {
  const missing = Object.entries(settings)
    .filter(([, value]) => value === '')
    .map(([key]) => key)
  if (missing.length > 0) {
    throw new Error(`${missing.join(', ')} required when EXPENSE_DECISION_PROVIDER=${provider}`)
  }
}
