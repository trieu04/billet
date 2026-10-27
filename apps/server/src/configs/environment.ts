const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const
const REGISTRATION_VERIFICATION_POLICIES = ['none', 'email', 'phone', 'one_of', 'both'] as const
const RECOGNITION_PROVIDERS = ['disabled', 'google-ai-studio'] as const

export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = []
  const nodeEnv = getString(environment, 'NODE_ENV', 'development')
  const port = getNumber(environment, 'SERVER_PORT', 6701)
  const apiPrefix = getString(environment, 'API_PATH_PREFIX', 'api/v1')
  const docsPath = getString(environment, 'OPENAPI_PATH', 'docs')
  const databasePort = getNumber(environment, 'DATABASE_PORT', 6710)
  const jwtSecret = getString(environment, 'AUTH_JWT_SECRET', 'development-only-change-me')
  const accessTokenTtl = getString(environment, 'AUTH_ACCESS_TOKEN_TTL', '15m')
  const refreshTokenTtl = getString(environment, 'AUTH_REFRESH_TOKEN_TTL', '30d')
  const smtpPort = getNumber(environment, 'SMTP_PORT', 587)
  const smsTimeoutMs = getNumber(environment, 'SMS_HTTP_TIMEOUT_MS', 10_000)
  const webSocketPath = getString(environment, 'REALTIME_WEBSOCKET_PATH', '/ws')
  const registrationVerificationPolicy = getString(
    environment,
    'AUTH_REGISTRATION_VERIFICATION_POLICY',
    'one_of',
  )
  const recognitionProvider = getString(environment, 'EXPENSE_RECOGNITION_PROVIDER', 'disabled')
  const recognitionTimeoutMs = getNumber(environment, 'EXPENSE_RECOGNITION_TIMEOUT_MS', 30_000)
  const recognitionLimits = [
    ['EXPENSE_RECOGNITION_REQUESTS_PER_MINUTE', 10],
    ['EXPENSE_RECOGNITION_TOKENS_PER_MINUTE', 250_000],
    ['EXPENSE_RECOGNITION_REQUESTS_PER_DAY', 250],
    ['EXPENSE_RECOGNITION_ESTIMATED_TOKENS_PER_REQUEST', 4_096],
  ] as const

  if (!NODE_ENVIRONMENTS.includes(nodeEnv as (typeof NODE_ENVIRONMENTS)[number])) {
    errors.push(`NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}`)
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    errors.push('SERVER_PORT must be an integer between 1 and 65535')
  }
  if (!apiPrefix.replace(/^\/+|\/+$/g, '')) {
    errors.push('API_PATH_PREFIX must contain at least one path segment')
  }
  if (!docsPath.replace(/^\/+|\/+$/g, '')) {
    errors.push('OPENAPI_PATH must contain at least one path segment')
  }
  if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65_535) {
    errors.push('DATABASE_PORT must be an integer between 1 and 65535')
  }
  if (nodeEnv === 'production' && jwtSecret === 'development-only-change-me') {
    errors.push('AUTH_JWT_SECRET must be changed in production')
  }
  if (!/^\d+[smhd]$/.test(accessTokenTtl)) {
    errors.push('AUTH_ACCESS_TOKEN_TTL must use a duration such as 15m, 1h, or 7d')
  }
  if (!/^\d+[smhd]$/.test(refreshTokenTtl)) {
    errors.push('AUTH_REFRESH_TOKEN_TTL must use a duration such as 30d, 12h, or 7d')
  }
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535) {
    errors.push('SMTP_PORT must be an integer between 1 and 65535')
  }
  if (!Number.isInteger(smsTimeoutMs) || smsTimeoutMs < 100 || smsTimeoutMs > 60_000) {
    errors.push('SMS_HTTP_TIMEOUT_MS must be an integer between 100 and 60000')
  }
  if (
    !RECOGNITION_PROVIDERS.includes(recognitionProvider as (typeof RECOGNITION_PROVIDERS)[number])
  ) {
    errors.push(`EXPENSE_RECOGNITION_PROVIDER must be one of: ${RECOGNITION_PROVIDERS.join(', ')}`)
  }
  for (const [key, fallback] of recognitionLimits) {
    const value = getNumber(environment, key, fallback)
    if (!Number.isSafeInteger(value) || value < 1) errors.push(`${key} must be a positive integer`)
  }
  if (
    !Number.isInteger(recognitionTimeoutMs) ||
    recognitionTimeoutMs < 1_000 ||
    recognitionTimeoutMs > 120_000
  ) {
    errors.push('EXPENSE_RECOGNITION_TIMEOUT_MS must be an integer between 1000 and 120000')
  }
  if (
    !webSocketPath.startsWith('/') ||
    webSocketPath.includes('?') ||
    webSocketPath.includes('#')
  ) {
    errors.push('REALTIME_WEBSOCKET_PATH must be an absolute path without query or fragment')
  }

  validateBoolean(environment, 'OPENAPI_ENABLED', errors)
  validateBoolean(environment, 'DATABASE_SSL_ENABLED', errors)
  validateBoolean(environment, 'SMTP_ENABLED', errors)
  validateBoolean(environment, 'SMTP_TLS_ENABLED', errors)
  validateBoolean(environment, 'SMS_HTTP_PROVIDER_ENABLED', errors)
  validateBoolean(environment, 'FCM_ENABLED', errors)
  if (
    !REGISTRATION_VERIFICATION_POLICIES.includes(
      registrationVerificationPolicy as (typeof REGISTRATION_VERIFICATION_POLICIES)[number],
    )
  ) {
    errors.push(
      `AUTH_REGISTRATION_VERIFICATION_POLICY must be one of: ${REGISTRATION_VERIFICATION_POLICIES.join(', ')}`,
    )
  }
  validateRequiredWhenEnabled(
    environment,
    'SMTP_ENABLED',
    ['SMTP_HOST', 'SMTP_FROM_ADDRESS'],
    errors,
  )
  validateRequiredWhenEnabled(
    environment,
    'SMS_HTTP_PROVIDER_ENABLED',
    ['SMS_HTTP_PROVIDER_URL', 'SMS_HTTP_PROVIDER_TOKEN', 'SMS_SENDER_NAME'],
    errors,
  )

  if (recognitionProvider === 'google-ai-studio' && !hasConfiguredApiKey(environment)) {
    errors.push(
      'EXPENSE_RECOGNITION_GOOGLE_API_KEYS is required when EXPENSE_RECOGNITION_PROVIDER=google-ai-studio',
    )
  }

  validateRequiredWhenEnabled(environment, 'FCM_ENABLED', ['FCM_SERVICE_ACCOUNT_FILE'], errors)

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`)
  }

  return environment
}

function hasConfiguredApiKey(environment: Record<string, unknown>): boolean {
  const keys = environment.EXPENSE_RECOGNITION_GOOGLE_API_KEYS
  return typeof keys === 'string' && keys.split(',').some((value) => value.trim().length > 0)
}

function validateRequiredWhenEnabled(
  environment: Record<string, unknown>,
  enabledKey: string,
  requiredKeys: string[],
  errors: string[],
): void {
  if (environment[enabledKey] !== 'true') return
  for (const key of requiredKeys) {
    if (typeof environment[key] !== 'string' || environment[key].trim() === '') {
      errors.push(`${key} is required when ${enabledKey}=true`)
    }
  }
}

function getString(environment: Record<string, unknown>, key: string, fallback: string): string {
  const value = environment[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function getNumber(environment: Record<string, unknown>, key: string, fallback: number): number {
  const value = environment[key]
  return value === undefined || value === '' ? fallback : Number(value)
}

function validateBoolean(
  environment: Record<string, unknown>,
  key: string,
  errors: string[],
): void {
  const value = environment[key]
  if (value !== undefined && value !== 'true' && value !== 'false') {
    errors.push(`${key} must be either true or false`)
  }
}
