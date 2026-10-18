# Billet

Billet is a visual expense journal: **Locket meets Money Tracker**. It turns receipts, purchases, and meals into memorable journal entries while keeping expense totals and patterns available in the background.

This repository is a pnpm monorepo with a NestJS API, a Vite + React web app, and an Expo Router mobile app. It intentionally does not use Turborepo.

## Prerequisites

- Node.js 22 or newer
- pnpm 12.8.1 (Corepack recommended)
- Docker and Docker Compose (optional)
- Expo Go or a native simulator for mobile development (optional)

## Setup

```sh
corepack enable
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev
```

The default development URLs are:

- Server health: <http://localhost:6701/api/v1/health>
- Server API docs: <http://localhost:6701/docs>
- Server realtime: `ws://localhost:6701/ws`
- Web: <http://localhost:6702>
- Web health page: <http://localhost:6702/health>
- Expo/Metro: port `6703`
- Mobile: use the URL or QR code printed by Expo

In native Expo development, a loopback `EXPO_PUBLIC_API_BASE_URL` automatically
uses the LAN host advertised by Metro, so the default works on simulators and
physical phones. You can still set an explicit reachable URL when Metro and the
API run on different machines.

## Commands

| Command             | Purpose                         |
| ------------------- | ------------------------------- |
| `pnpm dev`          | Run all apps in parallel        |
| `pnpm dev:server`   | Run only the NestJS API         |
| `pnpm dev:web`      | Run only the Vite web app       |
| `pnpm dev:mobile`   | Run only Expo                   |
| `pnpm build`        | Build/export every app          |
| `pnpm lint`         | Lint every app                  |
| `pnpm typecheck`    | Type-check every app            |
| `pnpm test`         | Run every test suite            |
| `pnpm format`       | Format repository files         |
| `pnpm format:check` | Check formatting without writes |

Run an app command with pnpm filters, for example:

```sh
pnpm --filter @billet/server test:e2e
pnpm --filter @billet/web preview
pnpm --filter @billet/mobile ios
```

## Repository structure

```text
apps/
  server/   NestJS API; domain code belongs in src/modules/<feature>
  web/      Vite + React; product code belongs in src/features/<feature>
  mobile/   Expo Router; routes live in app and product code in features
.github/workflows/ci.yml
docker-compose.yml
pnpm-workspace.yaml
```

Shared packages should be added under `packages/` only after two or more apps need the same stable contract. Keep platform-specific UI inside its app.

## Docker

Build and run PostgreSQL, the API, web application, and the production-mode
Expo/Metro server:

```sh
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
docker compose up --build
```

The dedicated Compose gateway container is available on
<http://localhost:6700>. It proxies `/` to the web container, `/api` to the API,
`/expo` to Expo/Metro, `/ws` to the realtime server, and `/docs` to the API
documentation. Each application container also keeps a dedicated published
port for direct access: API `6701`, web `6702`, and Expo/Metro `6703`. Metro
serves minified production bundles (`--no-dev --minify`); native App Store and
Play Store releases should still be built with EAS or the native toolchains.

Each application service reads its own `apps/<app>/.env` file. Before opening
the Compose-hosted bundle on a physical device, configure
`apps/mobile/.env` with the reachable gateway and packager host:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:6700/api/v1
EXPO_TOKEN=replace-with-an-expo-access-token
EXPO_PACKAGER_HOSTNAME=192.168.1.10
```

The phone and development machine must be on the same network.
The mobile container uses `EXPO_TOKEN` to authenticate Expo CLI without an
interactive login. Keep it in `apps/mobile/.env` on the deployment host; never
prefix it with `EXPO_PUBLIC_` or commit it. Sign in to the same Expo account in
Expo Go before opening the project link or scanning its QR code.
PostgreSQL is exposed on local port `6710`; the server applies checked-in migrations when it starts.

## Port allocation

Billet reserves ports by service ownership. For Docker Compose, the published
application ports are:

- `6700`: main gateway (`billet.devt.vn` in production).
- `6701`: direct API access.
- `6702`: direct web access.
- `6703`: direct Expo/Metro access.
- `6710–6719`: external infrastructure used by the application, such as PostgreSQL, Redis, or local emulators. PostgreSQL should use `6710` when introduced.

Container, published, and non-Compose development ports are aligned for each
service: API `6701`, web `6702`, and Expo/Metro `6703`.

Do not assign a port outside these ranges without updating this policy and checking for collisions across local and Docker environments.

## Environment variables

Every app has a committed `.env.example` containing safe development defaults.
Copy it to `.env` in the same app directory before running Docker Compose; all
real environment files are ignored. Compose overrides only container-specific
values such as internal hostnames and ports. Variables prefixed with `VITE_` or
`EXPO_PUBLIC_` are bundled into client applications and must never contain
secrets. The web `.env` is mounted only for the Vite build and is not copied
into the resulting image. The root `.env` is reserved for Docker Compose host
settings such as `PUBLISHED_*_PORT` values. The example reserves ports
`6700–6703` and `6710`; clear an individual value to let Docker allocate an
available host port instead.

## Architecture notes

The initial conventions follow the supplied VNPreventStroke reference projects without copying their product code or credentials:

- The server uses Nest modules, global configuration, validation, CORS, and shutdown hooks.
- The web app uses feature-first folders, centralized routes/providers, React Query, Tailwind CSS, and Vitest.
- The mobile app uses file-based Expo Router routes and keeps reusable feature logic outside `app/`.

See [AGENTS.md](./AGENTS.md) for repository rules and completion checks.

See [Backend design](./docs/backend-design.md) for the proposed database, module
boundaries, and data flows derived from the iOS Figma screens (Vietnamese).

See [Business requirements (BRD)](./docs/brd.md) for product goals, scope,
business rules, and acceptance criteria (Vietnamese).
