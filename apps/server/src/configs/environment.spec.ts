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
    [
      { AUTH_REGISTRATION_VERIFICATION_POLICY: 'sometimes' },
      'AUTH_REGISTRATION_VERIFICATION_POLICY',
    ],
  ])('rejects invalid configuration %p', (environment, expectedMessage) => {
    expect(() => validateEnvironment(environment)).toThrow(expectedMessage)
  })
})
