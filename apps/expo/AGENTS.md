# Mobile agent guide

These instructions extend the repository-level `AGENTS.md` for `apps/expo`.

## Architecture

- Keep `app` limited to Expo Router route entry points.
- Put reusable screens, hooks, services, and domain code in `features/<feature>`.
- Preserve accessible labels, roles, touch targets, and platform-appropriate interactions.

## Scoped completion checks

- Format-check changed files with `pnpm exec oxfmt --check <changed-files>`.
- Run the closest relevant Vitest test first. Run `pnpm --dir apps/expo test` when Expo behavior has broad impact.
- Run `pnpm --dir apps/expo lint` and `pnpm --dir apps/expo typecheck` for TypeScript changes.
- Run `pnpm --dir apps/expo build` for changes that affect bundling, dependencies, Expo configuration, environment variables, routing, or exported output. It is optional for isolated tests or non-executable documentation changes.
- Manually verify affected flows on the relevant platform or Expo target for UI, navigation, permissions, or native-integration changes.
