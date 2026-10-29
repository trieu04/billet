# Development guide

Hướng dẫn thiết lập, chạy và vận hành repository Billet. Xem [tổng quan dự án](../README.md) và [mục lục tài liệu](./index.md) để chọn tài liệu theo nhu cầu.

## Prerequisites

- Node.js 22 or newer
- pnpm 12.8.1 (Corepack recommended)
- Docker and Docker Compose (optional)
- Xcode 16 or newer, an iOS Simulator, and [XcodeGen](https://github.com/yonaskolb/XcodeGen) for iOS development (optional)
- Android Studio or JDK 17 with Android SDK 37 for Android development (optional)
- Expo Go or a native simulator for Expo development (optional)

## Setup

```sh
corepack enable
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/expo/.env.example apps/expo/.env
pnpm dev
```

The default development URLs are:

- Server health: <http://localhost:6701/api/v1/health>
- Server API docs: <http://localhost:6701/docs>
- Server realtime: `ws://localhost:6701/ws`
- Web: <http://localhost:6702>
- Web health page: <http://localhost:6702/health>
- iOS: generate and open the project with `pnpm ios:open`
- Android: open `apps/android` in Android Studio
- Expo/Metro: run `pnpm dev:expo` and use the URL or QR code printed by Expo (port `6703`)

The Debug iOS build uses `http://localhost:6701/api/v1`, which works in the iOS Simulator. Override `API_BASE_URL` with a reachable address when running on a physical device. The Debug Android build uses `http://10.0.2.2:6701/api/v1`, which works in the standard Android emulator. Set `BILLET_API_BASE_URL` when the API is reachable at a different address.

## Commands

| Command                | Purpose                                |
| ---------------------- | -------------------------------------- |
| `pnpm dev`             | Run all apps in parallel               |
| `pnpm dev:server`      | Run only the NestJS API                |
| `pnpm dev:web`         | Run only the Vite web app              |
| `pnpm dev:expo`        | Run the preserved Expo app             |
| `pnpm android:build`   | Lint and build the native Android app  |
| `pnpm android:test`    | Run native Android unit tests          |
| `pnpm ios:open`        | Generate and open the Xcode project    |
| `pnpm ios:build`       | Build the native iOS app for Simulator |
| `pnpm ios:test`        | Run native iOS unit tests              |
| `pnpm changeset`       | Record an app-facing change            |
| `pnpm release:check`   | Validate release metadata              |
| `pnpm release:version` | Update app versions and changelogs     |
| `pnpm build`           | Build the server and web app           |
| `pnpm lint`            | Lint every app                         |
| `pnpm typecheck`       | Type-check every app                   |
| `pnpm test`            | Run every test suite                   |
| `pnpm format`          | Format repository files                |
| `pnpm format:check`    | Check formatting without writes        |

Run an app command with pnpm filters, for example:

```sh
pnpm --filter @billet/server test:e2e
pnpm --filter @billet/web preview
pnpm android:build
pnpm ios:build
```

## Docker

Build and run PostgreSQL, the API, web application, and the preserved Expo/Metro server:

```sh
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/expo/.env.example apps/expo/.env
docker compose up --build
```

The dedicated Compose gateway container is available on <http://localhost:6700>. It proxies `/` to the web container, `/api` to the API, `/expo` to Expo/Metro, `/ws` to the realtime server, and `/docs` to the API documentation. Each application container also keeps a dedicated published port for direct access: API `6701`, web `6702`, and Expo/Metro `6703`. Native iOS and Android builds are produced with their platform toolchains and are not served by Docker Compose.

Each Docker application service reads its own `apps/<app>/.env` file. For a physical device using the Compose-hosted Expo bundle, configure `apps/expo/.env` with the reachable gateway and packager host:

```dotenv
EXPO_PUBLIC_BILLET_API_BASE_URL=http://192.168.1.10:6700/api/v1
EXPO_TOKEN=replace-with-an-expo-access-token
EXPO_PACKAGER_HOSTNAME=192.168.1.10
```

Keep `EXPO_TOKEN` private and never prefix it with `EXPO_PUBLIC_`. The phone and development machine must be on the same network.

For a physical iPhone, set the iOS `API_BASE_URL` build setting to a gateway or API address reachable from the device. Keep private overrides in `apps/ios/Config/Local.xcconfig`, which is ignored by Git. For a physical Android device, set the public `BILLET_API_BASE_URL` Gradle property or environment variable to a reachable gateway or API address. PostgreSQL is exposed on local port `6710`; the server applies checked-in migrations when it starts.

## Port allocation

Billet reserves ports by service ownership. For Docker Compose, the published application ports are:

- `6700`: main gateway (`billet.devt.vn` in production).
- `6701`: direct API access.
- `6702`: direct web access.
- `6703`: direct Expo/Metro access.
- `6710–6719`: external infrastructure used by the application, such as PostgreSQL, Redis, or local emulators. PostgreSQL should use `6710` when introduced.

Container, published, and non-Compose development ports are aligned for each service: API `6701`, web `6702`, and Expo/Metro `6703`.

Do not assign a port outside these ranges without updating this policy and checking for collisions across local and Docker environments.

## Environment variables

Every app has a committed `.env.example` containing safe development defaults. Copy it to `.env` in the same app directory before running Docker Compose; all real environment files are ignored. Compose overrides only container-specific values such as internal hostnames and ports. Variables prefixed with `VITE_` or `EXPO_PUBLIC_` are bundled into client applications and must never contain secrets. The web `.env` is mounted only for the Vite build and is not copied into the resulting image. The root `.env` is reserved for Docker Compose host settings such as `COMPOSE_*_HOST_PORT` values. The example reserves ports `6700–6703` and `6710`; clear an individual value to let Docker allocate an available host port instead.

## Architecture notes

- The server uses Nest modules, global configuration, validation, CORS, and shutdown hooks.
- The web app uses feature-first folders, centralized routes/providers, React Query, Tailwind CSS, and Vitest.
- The iOS app uses SwiftUI, native navigation, Keychain session persistence, and direct `URLSession` API integration.
- The Android app uses Jetpack Compose, Material navigation, Android Keystore-backed session persistence, and direct platform HTTP integration.
- Mobile session restoration keeps the saved access token during network or server failures. Only a `401` response from session validation clears the token and requires login again; explicit logout also clears it.

See [AGENTS.md](../AGENTS.md) for repository rules and completion checks.

## Versions and changelogs

The server, web, and native iOS and Android apps are versioned independently with [Changesets](https://github.com/changesets/changesets). For a change that affects a shipped app, run `pnpm changeset`, select every affected app, choose the SemVer bump, and commit the generated `.changeset/*.md` file with the code. Pure documentation, test, refactor, and CI changes do not need a changeset.

After changes reach `main`, the release metadata workflow maintains a Version Packages pull request. That pull request consumes pending changesets and updates the selected app manifests and their `apps/<app>/CHANGELOG.md` files. Its iOS version is also copied from `apps/ios/package.json` into XcodeGen's `MARKETING_VERSION`, while the Android version name is copied from `apps/android/package.json` into `version.properties`. iOS `CURRENT_PROJECT_VERSION` and Android `VERSION_CODE` remain independently managed build numbers.

Run `pnpm release:check` locally to validate the metadata and native version sync.
