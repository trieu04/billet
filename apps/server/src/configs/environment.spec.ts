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
    [{ EXPENSE_DECISION_PROVIDER: 'disabled' }],
    [{ EXPENSE_DECISION_PROVIDER: 'fake' }],
    [{ EXPENSE_DECISION_PROVIDER: 'fake', NODE_ENV: 'test' }],
    [
      {
        EXPENSE_DECISION_PROVIDER: 'google-ai-studio',
        EXPENSE_DECISION_MODEL: 'gemini-x',
        EXPENSE_DECISION_GOOGLE_API_KEYS: 'a,b',
        EXPENSE_DECISION_TIMEOUT_MS: '8000',
        EXPENSE_DECISION_MAX_IMAGE_BYTES: '524288',
      },
    ],
    [
      {
        EXPENSE_DECISION_PROVIDER: 'openai-compatible',
        EXPENSE_DECISION_MODEL: 'm',
        EXPENSE_DECISION_BASE_URL: 'https://gateway.example.test/v1',
        EXPENSE_DECISION_API_KEY: 'k',
      },
    ],
  ])('accepts decision provider configuration %p', (environment) => {
    expect(validateEnvironment(environment)).toEqual(environment)
  })

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
    [{ EXPENSE_DECISION_PROVIDER: 'span-02' }, 'EXPENSE_DECISION_PROVIDER'],
    [{ EXPENSE_DECISION_TIMEOUT_MS: '100' }, 'EXPENSE_DECISION_TIMEOUT_MS'],
    [{ EXPENSE_DECISION_TIMEOUT_MS: '60000' }, 'EXPENSE_DECISION_TIMEOUT_MS'],
    [{ EXPENSE_DECISION_TIMEOUT_MS: 'slow' }, 'EXPENSE_DECISION_TIMEOUT_MS'],
    [{ EXPENSE_DECISION_MAX_IMAGE_BYTES: '0' }, 'EXPENSE_DECISION_MAX_IMAGE_BYTES'],
    [{ EXPENSE_DECISION_PROVIDER: 'google-ai-studio' }, 'EXPENSE_DECISION_MODEL'],
    [
      { EXPENSE_DECISION_PROVIDER: 'google-ai-studio', EXPENSE_DECISION_MODEL: 'gemini-x' },
      'EXPENSE_DECISION_GOOGLE_API_KEYS',
    ],
    [
      {
        EXPENSE_DECISION_PROVIDER: 'google-ai-studio',
        EXPENSE_DECISION_MODEL: 'gemini-x',
        EXPENSE_DECISION_GOOGLE_API_KEYS: ' , ',
      },
      'at least one key',
    ],
    [{ EXPENSE_DECISION_PROVIDER: 'openai-compatible' }, 'EXPENSE_DECISION_BASE_URL'],
    [
      {
        EXPENSE_DECISION_PROVIDER: 'openai-compatible',
        EXPENSE_DECISION_MODEL: 'm',
        EXPENSE_DECISION_BASE_URL: 'https://gateway.example.test/v1',
      },
      'EXPENSE_DECISION_API_KEY',
    ],
    [
      {
        EXPENSE_DECISION_PROVIDER: 'openai-compatible',
        EXPENSE_DECISION_MODEL: 'm',
        EXPENSE_DECISION_BASE_URL: 'ftp://gateway.example.test',
        EXPENSE_DECISION_API_KEY: 'k',
      },
      'http or https URL',
    ],
    [
      {
        NODE_ENV: 'production',
        AUTH_JWT_SECRET: 'a-real-secret',
        EXPENSE_DECISION_PROVIDER: 'fake',
      },
      'not allowed when NODE_ENV=production',
    ],
    [{ FCM_ENABLED: 'true' }, 'FCM_SERVICE_ACCOUNT_FILE'],
    [
      { AUTH_REGISTRATION_VERIFICATION_POLICY: 'sometimes' },
      'AUTH_REGISTRATION_VERIFICATION_POLICY',
    ],
  ])('rejects invalid configuration %p', (environment, expectedMessage) => {
    expect(() => validateEnvironment(environment)).toThrow(expectedMessage)
  })
})
