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
    [{ SERVER_PORT: '0' }, 'SERVER_PORT'],
    [{ SERVER_PORT: 'not-a-number' }, 'SERVER_PORT'],
    [{ API_PATH_PREFIX: '///' }, 'API_PATH_PREFIX'],
    [{ OPENAPI_ENABLED: 'yes' }, 'OPENAPI_ENABLED'],
    [{ DATABASE_PORT: '70000' }, 'DATABASE_PORT'],
    [{ DATABASE_SSL_ENABLED: 'yes' }, 'DATABASE_SSL_ENABLED'],
    [{ NODE_ENV: 'production' }, 'AUTH_JWT_SECRET'],
    [{ AUTH_ACCESS_TOKEN_TTL: 'soon' }, 'AUTH_ACCESS_TOKEN_TTL'],
    [{ AUTH_REFRESH_TOKEN_TTL: 'later' }, 'AUTH_REFRESH_TOKEN_TTL'],
    [{ SMTP_PORT: '0' }, 'SMTP_PORT'],
    [{ SMTP_ENABLED: 'true' }, 'SMTP_HOST'],
    [{ SMS_HTTP_TIMEOUT_MS: '50' }, 'SMS_HTTP_TIMEOUT_MS'],
    [{ SMS_HTTP_PROVIDER_ENABLED: 'true' }, 'SMS_HTTP_PROVIDER_URL'],
    [{ MEDIA_MAX_FILE_SIZE_BYTES: '0' }, 'MEDIA_MAX_FILE_SIZE_BYTES'],
    [{ MEDIA_MAX_FILE_SIZE_BYTES: 'not-a-number' }, 'MEDIA_MAX_FILE_SIZE_BYTES'],
    [{ REALTIME_WEBSOCKET_PATH: 'ws' }, 'REALTIME_WEBSOCKET_PATH'],
    [{ FCM_ENABLED: 'true' }, 'FCM_SERVICE_ACCOUNT_FILE'],
    [{ EXPENSE_RECOGNITION_PROVIDER: 'other' }, 'EXPENSE_RECOGNITION_PROVIDER'],
    [{ EXPENSE_RECOGNITION_PROVIDER: 'google-ai-studio' }, 'EXPENSE_RECOGNITION_GOOGLE_API_KEYS'],
    [{ EXPENSE_RECOGNITION_TIMEOUT_MS: '500' }, 'EXPENSE_RECOGNITION_TIMEOUT_MS'],
    [{ EXPENSE_RECOGNITION_REQUESTS_PER_MINUTE: '0' }, 'EXPENSE_RECOGNITION_REQUESTS_PER_MINUTE'],
    [{ EXPENSE_RECOGNITION_TOKENS_PER_MINUTE: 'many' }, 'EXPENSE_RECOGNITION_TOKENS_PER_MINUTE'],
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
        EXPENSE_RECOGNITION_PROVIDER: 'google-ai-studio',
        EXPENSE_RECOGNITION_GOOGLE_API_KEYS: keys,
      }),
    ).toThrow('EXPENSE_RECOGNITION_GOOGLE_API_KEYS is required')
  })

  it.each(['test-key', 'key-1, key-2'])('accepts recognition keys %p', (keys) => {
    const environment = {
      EXPENSE_RECOGNITION_PROVIDER: 'google-ai-studio',
      EXPENSE_RECOGNITION_GOOGLE_API_KEYS: keys,
      EXPENSE_RECOGNITION_GOOGLE_MODEL: 'gemini-2.5-flash',
      EXPENSE_RECOGNITION_TIMEOUT_MS: '15000',
      EXPENSE_RECOGNITION_REQUESTS_PER_MINUTE: '10',
      EXPENSE_RECOGNITION_TOKENS_PER_MINUTE: '250000',
      EXPENSE_RECOGNITION_REQUESTS_PER_DAY: '250',
      EXPENSE_RECOGNITION_ESTIMATED_TOKENS_PER_REQUEST: '4096',
    }

    expect(validateEnvironment(environment)).toEqual(environment)
  })
})
