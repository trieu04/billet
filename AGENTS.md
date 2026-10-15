# Billet agent guide

These instructions apply to the entire repository. More specific `AGENTS.md` files may extend them for a subtree.

## Product context

Billet is a visual expense journal: “Locket meets Money Tracker.” The product should make capture feel immediate and personal while deriving structured expense data and statistics in the background.

## Architecture rules

- Keep the pnpm workspace simple. Do not introduce Turborepo.
- Dependency direction flows from app composition to features to shared primitives. Features must not import other feature internals.
- Add `packages/*` only for a stable contract or utility already required by at least two apps. Shared code must not depend on an app.
- Allocate application-owned services from `6700–6709`: dedicated gateway container `6700`, API `6701`, web `6702`, and Expo/Metro `6703`. Keep each application service's internal, development, and published port aligned. Allocate external infrastructure such as PostgreSQL, Redis, and emulators from `6710–6719` (PostgreSQL starts at `6710`).
- Define API contracts deliberately. Do not share database entities with clients.
- Read configuration from environment variables, validate it near application startup, and never commit secrets. `VITE_*` and `EXPO_PUBLIC_*` values are public.

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

Use risk-based checks scoped to the files and applications changed. Follow the closest app-level `AGENTS.md` for its commands.

1. Confirm the requested behavior at the relevant boundary when behavior changed.
2. Format-check changed source or documentation files. Do not require a repository-wide format check for a small, isolated change.
3. Run lint, typecheck, tests, and build for each affected app when the change can influence that check. Start with the narrowest relevant test; expand only when risk or failures justify it.
4. Run the root `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` suite only for cross-app changes, shared package or root tooling changes, broad refactors, release validation, or when explicitly requested.
5. Documentation-only and comment-only changes do not require lint, typecheck, tests, or builds unless they alter executable examples, generated documentation, configuration contracts, or other validated content.
6. Verify `.env.example`, README, and API documentation when configuration or public behavior changed.
7. Review `git diff` for secrets, generated files, accidental reference-project code, and unrelated edits.
8. Report which checks ran and any intentionally skipped checks. For medium and large tasks, update the Linear issue with results and remaining follow-ups.
