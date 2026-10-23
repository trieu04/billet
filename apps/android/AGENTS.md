# Native Android agent guide

These instructions extend the repository-level `AGENTS.md` for `apps/android`.

## Architecture

- Build the app with Kotlin, Jetpack Compose, and Android SDK APIs.
- Keep API DTOs separate from UI state and never expose persistence models as API contracts.
- Store authentication tokens with Android Keystore-backed encryption. Never put secrets in source, resources, or Gradle properties.
- Keep navigation native: peer destinations in `NavigationBar`, details on the navigation back stack, capture as a full-screen destination, and short edits in dialogs or sheets.
- Use Material semantic colors, dynamic type scaling, and touch targets of at least 48 dp.

## Scoped completion checks

- Run `./gradlew testDebugUnitTest` for behavior or transformation changes.
- Run `./gradlew lintDebug assembleDebug` for app changes.
- Verify changed flows on an Android emulator in light and dark mode.
