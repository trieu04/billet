# Billet agent guide

These instructions apply to the entire repository. More specific `AGENTS.md` files may extend them for a subtree.

## Product context

Billet is a visual expense journal: “Locket meets Money Tracker.” The product should make capture feel immediate and personal while deriving structured expense data and statistics in the background.

## Architecture rules

- Keep the pnpm workspace simple. Do not introduce Turborepo.
- `apps/server` is the API boundary. Organize business capabilities as `src/modules/<feature>` Nest modules. Controllers handle transport, services coordinate use cases, and persistence/integrations sit behind injectable providers.
- Name server feature folders with a singular capability noun, such as `auth`, `notification`, or `user`.
- Inside a server feature, use concise conventional entry filenames: `module.ts`, `controller.ts`, `service.ts`, `dto.ts`, `interface.ts`, and `constants.ts`. Keep role-qualified filenames only when the qualifier distinguishes multiple implementations, such as `push.service.ts`.
- Keep a small feature flat. When a feature contains multiple files or responsibilities of the same role, group them into role folders such as `services/`, `strategies/`, `guards/`, `decorators/`, `providers/`, `dtos/`, or `utils/`. Keep tests beside the implementation they cover.
- Keep persistence entities in the module that owns them under `src/modules/<feature>/entities/`. Put reusable abstract entity bases in `src/shared/entities/`; do not centralize concrete feature entities in a global `src/entities` folder.
- Use the shared bigint `BaseEntity` for `id`, `createdAt`, and `updatedAt`. Use `SoftDeleteBaseEntity` when the entity supports deletion; it adds `deletedAt`. Represent PostgreSQL bigint identifiers as strings in TypeScript and API contracts to avoid precision loss. Do not introduce UUID or number-based entity identifiers.
- Use TypeORM soft-delete methods for user-facing deletion when an entity extends `SoftDeleteBaseEntity`.
- Put application configuration in `apps/server/src/configs`, reusable cross-cutting primitives in `src/shared/<role>`, and operational adapters or assets in `src/common/<capability>`. Do not move feature-owned code into these folders.
- `apps/web` is feature-first. Put feature-owned pages, components, API calls, hooks, and types in `src/features/<feature>`. Keep route composition and providers in `src/app`; reserve `src/components` for genuinely shared presentation.
- `apps/mobile/app` contains Expo Router route entry points only. Put reusable screens, hooks, services, and domain code in `features/<feature>`.
- Dependency direction flows from app composition to features to shared primitives. Features must not import other feature internals.
- Add `packages/*` only for a stable contract or utility already required by at least two apps. Shared code must not depend on an app.
- Allocate application-owned services from `6700–6709`: dedicated gateway container `6700`, API `6701`, web `6702`, and Expo/Metro `6703`. Keep each application service's internal, development, and published port aligned. Allocate external infrastructure such as PostgreSQL, Redis, and emulators from `6710–6719` (PostgreSQL starts at `6710`).
- Define API contracts deliberately. Do not share database entities with clients.
- Read configuration from environment variables, validate it near application startup, and never commit secrets. `VITE_*` and `EXPO_PUBLIC_*` values are public.
- Database schema changes must use migrations once persistence is introduced; never rely on production schema synchronization.
- Migration history should describe the net schema change from the repository origin to the final local result. When an uncommitted local schema change is revised, update or consolidate its local migration instead of adding another migration for the intermediate local state. Never rewrite migrations that already exist in the shared origin history.

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
- Use Linear issues only for medium and large tasks. Small, low-risk changes such as typo fixes, minor documentation edits, or narrowly scoped configuration tweaks do not require an issue.
- For medium and large tasks, search existing project issues before work and use the closest matching issue; create a new issue only when no suitable issue exists, and avoid duplicates.
- Label each issue by application scope: use `server` for `apps/server`, `web` for `apps/web`, and `mobile` for `apps/mobile`. Apply every relevant label when work spans multiple apps.
- When an issue is used, move active work to `In Progress` and keep its description or comments current when scope or blockers change.
- Reference the issue identifier in branches, commits, or pull requests when those are requested.
- After implementation and the completion checks below pass, move the issue to `In Review`. If the Linear workflow does not yet provide `In Review`, keep the issue in `In Progress`; do not move it directly to `Done`.
- Move an issue from `In Review` to `Done` only after the work has been reviewed and merged, or the user explicitly confirms completion. Record any deferred medium or large work as a distinct, non-duplicate issue.

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
9. For medium and large tasks, update the Linear issue with results and remaining follow-ups.
