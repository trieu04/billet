# Billet server

The Billet API is a NestJS application. Business capabilities live in
`src/modules/<feature>`; controllers own HTTP transport, services coordinate use
cases, and persistence or integrations are exposed through injectable providers.

## Run locally

From the repository root:

```sh
cp apps/server/.env.example apps/server/.env
pnpm dev:server
```

Start PostgreSQL first with `docker compose up -d postgres`. The server applies
pending migrations during startup. You can also run or revert migrations explicitly:

```sh
pnpm --filter @billet/server migration:run
pnpm --filter @billet/server migration:revert
```

- Health check: <http://localhost:6701/api/v1/health>
- OpenAPI UI: <http://localhost:6701/docs>

Authentication includes registration/login, email verification, password reset/change,
and optional email or authenticator-app MFA. See OpenAPI for request schemas. Main routes:

Registration requires email and password. A unique username and display name are derived from
the email when omitted; clients may still provide a username (3–30 lowercase letters, digits,
or underscores, starting with a letter). Availability checks accept username, email, or phone number.
Existing accounts receive a `user_<id>` username during migration. Login accepts a username,
email address, or E.164 phone number in the `identifier` field.

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/register/availability`
- `POST /api/v1/auth/register/verification/request|confirm`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout`
- `POST /api/v1/auth/social` with a Google or Apple identity token
- `GET /api/v1/auth/me` with a Bearer token
- `POST /api/v1/auth/verification/request|confirm`
- `POST /api/v1/auth/password-reset/request` and `POST /api/v1/auth/password-reset`
- `PATCH /api/v1/auth/password`
- `/api/v1/auth/mfa/*` enrollment, challenge, verification, and disable routes

Authenticated notification endpoints:

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`
- `DELETE /api/v1/notifications/:id`
- `POST /api/v1/notifications/devices` to register an FCM token
- `DELETE /api/v1/notifications/devices` to deactivate an FCM token

Expense journal endpoints:

- `GET|PATCH /api/v1/profile`, `GET|PATCH /api/v1/profile/settings`, and
  `GET /api/v1/profile/settings/options`
- `GET /api/v1/categories`
- `POST|GET /api/v1/expenses`, `GET|PATCH|DELETE /api/v1/expenses/:id`
- `GET /api/v1/expenses/calendar`, `GET /api/v1/expenses/calendar/history`
- `POST /api/v1/media`, then `PUT /api/v1/media/:id/content`
- `POST|GET /api/v1/recognition-jobs`
- `GET /api/v1/reports/spending`
- `GET|PUT /api/v1/budgets`
- `POST /api/v1/reminders/sync`
- `POST|GET /api/v1/exports`, `GET /api/v1/exports/:id`, and the authenticated download route

Amounts use minor currency units encoded as decimal strings, and all identifiers are
bigint strings. Expense creation requires an idempotency key. Updates require the
current `version` and return `409 Conflict` after a concurrent edit. Aggregates never
mix currencies.

Private media and exports use the injectable object-storage boundary. Development
defaults to owner-only files under `LOCAL_OBJECT_STORAGE_DIRECTORY`; Docker persists this path in
the `billet-storage` volume. Replace the provider with a private S3-compatible adapter
for production. Receipt recognition is also provider-backed; the default disabled
provider records bounded retries and a visible failed status without blocking manual
expense capture.

To enable receipt extraction with a Gemini API key created in Google AI Studio, set
`EXPENSE_RECOGNITION_PROVIDER=google-ai-studio` and
`EXPENSE_RECOGNITION_GOOGLE_API_KEYS` (one key or comma-separated keys). The default
model is `gemini-2.5-flash`; override it with `EXPENSE_RECOGNITION_GOOGLE_MODEL` when needed.
Images stay behind the authenticated media boundary and the API key is used only by
the server. `EXPENSE_RECOGNITION_TIMEOUT_MS` controls the upstream request timeout.
`EXPENSE_RECOGNITION_REQUESTS_PER_MINUTE`, `EXPENSE_RECOGNITION_TOKENS_PER_MINUTE`,
and `EXPENSE_RECOGNITION_REQUESTS_PER_DAY` apply conservative
rolling quota guards before each request; no provider request is sent while an aggregate
limit is exhausted. TPM reservations are reconciled with Gemini's reported token usage.
`EXPENSE_RECOGNITION_GOOGLE_API_KEYS` accepts a comma-separated key pool and selects keys in pure
round-robin order. Configure RPM, TPM, and RPD as totals for the whole pool. Gemini
quotas are commonly scoped to a project/model, so multiple keys from one project do not
increase those upstream quotas. The built-in counters are process-local and assume the
current single server worker; use a shared quota store before scaling the recognition
worker horizontally.

Set `OPENAPI_ENABLED=false` to disable the OpenAPI UI. `HTTP_CORS_ALLOWED_ORIGINS` accepts a
comma-separated allowlist. Environment configuration is validated during startup.

## Adding a feature

1. Create a singular `src/modules/<feature>` folder with a `module.ts` entry point.
   Keep small features flat with conventional names such as `controller.ts`,
   `service.ts`, and `dto.ts`. Group larger features by role with folders such as
   `services/`, `strategies/`, `guards/`, and `decorators/`.
   Keep concrete persistence entities in the feature's `entities/` folder and
   extend the shared bigint `BaseEntity` or `SoftDeleteBaseEntity` for identifiers
   and lifecycle columns. Bigint identifiers remain strings in TypeScript and API
   responses to avoid JavaScript precision loss.
2. Import the feature module from `AppModule`.
3. Validate request data at the controller boundary and keep business decisions in
   the service layer.
4. Add OpenAPI metadata for public endpoints and integration tests for critical
   HTTP behavior.
5. Add persistence through migrations; production schema synchronization is not
   permitted.

The application bootstrap supplies security headers, CORS, strict global request
validation, a stable error response shape, HTTP traffic logging, shutdown hooks,
and generated OpenAPI documentation.

## Foundational modules

- `database`: PostgreSQL connection and versioned migrations. Schema synchronization
  is always disabled.
- `user`: owns the private user entity and maps it to public API responses.
- `auth`: identifier/password authentication, email verification, password recovery,
  purpose-scoped JWTs, and email/TOTP MFA.
- `email`: provider-neutral delivery contract backed by SMTP when enabled.
- `sms`: provider-neutral delivery contract backed by a configurable HTTP endpoint.
- `notification`: persisted, user-scoped in-app notifications with pagination,
  unread counts, read state, deletion, and optional FCM delivery.
- `realtime`: authenticated WebSocket transport at `/ws`, including per-user publish,
  validated command registration, heartbeat, quotas, and graceful shutdown.

Passwords are stored only as bcrypt hashes and are excluded from ordinary entity
queries. OTPs are HMAC-hashed, expire after five minutes, have a resend cooldown,
and are deleted after successful use or five failed attempts.

Authenticated responses include a rotating opaque refresh token. Only its SHA-256
hash is stored. Refresh tokens default to 30 days (`AUTH_REFRESH_TOKEN_TTL`), are
single-use, and are revoked on logout, password reset, or password change.

Registration accepts the verification tokens returned by the pre-registration
email and phone confirmation endpoints. `AUTH_REGISTRATION_VERIFICATION_POLICY`
controls the requirement: `none`, `email`, `phone`, `one_of`, or `both`. The
default is `one_of`. Enable and configure the email and/or SMS delivery providers
needed by the selected policy; a valid supplied token marks its contact verified.

Social sign-in verifies provider ID tokens on the API before issuing a Billet token.
Configure the allowed audiences as comma-separated `AUTH_GOOGLE_OIDC_CLIENT_IDS` and
`AUTH_APPLE_OIDC_CLIENT_IDS` values. Include every web, iOS, and Android client ID used by
the shipped clients. A provider identity is linked to an existing account only when the
provider supplies the same verified email address. Providers with no configured audience are
disabled; clients also omit their buttons when the corresponding public client ID is absent.

Email and SMS delivery are disabled by default. Enable them only after providing all
required `SMTP_*` or `SMS_HTTP_*` variables. The SMS endpoint receives JSON shaped as
`{ to, body, sender }` with `Authorization: Bearer <SMS_HTTP_PROVIDER_TOKEN>`; a vendor-specific
adapter can replace this provider without changing consuming features.

FCM is disabled by default. To enable it, set `FCM_ENABLED=true` and point
`FCM_SERVICE_ACCOUNT_FILE` to a Firebase service-account JSON file readable by the
server process. Mount that file into the server container when using Docker; do not
commit it. Invalid/unregistered device tokens are automatically deactivated.
