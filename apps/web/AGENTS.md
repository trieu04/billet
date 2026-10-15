# Web agent guide

These instructions extend the repository-level `AGENTS.md` for `apps/web`.

## Architecture

- Keep the app feature-first. Put feature-owned pages, components, API calls, hooks, and types in `src/features/<feature>`.
- Keep route composition and providers in `src/app`; reserve `src/components` for genuinely shared presentation.
- Preserve semantic controls, readable contrast, labels, and keyboard support.

## Scoped completion checks

- Format-check changed files with `pnpm exec oxfmt --check <changed-files>`.
- Run the closest relevant Vitest test first. Run `pnpm --filter @billet/web test` when web behavior has broad impact.
- Run `pnpm --filter @billet/web lint` and `pnpm --filter @billet/web typecheck` for TypeScript or configuration changes covered by those tools.
- Run `pnpm --filter @billet/web build` for changes that affect compilation, dependencies, Vite configuration, environment variables, routing, or production output. It is optional for isolated tests, styles with no build-path effect, or non-executable documentation changes.
- Manually verify affected user interactions and responsive or accessibility behavior for UI changes.
