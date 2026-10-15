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

Registration requires a unique username (3–30 lowercase letters, digits, or underscores,
starting with a letter). Availability checks accept username, email, or phone number.
Existing accounts receive a `user_<id>` username during migration. Login remains email based.

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/register/availability`
- `POST /api/v1/auth/register/verification/request|confirm`
- `POST /api/v1/auth/login`
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

- `GET /api/v1/profile` and `GET|PATCH /api/v1/profile/settings`
- `GET /api/v1/categories`
- `POST|GET /api/v1/expenses`, `GET|PATCH|DELETE /api/v1/expenses/:id`
- `GET /api/v1/expenses/calendar`
- `POST /api/v1/media`, then `PUT /api/v1/media/:id/content`
- `POST|GET /api/v1/recognition-jobs`
- `GET /api/v1/reports/spending`
- `GET|PUT /api/v1/budgets`
- `POST /api/v1/reminders/sync`
- `POST /api/v1/exports`, `GET /api/v1/exports/:id`, and the authenticated download route

Amounts use minor currency units encoded as decimal strings, and all identifiers are
bigint strings. Expense creation requires an idempotency key. Updates require the
current `version` and return `409 Conflict` after a concurrent edit. Aggregates never
mix currencies.

Private media and exports use the injectable object-storage boundary. Development
defaults to owner-only files under `OBJECT_STORAGE_PATH`; Docker persists this path in
the `billet-storage` volume. Replace the provider with a private S3-compatible adapter
for production. Receipt recognition is also provider-backed; the default disabled
provider records bounded retries and a visible failed status without blocking manual
expense capture.

Set `API_DOCS_ENABLED=false` to disable the OpenAPI UI. `CORS_ORIGINS` accepts a
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
- `auth`: email/password authentication, email verification, password recovery,
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

Registration accepts the verification tokens returned by the pre-registration
email and phone confirmation endpoints. `AUTH_REGISTRATION_VERIFICATION_POLICY`
controls the requirement: `none`, `email`, `phone`, `one_of`, or `both`. The
default is `one_of`. Enable and configure the email and/or SMS delivery providers
needed by the selected policy; a valid supplied token marks its contact verified.

Email and SMS delivery are disabled by default. Enable them only after providing all
required `EMAIL_*` or `SMS_*` variables. The SMS endpoint receives JSON shaped as
`{ to, body, sender }` with `Authorization: Bearer <SMS_API_TOKEN>`; a vendor-specific
adapter can replace this provider without changing consuming features.

FCM is disabled by default. To enable it, set `FIREBASE_ENABLED=true` and provide
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. Escaped
newlines in the private key are expanded at startup. Invalid/unregistered device
tokens are automatically deactivated.
