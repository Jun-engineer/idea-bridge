# IdeaBridge Mobile

This Expo project delivers the IdeaBridge experience on iOS and Android. It shares the same backend as the web app and is ready to build with EAS for the App Store and Google Play once bundle identifiers, certificates, and store listings are configured.

## Key mobile features

- Phone number capture mirrors the web experience with a country code picker and automatic trunk-prefix trimming.
- Password fields now include a "Show" toggle so you can double-check credentials before submitting.
- After signing in, open **Account** from the Home screen header to update profile details, request SMS verification, sign out, or delete your account.
- Full UX flows, navigation map, and component responsibilities are documented in [`../docs/mobile-design.md`](../docs/mobile-design.md).

## Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- Backend API reachable at the URL you intend to test against
- For Android local emulation: Android Studio + an AVD running Android 14+
- For iOS testing: Xcode with simulator **or** the Expo Go app on a physical device

## Environment

Set the API base URL so the app talks to the correct backend.

```bash
# .env (not committed)
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
```

Expo automatically exposes `EXPO_PUBLIC_*` variables to the app. When omitted the app performs a quick health probe against common development hosts (Expo debugger host, Android emulator `10.0.2.2`, iOS simulator `localhost`, etc.) and falls back to the first reachable one. Physical devices that rely on a tunnel will still need an explicit URL that is reachable from that device (for example, your LAN IP or an ngrok tunnel).

## Install dependencies

```bash
npm install
```

## Quick smoke test

```bash
npm run start             # defaults to expo start --localhost with HOSTNAME=127.0.0.1
```

Need a different networking mode? Append Expo flags after `--`, for example `npm run start -- --tunnel` or `npm run start -- --localhost`.

When running inside WSL, the `prestart` hook automatically tries to run `adb reverse tcp:8081 tcp:8081` (and 8082/19000+/19002) so the Windows-hosted Android emulator can reach Metro. If `adb` is not on your WSL `PATH`, install it (`sudo apt install android-tools-adb`) or set `ADB_PATH` to the full path of your Windows `adb.exe` before starting.

The helper keeps `REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1` unless you override the host flag, ensuring Expo advertises a loopback URL while still binding on all interfaces for WSL ↔ Windows traffic.

Or use the root convenience script to manage the Expo server in the background (defaults to `--localhost`):

```bash
./mobile.sh start               # runs expo start --localhost under the hood
./mobile.sh start -- --lan      # opt in to LAN mode for physical devices on same network
./mobile.sh start -- --tunnel   # pass any other Expo CLI args after --
./mobile.sh status
./mobile.sh stop
```

When you choose `--lan`, the `start-expo.cjs` helper attempts to detect your computer's Wi‑Fi IPv4 address (on WSL it shell-outs to `ipconfig.exe`). If discovery fails, export `EXPO_LAN_HOSTNAME` (or `REACT_NATIVE_PACKAGER_HOSTNAME`) with your LAN IP before starting so Expo advertises a URL your phone can reach.

This starts Metro and prints a QR code. From there, choose one of the options below.

### iOS ✅ Expo Go

1. Ensure your Mac and iPhone are on the same network.
2. Install Expo Go from the App Store.
3. Run `npm run start -- --tunnel` if devices are on different networks; otherwise the default LAN mode is fine.
4. Scan the QR code with the Camera app and open the project in Expo Go.
5. Sign in and navigate around to confirm API calls succeed and assets load.

### iOS ✅ Simulator

1. Install Xcode and open the Simulator app.
2. Run `npm run ios`.
3. The Metro server rebuilds on save; watch the terminal for any red screens.

### Android ✅ Emulator

1. Create an Android Virtual Device (AVD) in Android Studio (Pixel 7, Android 14 recommended).
2. Start the emulator.
3. Run `npm run android`.
4. Verify login, submissions, and navigation flows.

### Android ✅ Physical device

1. Install Expo Go from the Play Store.
2. Connect the device via USB (enable USB debugging) **or** be on the same LAN.
3. Use `npm run start -- --lan` for the fastest path; if you see a warning about the LAN host, set `EXPO_LAN_HOSTNAME=192.168.x.y` (your computer's IP) before starting.
4. When running inside WSL2 on Windows, the start script will attempt to configure a Windows port proxy so the LAN device can reach the WSL bundler (0.0.0.0:8081 → `<WSL_IP>`:8081). If it prints a command instead, open an **elevated** PowerShell window and run the suggested `netsh interface portproxy add ...` command once per boot.
5. Fall back to `npm run start -- --tunnel` only when the LAN path is blocked by firewall rules.
6. Scan the QR code inside Expo Go and walk through core flows.

## Pre-release checklist

- Update `app.json` with the correct `version`, `ios.bundleIdentifier`, and `android.package` before store submissions.
- Configure EAS build credentials: `npx eas-cli build:configure`.
- Generate production builds:
  ```bash
  npx eas build -p ios --profile production
  npx eas build -p android --profile production
  ```
- Test the generated `.ipa` and `.aab` files on TestFlight and the Play Console internal track.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Metro fails to start | Clear cache: `npx expo start -c` |
| Network requests fail on device | Ensure device can reach your backend; use a tunnel (ngrok, Expo tunnel) if needed |
| SecureStore errors | Run on a real device/emulator that supports SecureStore (it’s stubbed on web) |

For deeper Expo workflow guidance see the [Expo docs](https://docs.expo.dev/).