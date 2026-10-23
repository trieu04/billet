# Billet for iOS

Native SwiftUI client for Billet. The app targets iOS 17 and talks directly to the existing Billet API.

## Generate and open the project

```sh
cd apps/ios
xcodegen generate
open Billet.xcodeproj
```

Debug builds select an API endpoint for the target SDK:

- The iOS Simulator uses `http://localhost:6701/api/v1`, which reaches the API on the Mac.
- A physical iOS device uses `https://billet.devt.vn/api/v1`, because `localhost` on a device refers to the device itself.

To connect a physical device to the API running on the Mac instead, create the ignored file
`Config/Local.xcconfig` and set an address that the device can reach on the same network:

```xcconfig
API_BASE_URL = http:/$()/192.168.1.25:6701/api/v1
```

Replace the example address with the Mac's LAN IP address. The server already listens on
`0.0.0.0`; macOS firewall and network settings must also allow the device to reach port `6701`.
Do not commit `Local.xcconfig`. Release builds always use `https://billet.devt.vn/api/v1`.

Local development credentials are `ntdm` / `devt`.

## Command-line checks

```sh
xcodegen generate
xcodebuild -project Billet.xcodeproj -scheme Billet -destination 'platform=iOS Simulator,name=iPhone 17' build
xcodebuild -project Billet.xcodeproj -scheme Billet -destination 'platform=iOS Simulator,name=iPhone 17' test
```

`Billet.xcodeproj` is generated from `project.yml` and is intentionally not committed.
