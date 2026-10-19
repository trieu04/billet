import { registerAs, type ConfigType } from '@nestjs/config'

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 6701),
  apiPrefix: normalizePath(process.env.API_PREFIX ?? 'api/v1'),
  corsOrigins: parseList(process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN),
  docsPath: normalizePath(process.env.API_DOCS_PATH ?? 'docs'),
  docsEnabled: parseBoolean(process.env.API_DOCS_ENABLED, true),
}))

export type AppConfig = ConfigType<typeof appConfig>

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 6710),
  username: process.env.DB_USERNAME ?? 'billet',
  password: process.env.DB_PASSWORD ?? 'billet',
  name: process.env.DB_NAME ?? 'billet',
  ssl: parseBoolean(process.env.DB_SSL, false),
}))

export type DatabaseConfig = ConfigType<typeof databaseConfig>

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-change-me',
  accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
  registrationVerificationPolicy: process.env.AUTH_REGISTRATION_VERIFICATION_POLICY ?? 'one_of',
}))

export type AuthConfig = ConfigType<typeof authConfig>

export const emailConfig = registerAs('email', () => ({
  enabled: parseBoolean(process.env.EMAIL_ENABLED, false),
  host: process.env.EMAIL_HOST ?? '',
  port: Number(process.env.EMAIL_PORT ?? 587),
  secure: parseBoolean(process.env.EMAIL_SECURE, false),
  user: process.env.EMAIL_USER ?? '',
  password: process.env.EMAIL_PASSWORD ?? '',
  from: process.env.EMAIL_FROM ?? '',
}))

export type EmailConfig = ConfigType<typeof emailConfig>

export const smsConfig = registerAs('sms', () => ({
  enabled: parseBoolean(process.env.SMS_ENABLED, false),
  providerUrl: process.env.SMS_PROVIDER_URL ?? '',
  apiToken: process.env.SMS_API_TOKEN ?? '',
  sender: process.env.SMS_SENDER ?? 'Billet',
  timeoutMs: Number(process.env.SMS_TIMEOUT_MS ?? 10_000),
}))

export type SmsConfig = ConfigType<typeof smsConfig>

export const realtimeConfig = registerAs('realtime', () => ({
  path: process.env.WS_PATH ?? '/ws',
  allowedOrigins: parseList(process.env.WS_ALLOWED_ORIGINS ?? process.env.CORS_ORIGINS),
}))

export type RealtimeConfig = ConfigType<typeof realtimeConfig>

export const firebaseConfig = registerAs('firebase', () => ({
  enabled: parseBoolean(process.env.FIREBASE_ENABLED, false),
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
}))

export type FirebaseConfig = ConfigType<typeof firebaseConfig>

export const recognitionConfig = registerAs('recognition', () => ({
  provider: process.env.RECOGNITION_PROVIDER ?? 'disabled',
  googleAiStudioApiKeys: parseList(process.env.GOOGLE_AI_STUDIO_API_KEYS, ''),
  googleAiStudioModel: process.env.GOOGLE_AI_STUDIO_MODEL ?? 'gemini-2.5-flash',
  timeoutMs: Number(process.env.RECOGNITION_TIMEOUT_MS ?? 30_000),
  requestsPerMinute: Number(process.env.RECOGNITION_RPM ?? 10),
  tokensPerMinute: Number(process.env.RECOGNITION_TPM ?? 250_000),
  requestsPerDay: Number(process.env.RECOGNITION_RPD ?? 250),
  estimatedTokensPerRequest: Number(process.env.RECOGNITION_ESTIMATED_TOKENS ?? 4_096),
}))

export type RecognitionConfig = ConfigType<typeof recognitionConfig>

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
