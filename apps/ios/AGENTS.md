# Native iOS agent guide

These instructions extend the repository-level `AGENTS.md` for `apps/ios`.

## Architecture

- Build the app with SwiftUI and Apple SDKs. Add a third-party dependency only when an Apple framework cannot satisfy the requirement.
- Keep API DTOs separate from view state and persistence.
- Store authentication tokens in Keychain. Never put secrets in source, plist files, or xcconfig files.
- Keep navigation native: peer destinations in `TabView`, detail screens in `NavigationStack`, capture as a full-screen cover, and short edits in sheets.
- Use semantic system colors and Dynamic Type. Every interactive target must be at least 44 points.

## Scoped completion checks

- Regenerate the project with `xcodegen generate` after changing `project.yml`.
- Run `xcodebuild -project Billet.xcodeproj -scheme Billet -destination 'platform=iOS Simulator,name=iPhone 17' build` for app changes.
- Run the `BilletTests` test plan for behavior or transformation changes.
- Verify changed flows in an iOS Simulator in light and dark mode.
