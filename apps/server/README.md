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

- `GET|PATCH|DELETE /api/v1/profile`, `GET|PATCH /api/v1/profile/settings`, and
  `GET /api/v1/profile/settings/options`. Account deletion is two-step:
  `POST /api/v1/profile/deletion-request` returns a 5-minute `confirmationCode` without deleting
  anything, then `DELETE /api/v1/profile` with `{"confirmationCode":"..."}` permanently removes the
  account, its related data, stored media and exports, and invalidates existing tokens.
- `GET /api/v1/categories`
- `POST|GET /api/v1/expenses`, `GET|PATCH|DELETE /api/v1/expenses/:id`
- `GET /api/v1/expenses/calendar`, `GET /api/v1/expenses/calendar/history`
- `POST /api/v1/media`, then `PUT /api/v1/media/:id/content`
- `GET /api/v1/reports/spending`
- `GET|PUT /api/v1/budgets`
- `POST /api/v1/reminders/sync`
- `POST|GET /api/v1/exports`, `GET /api/v1/exports/:id`, and the authenticated download route
- Photo suggestions: `POST /api/v1/expense-inferences`, `GET /api/v1/suggestion-config`,
  `GET|POST /api/v1/decision-choices`, `PATCH|DELETE /api/v1/decision-choices/:id`,
  `GET|POST /api/v1/expense-rules`, `PATCH|DELETE /api/v1/expense-rules/:id`

Amounts use minor currency units encoded as decimal strings, and all identifiers are
bigint strings. Expense creation requires an idempotency key. Updates require the
current `version` and return `409 Conflict` after a concurrent edit. Aggregates never
mix currencies.

Private media and exports use the injectable object-storage boundary. Development
defaults to owner-only files under `LOCAL_OBJECT_STORAGE_DIRECTORY`; Docker persists this path in
the `billet-storage` volume. Replace the provider with a private S3-compatible adapter
for production.

Set `OPENAPI_ENABLED=false` to disable the OpenAPI UI. `HTTP_CORS_ALLOWED_ORIGINS` accepts a
comma-separated allowlist. Environment configuration is validated during startup.

## Photo expense suggestion: decision provider

`src/modules/recognition` defines the `DecisionProvider` contract (`interface.ts`) that classifies
a compressed JPEG into one of the supplied image types, categories and personal choices. Choices
are passed as short request-scoped `ref` codes and the provider answers with refs plus a
confidence from 0 to 1; `category` and `personal` may be `null`. `assertDecisionRefs` in
`decision-output.ts` checks that every returned ref belongs to the request. Adapters normalize
failures to `DecisionProviderError` with reason `timeout`, `provider_rate_limited`,
`provider_error`, `invalid_output`, or `disabled`, honor the `AbortSignal`, and return token usage
when the provider reports it. Nothing logs images, labels, or raw provider output.

Configuration (validated at startup; `.env.example` lists all of them):

| Variable                           | Default    | Notes                                                                                          |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `EXPENSE_DECISION_PROVIDER`        | `disabled` | `disabled`, `fake`, `google-ai-studio`, `openai-compatible`. `fake` is rejected in production. |
| `EXPENSE_DECISION_MODEL`           |            | Required for `google-ai-studio` and `openai-compatible`.                                       |
| `EXPENSE_DECISION_BASE_URL`        |            | Required for `openai-compatible`; Chat Completions base URL such as `https://host/v1`.         |
| `EXPENSE_DECISION_API_KEY`         |            | Required for `openai-compatible`; sent as a Bearer token.                                      |
| `EXPENSE_DECISION_GOOGLE_API_KEYS` |            | Required for `google-ai-studio`; comma-separated pool, rotated per request and on HTTP 429.    |
| `EXPENSE_DECISION_TIMEOUT_MS`      | `5000`     | Integer between 500 and 30000.                                                                 |
| `EXPENSE_DECISION_MAX_IMAGE_BYTES` | `1048576`  | Largest compressed image accepted, 1024 to 10485760.                                           |

Other adapters (`span-02`, `d1-ultra`, `jev`, `decider`, `gpt-luna-decision`) are added one by
one in benchmark order; `DecisionProvider.id` is an open string for that reason.

### Decision benchmark

Compare providers on a labelled photo set kept outside the repository (never commit images or
results that contain personal data):

```sh
pnpm --filter @billet/server bench:decision --provider <fake|google-ai-studio|openai-compatible> --dataset <dir> [--runs <n>] [--json]
```

Provider settings come from the same `EXPENSE_DECISION_*` variables (an `apps/server/.env` file is
loaded when present), and `--provider` overrides `EXPENSE_DECISION_PROVIDER`. The dataset
directory contains the images and a `labels.json`:

```json
{
  "locale": "vi",
  "choices": {
    "imageTypes": [
      { "key": "receipt", "label": "Receipt", "description": "Printed bill or invoice" },
      { "key": "food", "label": "Food" }
    ],
    "categories": [{ "label": "Eating out" }, { "label": "Transport" }],
    "personal": [{ "label": "Parking at Nguyen Hue" }]
  },
  "images": [
    { "file": "receipt-01.jpg", "imageType": "receipt", "category": "Eating out" },
    {
      "file": "ticket-02.jpg",
      "imageType": "receipt",
      "category": "Transport",
      "personal": "Parking at Nguyen Hue"
    }
  ]
}
```

- `imageTypes` need a unique `key` (the expected value in `images[].imageType`); `categories` and
  `personal` are identified by unique `label`. `description` is optional and goes into the prompt.
- `images[].category` and `images[].personal` are labels from the lists; omit them or use `null`
  when no category or personal choice applies. `file` is relative to the dataset directory.
- Every image is compressed like the client (orientation applied, long edge 1024 px, JPEG quality
  0.6, EXIF stripped, retry at 0.45 above 400 KB) with `sharp` (a devDependency), then sent to the
  provider once per run. Attempts run sequentially with `EXPENSE_DECISION_TIMEOUT_MS` as the deadline.

The report shows accuracy and macro-F1 (over expected and predicted classes; no category counts as
`(none)`) for image type and category, personal-choice precision, recall and coverage, a
confidence calibration table with ECE for each, latency P50/P95 over all attempts, token usage, and
cost per image when the provider reports `costMicroUsd`. Failed attempts (timeouts, rate limits,
invalid output) are counted by reason and excluded from the quality metrics. The command exits
non-zero when no attempt succeeds. With `--provider fake` it exercises the pipeline without network
access; its pseudo-random answers make the quality numbers meaningless.

## Photo expense suggestion: API, rules, and learner

Design: [`docs/technical-design/03-photo-expense-suggestion.md`](../../docs/technical-design/03-photo-expense-suggestion.md).

- `POST /expense-inferences` (multipart: `image` JPEG, `clientRequestId`, `timezone`, `locale`,
  optional `placeKey`; optional `X-Billet-Deadline-Ms` header). The server builds the choice set
  (8 system image types, the account categories, up to 20 enabled personal choices with the same
  `placeKey` first), maps database ids to short refs, and calls one provider within
  `min(deadline, EXPENSE_DECISION_TIMEOUT_MS)`; below 1 s it skips the provider (`deadline`). The
  call is aborted when the client disconnects. Output outside the choice set is
  `invalid_output`. Provider failures always return `200` with `status: unavailable` and a
  `reason`; `suggestionsEnabled=false` or `EXPENSE_DECISION_PROVIDER=disabled` return
  `status: disabled`. `413` (over `EXPENSE_DECISION_MAX_IMAGE_BYTES`), `415` (not a JPEG by magic
  bytes), and `400` (fields) reject the input. Results are stored per
  `(user, clientRequestId)` and replayed on repeat; the image itself is never stored.
  `imageType.id` is the image type key; `category.id` and `personalChoice.id` are bigint ids.
- `GET /suggestion-config` returns the client snapshot (image types, enabled personal choices and
  learned/user rules, default rules, thresholds, `decisionImage`, `features`) with an `ETag`;
  `If-None-Match` returns `304`.
- `/decision-choices` and `/expense-rules` list system items (read-only, `404` on change) and the
  account items; `PATCH` requires the current `version` (`409` when stale). Editing a `learned`
  item turns it into a `user` item; deleting one blocks relearning its key for 90 days. Caps: 100
  personal choices and 500 rules; the least used `learned` item is evicted first.
- `PATCH /profile/settings` accepts `suggestionsEnabled` (default `true`), `ruleLearningEnabled`
  (default `true`), and `suggestionLocationEnabled` (default `false`; without it a `placeKey` is
  ignored).
- Expense create/update accept `inferenceId` and `personalChoiceId` (must belong to the account),
  `imageType`, `placeKey` (7-character geohash), `merchantKey` (re-normalized with the shared
  rules in `utils/keys.ts`), and `fieldProvenance` (field → `{ source, ruleId?, choiceId?,
  confidence?, outcome }`). `fieldSources` is derived from `fieldProvenance`, and `source` becomes
  `recognition` when `inferenceId` is present.
- After an expense is created, updated, or deleted, `ExpenseService` calls `LearnerService`
  (best effort; failures are logged without amounts or labels). The pure core in
  `utils/learning.ts` reads up to 10 expenses within 180 days per learning key and currency,
  weights them with a 60-day half-life, creates a `learned` personal choice for
  `imageType+placeKey` / `imageType+merchantKey` at 3 expenses, and creates or updates a rule when
  one amount holds at least 60% of the weight over at least 3 expenses (lowering or disabling the
  learned rule otherwise). It never changes `user` items.
- Choice sets are cached per user in process: categories are revalidated on every request with a
  cheap catalog fingerprint, personal choices are invalidated on change, and a 60-second TTL bounds
  staleness across instances.
- A daily job removes inferences older than 90 days. Deleting an account cascades to its choices,
  rules, and inferences. Each inference logs one `expense_inference` JSON line (provider, model,
  status, reason, latency, image size, tokens), and per-provider request/token totals are logged
  as `expense_inference_usage` when each minute and day window closes.

The database-backed e2e suite (`test/expense-suggestions.e2e-spec.ts`) is skipped unless
`E2E_DATABASE=true`. Run it against a disposable, migrated PostgreSQL, for example:

```sh
docker run -d --rm --name billet-e2e-pg -e POSTGRES_USER=billet -e POSTGRES_PASSWORD=billet \
  -e POSTGRES_DB=billet -p 6719:5432 postgres:16-alpine
E2E_DATABASE=true DATABASE_PORT=6719 DATABASE_PASSWORD=billet OPENAPI_PATH=docs \
  pnpm --filter @billet/server test:e2e
docker stop billet-e2e-pg
```

## Admin API

`/api/v1/admin/**` serves the recognition admin page at `/admin` on the web app: statistics, a
de-identified inference log, the system image type and default rule catalog, and a provider
playground. Access is limited to the accounts in `ADMIN_USER_IDS`, a comma-separated list of user
ids (not usernames, which anyone can register). Empty means nobody; a change needs a restart. Find
an id with `SELECT id FROM users WHERE username = '...'`.

JSON responses never contain email, username, amounts, merchants, place keys, captions, or media
ids; `userId` is the only reference to a person. Two exceptions:
`GET /api/v1/admin/recognition/inferences/:id` returns `input`, the choice set the provider was
offered (image types, the account's category names and personal choice labels, never the image),
and `output`, the refs it returned with their labels; and
`GET /api/v1/admin/recognition/inferences/:id/linked-expenses/:index/photo` returns the photo
saved with a linked expense. The list endpoint stays de-identified. `input` and `output` are stored
on the inference row (jsonb), so they are removed with it after 90 days and with the account; rows
created before they were kept return `null`. That photo can show a merchant, an amount, or a face, and views are not
logged. Images sent to the provider are never stored, so an inference without a saved expense photo
has nothing to show. The playground
uses the real provider and its real cost, stores nothing, and allows 20 requests per minute per
admin on each instance.

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
