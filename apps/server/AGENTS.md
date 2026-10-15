# Server agent guide

These instructions extend the repository-level `AGENTS.md` for `apps/server`.

## Architecture

- This app is the API boundary. Organize business capabilities as `src/modules/<feature>` Nest modules. Controllers handle transport, services coordinate use cases, and persistence or integrations sit behind injectable providers.
- Name feature folders with a singular capability noun, such as `auth`, `notification`, or `user`.
- Inside a feature, use concise conventional entry filenames: `module.ts`, `controller.ts`, `service.ts`, `dto.ts`, `interface.ts`, and `constants.ts`. Keep role-qualified filenames only when the qualifier distinguishes multiple implementations, such as `push.service.ts`.
- Keep a small feature flat. When a feature contains multiple files or responsibilities of the same role, group them into role folders such as `services/`, `strategies/`, `guards/`, `decorators/`, `providers/`, `dtos/`, or `utils/`. Keep tests beside the implementation they cover.
- Keep persistence entities in the module that owns them under `src/modules/<feature>/entities/`. Put reusable abstract entity bases in `src/shared/entities/`; do not centralize concrete feature entities in a global `src/entities` folder.
- Use the shared bigint `BaseEntity` for `id`, `createdAt`, and `updatedAt`. Use `SoftDeleteBaseEntity` when the entity supports deletion; it adds `deletedAt`. Represent PostgreSQL bigint identifiers as strings in TypeScript and API contracts to avoid precision loss. Do not introduce UUID or number-based entity identifiers.
- Use TypeORM soft-delete methods for user-facing deletion when an entity extends `SoftDeleteBaseEntity`.
- Put application configuration in `src/configs`, reusable cross-cutting primitives in `src/shared/<role>`, and operational adapters or assets in `src/common/<capability>`. Do not move feature-owned code into these folders.
- Database schema changes must use migrations once persistence is introduced; never rely on production schema synchronization.
- Migration history should describe the net schema change from the repository origin to the final local result. Revise or consolidate an uncommitted local migration when its schema change evolves; never add migrations for intermediate local states or rewrite migrations already in shared origin history.

## Scoped completion checks

- Format-check changed files with `pnpm exec oxfmt --check <changed-files>`.
- Run the closest relevant Jest test first. Run `pnpm --filter @billet/server test` when server behavior has broad impact.
- Run `pnpm --filter @billet/server lint` and `pnpm --filter @billet/server typecheck` for TypeScript changes.
- Run `pnpm --filter @billet/server test:e2e` when behavior crosses the HTTP, database, authentication, or other external boundary.
- Run `pnpm --filter @billet/server build` for changes that affect compilation, dependencies, configuration, startup, or production output. It is optional for isolated tests or non-executable documentation changes.
- For migration changes, apply and verify the migration against an appropriate disposable database when available; also inspect the generated SQL or schema result.
