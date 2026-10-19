import { validateEnvironment } from './environment'

describe('validateEnvironment', () => {
  it('accepts the default environment', () => {
    expect(validateEnvironment({})).toEqual({})
  })

  it.each(['none', 'email', 'phone', 'one_of', 'both'])(
    'accepts registration verification policy %s',
    (policy) => {
      expect(validateEnvironment({ AUTH_REGISTRATION_VERIFICATION_POLICY: policy })).toEqual({
        AUTH_REGISTRATION_VERIFICATION_POLICY: policy,
      })
    },
  )

  it.each([
    [{ NODE_ENV: 'staging' }, 'NODE_ENV'],
    [{ PORT: '0' }, 'PORT'],
    [{ PORT: 'not-a-number' }, 'PORT'],
    [{ API_PREFIX: '///' }, 'API_PREFIX'],
    [{ API_DOCS_ENABLED: 'yes' }, 'API_DOCS_ENABLED'],
    [{ DB_PORT: '70000' }, 'DB_PORT'],
    [{ DB_SSL: 'yes' }, 'DB_SSL'],
    [{ NODE_ENV: 'production' }, 'JWT_SECRET'],
    [{ JWT_ACCESS_TOKEN_TTL: 'soon' }, 'JWT_ACCESS_TOKEN_TTL'],
    [{ EMAIL_PORT: '0' }, 'EMAIL_PORT'],
    [{ EMAIL_ENABLED: 'true' }, 'EMAIL_HOST'],
    [{ SMS_TIMEOUT_MS: '50' }, 'SMS_TIMEOUT_MS'],
    [{ SMS_ENABLED: 'true' }, 'SMS_PROVIDER_URL'],
    [{ WS_PATH: 'ws' }, 'WS_PATH'],
    [{ FIREBASE_ENABLED: 'true' }, 'FIREBASE_PROJECT_ID'],
    [{ RECOGNITION_PROVIDER: 'other' }, 'RECOGNITION_PROVIDER'],
    [{ RECOGNITION_PROVIDER: 'google-ai-studio' }, 'GOOGLE_AI_STUDIO_API_KEYS'],
    [{ RECOGNITION_TIMEOUT_MS: '500' }, 'RECOGNITION_TIMEOUT_MS'],
    [{ RECOGNITION_RPM: '0' }, 'RECOGNITION_RPM'],
    [{ RECOGNITION_TPM: 'many' }, 'RECOGNITION_TPM'],
    [
      { AUTH_REGISTRATION_VERIFICATION_POLICY: 'sometimes' },
      'AUTH_REGISTRATION_VERIFICATION_POLICY',
    ],
  ])('rejects invalid configuration %p', (environment, expectedMessage) => {
    expect(() => validateEnvironment(environment)).toThrow(expectedMessage)
  })

  it.each(['', '   ', ', ,'])('rejects an empty recognition key pool %p', (keys) => {
    expect(() =>
      validateEnvironment({
        RECOGNITION_PROVIDER: 'google-ai-studio',
        GOOGLE_AI_STUDIO_API_KEYS: keys,
      }),
    ).toThrow('GOOGLE_AI_STUDIO_API_KEYS is required')
  })

  it.each(['test-key', 'key-1, key-2'])('accepts recognition keys %p', (keys) => {
    const environment = {
      RECOGNITION_PROVIDER: 'google-ai-studio',
      GOOGLE_AI_STUDIO_API_KEYS: keys,
      GOOGLE_AI_STUDIO_MODEL: 'gemini-2.5-flash',
      RECOGNITION_TIMEOUT_MS: '15000',
      RECOGNITION_RPM: '10',
      RECOGNITION_TPM: '250000',
      RECOGNITION_RPD: '250',
      RECOGNITION_ESTIMATED_TOKENS: '4096',
    }

    expect(validateEnvironment(environment)).toEqual(environment)
  })
})
