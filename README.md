# Billet

Billet is a visual expense journal: **Locket meets Money Tracker**. Photos and captions preserve the context of everyday spending, while expense totals and patterns help users understand their habits.

## Product direction

- Capture a photo, accept it, enter an amount, and save the expense.
- Revisit expenses through a visual journal, calendar, and spending reports.
- Keep manual entry available; image recognition supports the flow without blocking it or overwriting user input.

Feature scope and acceptance criteria are maintained in the [business requirements](./docs/business-requirements.md).

## Project structure

| Location       | Role                                                       |
| -------------- | ---------------------------------------------------------- |
| `apps/server`  | NestJS API backed by PostgreSQL and private media storage  |
| `apps/web`     | Vite + React web app                                       |
| `apps/ios`     | Native SwiftUI iOS app                                     |
| `apps/android` | Native Kotlin / Jetpack Compose Android app                |
| `apps/expo`    | Preserved legacy Expo Router client, managed independently |
| `docs`         | Requirements, technical designs, and development guidance  |

The API and web app use a pnpm workspace. Native apps use their platform toolchains; each app keeps its own version and changelog.

## Documentation

- [Documentation index](./docs/index.md): reading order, document status, and naming conventions.
- [Development guide](./docs/development-guide.md): setup, commands, Docker, environment variables, and releases.
- [Backend design](./docs/techical-design/01-backend.md): architecture, data flows, and implementation limits.
- [Repository rules](./AGENTS.md): engineering conventions and completion checks.
