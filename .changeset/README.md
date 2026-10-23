# Changesets

Billet uses Changesets to version the active applications independently and to
maintain an app-specific changelog.

Run `pnpm changeset` for a user-visible or operational change. Select every app
affected by the change and choose the SemVer bump:

- `patch`: backwards-compatible fix.
- `minor`: backwards-compatible feature.
- `major`: breaking contract or behavior change.

Commit the generated Markdown file with the implementation. Documentation,
tests, refactors, and CI-only changes that do not affect a shipped app do not
need a changeset.

On `main`, the release workflow collects pending changesets into a Version
Packages pull request. Merging that pull request updates each selected app's
manifest and `CHANGELOG.md`. The version command also synchronizes the iOS
manifest version to XcodeGen's `MARKETING_VERSION` and the Android manifest
version to `VERSION_NAME` in `version.properties`. Native build numbers remain
independently managed.
