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

- Server health: <http://localhost:6700/api/v1/health>
- Server API docs: <http://localhost:6700/docs>
- Server realtime: `ws://localhost:6700/ws`
- Web: <http://localhost:6701>
- Web health page: <http://localhost:6701/health>
- Expo/Metro: port `6702`
- Mobile: use the URL or QR code printed by Expo

For a physical phone, change `EXPO_PUBLIC_API_BASE_URL` from `localhost` to the development machine's LAN address.

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

Build and run the server and web application:

```sh
docker compose up --build
```

The web container is available on <http://localhost:6701> and the API on <http://localhost:6700>. Mobile development remains outside Docker so Expo can reach simulators and local devices.
PostgreSQL is exposed on local port `6710`; the server applies checked-in migrations when it starts.

## Port allocation

Billet reserves ports by service ownership:

- `6700–6709`: application-owned internal services. The initial allocation is API `6700`, web `6701`, and Expo/Metro `6702`.
- `6710–6719`: external infrastructure used by the application, such as PostgreSQL, Redis, or local emulators. PostgreSQL should use `6710` when introduced.

Do not assign a port outside these ranges without updating this policy and checking for collisions across local and Docker environments.

## Environment variables

Every app has a committed `.env.example` containing safe development defaults. Create local `.env` files as needed; all real environment files are ignored. Variables prefixed with `VITE_` or `EXPO_PUBLIC_` are bundled into client applications and must never contain secrets.

## Architecture notes

The initial conventions follow the supplied VNPreventStroke reference projects without copying their product code or credentials:

- The server uses Nest modules, global configuration, validation, CORS, and shutdown hooks.
- The web app uses feature-first folders, centralized routes/providers, React Query, Tailwind CSS, and Vitest.
- The mobile app uses file-based Expo Router routes and keeps reusable feature logic outside `app/`.

See [AGENTS.md](./AGENTS.md) for repository rules and completion checks.
