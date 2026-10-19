const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const
const REGISTRATION_VERIFICATION_POLICIES = ['none', 'email', 'phone', 'one_of', 'both'] as const
const RECOGNITION_PROVIDERS = ['disabled', 'google-ai-studio'] as const

export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = []
  const nodeEnv = getString(environment, 'NODE_ENV', 'development')
  const port = getNumber(environment, 'PORT', 6701)
  const apiPrefix = getString(environment, 'API_PREFIX', 'api/v1')
  const docsPath = getString(environment, 'API_DOCS_PATH', 'docs')
  const dbPort = getNumber(environment, 'DB_PORT', 6710)
  const jwtSecret = getString(environment, 'JWT_SECRET', 'development-only-change-me')
  const accessTokenTtl = getString(environment, 'JWT_ACCESS_TOKEN_TTL', '15m')
  const emailPort = getNumber(environment, 'EMAIL_PORT', 587)
  const smsTimeoutMs = getNumber(environment, 'SMS_TIMEOUT_MS', 10_000)
  const wsPath = getString(environment, 'WS_PATH', '/ws')
  const registrationVerificationPolicy = getString(
    environment,
    'AUTH_REGISTRATION_VERIFICATION_POLICY',
    'one_of',
  )
  const recognitionProvider = getString(environment, 'RECOGNITION_PROVIDER', 'disabled')
  const recognitionTimeoutMs = getNumber(environment, 'RECOGNITION_TIMEOUT_MS', 30_000)
  const recognitionLimits = [
    ['RECOGNITION_RPM', 10],
    ['RECOGNITION_TPM', 250_000],
    ['RECOGNITION_RPD', 250],
    ['RECOGNITION_ESTIMATED_TOKENS', 4_096],
  ] as const

  if (!NODE_ENVIRONMENTS.includes(nodeEnv as (typeof NODE_ENVIRONMENTS)[number])) {
    errors.push(`NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}`)
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    errors.push('PORT must be an integer between 1 and 65535')
  }
  if (!apiPrefix.replace(/^\/+|\/+$/g, '')) {
    errors.push('API_PREFIX must contain at least one path segment')
  }
  if (!docsPath.replace(/^\/+|\/+$/g, '')) {
    errors.push('API_DOCS_PATH must contain at least one path segment')
  }
  if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65_535) {
    errors.push('DB_PORT must be an integer between 1 and 65535')
  }
  if (nodeEnv === 'production' && jwtSecret === 'development-only-change-me') {
    errors.push('JWT_SECRET must be changed in production')
  }
  if (!/^\d+[smhd]$/.test(accessTokenTtl)) {
    errors.push('JWT_ACCESS_TOKEN_TTL must use a duration such as 15m, 1h, or 7d')
  }
  if (!Number.isInteger(emailPort) || emailPort < 1 || emailPort > 65_535) {
    errors.push('EMAIL_PORT must be an integer between 1 and 65535')
  }
  if (!Number.isInteger(smsTimeoutMs) || smsTimeoutMs < 100 || smsTimeoutMs > 60_000) {
    errors.push('SMS_TIMEOUT_MS must be an integer between 100 and 60000')
  }
  if (
    !RECOGNITION_PROVIDERS.includes(recognitionProvider as (typeof RECOGNITION_PROVIDERS)[number])
  ) {
    errors.push(`RECOGNITION_PROVIDER must be one of: ${RECOGNITION_PROVIDERS.join(', ')}`)
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
    errors.push('RECOGNITION_TIMEOUT_MS must be an integer between 1000 and 120000')
  }
  if (!wsPath.startsWith('/') || wsPath.includes('?') || wsPath.includes('#')) {
    errors.push('WS_PATH must be an absolute path without query or fragment')
  }

  validateBoolean(environment, 'API_DOCS_ENABLED', errors)
  validateBoolean(environment, 'DB_SSL', errors)
  validateBoolean(environment, 'EMAIL_ENABLED', errors)
  validateBoolean(environment, 'EMAIL_SECURE', errors)
  validateBoolean(environment, 'SMS_ENABLED', errors)
  validateBoolean(environment, 'FIREBASE_ENABLED', errors)
  if (
    !REGISTRATION_VERIFICATION_POLICIES.includes(
      registrationVerificationPolicy as (typeof REGISTRATION_VERIFICATION_POLICIES)[number],
    )
  ) {
    errors.push(
      `AUTH_REGISTRATION_VERIFICATION_POLICY must be one of: ${REGISTRATION_VERIFICATION_POLICIES.join(', ')}`,
    )
  }
  validateRequiredWhenEnabled(environment, 'EMAIL_ENABLED', ['EMAIL_HOST', 'EMAIL_FROM'], errors)
  validateRequiredWhenEnabled(
    environment,
    'SMS_ENABLED',
    ['SMS_PROVIDER_URL', 'SMS_API_TOKEN', 'SMS_SENDER'],
    errors,
  )

  if (recognitionProvider === 'google-ai-studio' && !hasConfiguredApiKey(environment)) {
    errors.push('GOOGLE_AI_STUDIO_API_KEYS is required when RECOGNITION_PROVIDER=google-ai-studio')
  }

  validateRequiredWhenEnabled(
    environment,
    'FIREBASE_ENABLED',
    ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
    errors,
  )

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`)
  }

  return environment
}

function hasConfiguredApiKey(environment: Record<string, unknown>): boolean {
  const keys = environment.GOOGLE_AI_STUDIO_API_KEYS
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
