# Billet agent guide

These instructions apply to the entire repository. More specific `AGENTS.md` files may extend them for a subtree.

## Product context

Billet is a visual expense journal: “Locket meets Money Tracker.” The product should make capture feel immediate and personal while deriving structured expense data and statistics in the background.

## Architecture rules

- Keep the pnpm workspace simple. Do not introduce Turborepo.
- `apps/server` is the API boundary. Organize business capabilities as `src/modules/<feature>` Nest modules. Controllers handle transport, services coordinate use cases, and persistence/integrations sit behind injectable providers.
- `apps/web` is feature-first. Put feature-owned pages, components, API calls, hooks, and types in `src/features/<feature>`. Keep route composition and providers in `src/app`; reserve `src/components` for genuinely shared presentation.
- `apps/mobile/app` contains Expo Router route entry points only. Put reusable screens, hooks, services, and domain code in `features/<feature>`.
- Dependency direction flows from app composition to features to shared primitives. Features must not import other feature internals.
- Add `packages/*` only for a stable contract or utility already required by at least two apps. Shared code must not depend on an app.
- Allocate application-owned internal services from `6700–6709` (currently API `6700`, web `6701`, Expo/Metro `6702`). Allocate external infrastructure such as PostgreSQL, Redis, and emulators from `6710–6719` (PostgreSQL starts at `6710`). Keep local and Docker ports aligned.
- Define API contracts deliberately. Do not share database entities with clients.
- Read configuration from environment variables, validate it near application startup, and never commit secrets. `VITE_*` and `EXPO_PUBLIC_*` values are public.
- Database schema changes must use migrations once persistence is introduced; never rely on production schema synchronization.

## Conventions

- Use TypeScript in strict mode. Avoid `any`; prefer narrowing, generics, or `unknown`.
- Use small, named modules with explicit public boundaries. Prefer named exports except where a framework requires a default export.
- Follow the repository Oxfmt and Oxlint configurations. Do not format generated output or the lockfile manually.
- Keep UI accessible: semantic controls, readable contrast, labels, keyboard support on web, and accessibility roles on mobile.
- Keep tests next to source when practical; reserve `test/` for end-to-end and integration setup.
- Unit-test behavior and transformations. Add integration tests at external boundaries and e2e tests for critical user journeys.
- Do not copy business logic, credentials, environment values, or generated artifacts from reference projects.
- Preserve unrelated user changes. Do not rewrite Git history or use destructive Git commands.

## Linear task management

- Project: [Billet](https://linear.app/devtvn/project/billet-9c0b5cc6e4c3) on the `DEV` team.
- Before work, search existing project issues and use the closest matching issue; avoid duplicates.
- Move active work to `In Progress` and keep its description or comments current when scope or blockers change.
- Reference the issue identifier in branches, commits, or pull requests when those are requested.
- Move an issue to `Done` only after its acceptance criteria and the completion checks below pass. Record any deferred work as a distinct, non-duplicate issue.

## Completion checks

Before marking implementation complete:

1. Confirm the requested behavior manually at the relevant boundary.
2. Run `pnpm format:check`.
3. Run `pnpm lint`.
4. Run `pnpm typecheck`.
5. Run `pnpm test` (and relevant e2e tests when behavior crosses boundaries).
6. Run `pnpm build`.
7. Verify `.env.example`, README, and API documentation when configuration or public behavior changed.
8. Review `git diff` for secrets, generated files, accidental reference-project code, and unrelated edits.
9. Update the Linear issue with results and remaining follow-ups.
