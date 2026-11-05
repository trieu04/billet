import { registerAs, type ConfigType } from '@nestjs/config'
import { DECISION_PROVIDER_IDS, type DecisionProviderId } from './environment'

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.SERVER_HOST ?? '0.0.0.0',
  port: Number(process.env.SERVER_PORT ?? 6701),
  apiPrefix: normalizePath(process.env.API_PATH_PREFIX ?? 'api/v1'),
  corsOrigins: parseList(process.env.HTTP_CORS_ALLOWED_ORIGINS),
  docsPath: normalizePath(process.env.OPENAPI_PATH ?? 'docs'),
  docsEnabled: parseBoolean(process.env.OPENAPI_ENABLED, true),
}))

export type AppConfig = ConfigType<typeof appConfig>

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 6710),
  username: process.env.DATABASE_USERNAME ?? 'billet',
  password: process.env.DATABASE_PASSWORD ?? 'billet',
  name: process.env.DATABASE_NAME ?? 'billet',
  ssl: parseBoolean(process.env.DATABASE_SSL_ENABLED, false),
}))

export type DatabaseConfig = ConfigType<typeof databaseConfig>

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.AUTH_JWT_SECRET ?? 'development-only-change-me',
  accessTokenTtl: process.env.AUTH_ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.AUTH_REFRESH_TOKEN_TTL ?? '30d',
  registrationVerificationPolicy: process.env.AUTH_REGISTRATION_VERIFICATION_POLICY ?? 'one_of',
  googleClientIds: parseList(process.env.AUTH_GOOGLE_OIDC_CLIENT_IDS, ''),
  appleClientIds: parseList(process.env.AUTH_APPLE_OIDC_CLIENT_IDS, ''),
  adminUserIds: parseList(process.env.ADMIN_USER_IDS, ''),
}))

export type AuthConfig = ConfigType<typeof authConfig>

export const emailConfig = registerAs('email', () => ({
  enabled: parseBoolean(process.env.SMTP_ENABLED, false),
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: parseBoolean(process.env.SMTP_TLS_ENABLED, false),
  user: process.env.SMTP_USERNAME ?? '',
  password: process.env.SMTP_PASSWORD ?? '',
  from: process.env.SMTP_FROM_ADDRESS ?? '',
}))

export type EmailConfig = ConfigType<typeof emailConfig>

export const smsConfig = registerAs('sms', () => ({
  enabled: parseBoolean(process.env.SMS_HTTP_PROVIDER_ENABLED, false),
  providerUrl: process.env.SMS_HTTP_PROVIDER_URL ?? '',
  apiToken: process.env.SMS_HTTP_PROVIDER_TOKEN ?? '',
  sender: process.env.SMS_SENDER_NAME ?? 'Billet',
  timeoutMs: Number(process.env.SMS_HTTP_TIMEOUT_MS ?? 10_000),
}))

export type SmsConfig = ConfigType<typeof smsConfig>

export const realtimeConfig = registerAs('realtime', () => ({
  path: process.env.REALTIME_WEBSOCKET_PATH ?? '/ws',
  allowedOrigins: parseList(
    process.env.REALTIME_WEBSOCKET_ALLOWED_ORIGINS ?? process.env.HTTP_CORS_ALLOWED_ORIGINS,
  ),
}))

export type RealtimeConfig = ConfigType<typeof realtimeConfig>

export const firebaseConfig = registerAs('firebase', () => ({
  enabled: parseBoolean(process.env.FCM_ENABLED, false),
  serviceAccountFile: process.env.FCM_SERVICE_ACCOUNT_FILE ?? '',
}))

export type FirebaseConfig = ConfigType<typeof firebaseConfig>

export const mediaConfig = registerAs('media', () => ({
  maxFileSizeBytes: Number(process.env.MEDIA_MAX_FILE_SIZE_BYTES ?? 15_000_000),
}))

export type MediaConfig = ConfigType<typeof mediaConfig>

export interface DecisionConfigValues {
  provider: DecisionProviderId
  model: string
  baseUrl: string
  apiKey: string
  googleApiKeys: string[]
  timeoutMs: number
  maxImageBytes: number
}

/** Read photo-suggestion decision settings from an environment map (already validated at startup). */
export function readDecisionConfig(env: NodeJS.ProcessEnv): DecisionConfigValues {
  const provider = env.EXPENSE_DECISION_PROVIDER?.trim() || 'disabled'
  return {
    provider: DECISION_PROVIDER_IDS.find((id) => id === provider) ?? 'disabled',
    model: env.EXPENSE_DECISION_MODEL?.trim() ?? '',
    baseUrl: env.EXPENSE_DECISION_BASE_URL?.trim() ?? '',
    apiKey: env.EXPENSE_DECISION_API_KEY?.trim() ?? '',
    googleApiKeys: parseList(env.EXPENSE_DECISION_GOOGLE_API_KEYS, ''),
    timeoutMs: Number(env.EXPENSE_DECISION_TIMEOUT_MS || 5_000),
    maxImageBytes: Number(env.EXPENSE_DECISION_MAX_IMAGE_BYTES || 1_048_576),
  }
}

export const decisionConfig = registerAs('decision', () => readDecisionConfig(process.env))

export type DecisionConfig = ConfigType<typeof decisionConfig>

function normalizePath(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '')
}

function parseList(value: string | undefined, fallback = 'http://localhost:6702'): string[] {
  return (value ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}
