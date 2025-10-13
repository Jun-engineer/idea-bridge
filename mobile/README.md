# IdeaBridge Mobile

This Expo project delivers the IdeaBridge experience on iOS and Android. It shares the same backend as the web app and is ready to build with EAS for the App Store and Google Play once bundle identifiers, certificates, and store listings are configured.

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

Expo automatically exposes `EXPO_PUBLIC_*` variables to the app. When omitted the app defaults to `http://localhost:4000`.

## Install dependencies

```bash
npm install
```

## Quick smoke test

```bash
npm run start
```

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
3. Use `npm run start -- --tunnel` when USB/Wi-Fi isolation prevents LAN discovery.
4. Scan the QR code inside Expo Go and walk through core flows.

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