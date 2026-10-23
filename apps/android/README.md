# Billet for Android

Native Kotlin and Jetpack Compose client for Billet. The app targets Android 8.0 (API 26) and talks directly to the existing Billet API without Expo or React Native.

## Open and run

Open `apps/android` in Android Studio, let Gradle sync, and run the `app` configuration on an emulator or device.

The Debug build uses `http://10.0.2.2:6701/api/v1`, which reaches the host machine from the standard Android emulator. For a physical device or a different emulator, set the public `BILLET_API_BASE_URL` environment variable or pass `-PBILLET_API_BASE_URL=https://host/api/v1` to Gradle. The Release build uses `https://billet.devt.vn/api/v1`.

Local development credentials are `ntdm` / `devt`.

## Command-line checks

```sh
./gradlew testDebugUnitTest
./gradlew lintDebug assembleDebug
```

The app uses Material 3 navigation and controls, Android photo/camera contracts, and Android Keystore-backed token encryption.
