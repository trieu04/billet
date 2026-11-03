import { readDecisionConfig } from '../../../configs/app.config'
import { createDecisionProvider } from './factory'

function build(env: Record<string, string>) {
  return createDecisionProvider(readDecisionConfig(env))
}

describe('createDecisionProvider', () => {
  it('defaults to the disabled provider', () => {
    expect(build({}).id).toBe('disabled')
  })

  it('builds the fake provider', () => {
    expect(build({ EXPENSE_DECISION_PROVIDER: 'fake' }).id).toBe('fake')
  })

  it('builds google-ai-studio with the key pool and limits', () => {
    const provider = build({
      EXPENSE_DECISION_PROVIDER: 'google-ai-studio',
      EXPENSE_DECISION_MODEL: 'gemini-x',
      EXPENSE_DECISION_GOOGLE_API_KEYS: 'a, b',
      EXPENSE_DECISION_MAX_IMAGE_BYTES: '2048',
    })
    expect(provider).toMatchObject({ id: 'google-ai-studio', model: 'gemini-x' })
    expect(provider.limits.maxImageBytes).toBe(2048)
  })

  it('builds openai-compatible', () => {
    const provider = build({
      EXPENSE_DECISION_PROVIDER: 'openai-compatible',
      EXPENSE_DECISION_MODEL: 'm',
      EXPENSE_DECISION_BASE_URL: 'https://example.test/v1',
      EXPENSE_DECISION_API_KEY: 'k',
    })
    expect(provider).toMatchObject({ id: 'openai-compatible', model: 'm' })
  })

  it.each([
    [
      { EXPENSE_DECISION_PROVIDER: 'google-ai-studio', EXPENSE_DECISION_MODEL: 'm' },
      'GOOGLE_API_KEYS',
    ],
    [{ EXPENSE_DECISION_PROVIDER: 'openai-compatible', EXPENSE_DECISION_MODEL: 'm' }, 'BASE_URL'],
  ])('refuses incomplete settings %p', (env, message) => {
    expect(() => build(env)).toThrow(message)
  })
})

describe('readDecisionConfig', () => {
  it('applies defaults', () => {
    expect(readDecisionConfig({})).toEqual({
      provider: 'disabled',
      model: '',
      baseUrl: '',
      apiKey: '',
      googleApiKeys: [],
      timeoutMs: 5000,
      maxImageBytes: 1_048_576,
    })
  })

  it('reads and trims values and splits the key list', () => {
    expect(
      readDecisionConfig({
        EXPENSE_DECISION_PROVIDER: ' fake ',
        EXPENSE_DECISION_GOOGLE_API_KEYS: 'a, b ,,c',
        EXPENSE_DECISION_TIMEOUT_MS: '3000',
      }),
    ).toMatchObject({ provider: 'fake', googleApiKeys: ['a', 'b', 'c'], timeoutMs: 3000 })
  })
})
