# IdeaBridge Mobile Design

_Last updated: 2025-10-15_

## 1. Product Goals
- Deliver feature parity with the web experience for idea creators and builders.
- Optimise for quick iteration via Expo Go while remaining production-ready for EAS builds.
- Provide offline resilience and graceful degradation when the backend is unreachable.

## 2. Platform & Stack
- Expo SDK 54 (Managed workflow)
- React Native + TypeScript
- React Navigation (Native Stack)
- AsyncStorage (future) for persisted auth/session caching
- Expo SecureStore for access token storage

## 3. Screen Inventory
| Route | Component | Description |
| --- | --- | --- |
| `/` (`Home`) | `IdeaListScreen` | Paginated idea feed, CTA buttons for submissions, header button to account settings. |
| `/ideas/:id` | `IdeaDetailScreen` | Idea summary, requirements, and submission list. |
| `/apps/new` | `SubmitAppScreen` | Form for builders to submit prototypes. |
| `/ideas/new` | `SubmitIdeaScreen` | Form for idea creators to propose problems. |
| `/profiles/:role/:id` | `ProfileScreen` | Creator or developer profile with metrics. |
| `/signin` | `SignInScreen` | Email/password auth with password visibility toggle. |
| `/signup` | `SignUpScreen` | Registration with country picker, trunk trimming, verification trigger. |
| `/verify` | `VerifyContactScreen` | Enter SMS code, resend handling. |
| `/account` | `AccountScreen` (registered as `AccountSettings`) | Update profile, phone, preferred role; trigger verification, logout, delete account. |

## 4. Navigation Flow
```
Unauthenticated Stack
  ├─ SignIn
  ├─ SignUp
  └─ VerifyContact (pending verification)

Authenticated Stack
  ├─ Home
  │   ├─ IdeaDetail
  │   ├─ SubmitIdea
  │   ├─ SubmitApp
  │   └─ Profile
  ├─ AccountSettings
  └─ VerifyContact (on-demand verification refresh)
```

Navigation is keyed on auth state; switching routes resets stack history to avoid leaking previous screens between states.

## 5. Data Flow & API Access
- HTTP client lives in `src/api/http.ts`. It resolves the API base URL lazily using `src/api/baseUrl.ts` which probes:
  1. `EXPO_PUBLIC_API_BASE_URL`
  2. Expo debugger host / LAN IP
  3. Emulator loopback (Android `10.0.2.2`, iOS `localhost`)
- Auth tokens are cached in-memory (module-level variable) to avoid redundant state libraries. SecureStore persists tokens between launches.
- The AuthContext exposes `login`, `register`, `update`, `startVerification`, etc., matching backend routes.

## 6. Forms & Validation
- All forms use controlled `TextInput` components with inline error messaging.
- Phone number input uses the helper in `src/utils/phone.ts`:
  - Country picker based on AWS country dial codes + trunk trimming metadata.
  - Accepts pasted E.164 numbers and auto-splits into country/local segments.
- Password inputs include a visibility toggle via `TouchableOpacity` overlay.

## 7. Styling & Theming
- Colors align with the web palette (`#1f2937` primary, neutral grays for backgrounds).
- Fonts rely on system defaults; integrate custom fonts via Expo Font in the future.
- Components use `StyleSheet.create` with semantic names (`actionButton`, `helper`, etc.).
- Dark mode uses React Native `useColorScheme`; navigation container switches between `DefaultTheme`/`DarkTheme` accordingly.

## 8. Offline Strategy
- Mock data in `src/mocks.ts` seeds idea lists and submissions if API calls fail.
- API client throws explicit errors; screens show inline messaging while falling back to mocks.
- Future: persist last successful payloads in AsyncStorage for richer offline support.

## 9. Error Handling & Edge Cases
- Auth failures surface backend `error` messages verbatim when available.
- Verification attempts handle expired codes (`attemptsRemaining`, `resendAvailableAt`).
- Role change cooldown enforced client-side using `roleChangeEligibleAt` timestamp.
- Logout & delete account flows operate defensively (disable buttons during network calls, confirm destructive actions).

## 10. Testing & QA
- Smoke test checklist (manual for now):
  1. Launch Expo Go (LAN & Tunnel).
  2. Sign up with new account, confirm SMS verification flow.
  3. Sign in existing account, toggle password visibility.
  4. Update profile & phone, trigger new verification code.
  5. Submit idea & app prototypes using mock backend.
- Automated testing (roadmap): Detox UI tests targeting critical flows.

## 11. Build & Release
- Local development via `npm start` or `../../mobile.sh start`.
- Production builds generated with EAS:
  ```bash
  npx eas-cli build:configure
  npx eas build -p ios --profile production
  npx eas build -p android --profile production
  ```
- App metadata stored in `app.json`; update version & bundle identifiers before submitting to stores.

## 12. Future Enhancements
- Push notifications for idea updates (requires Expo Notifications + backend hooks).
- Offline queueing for submissions when connectivity is poor.
- Deep linking support for idea/app details.
- Accessibility audit (screen reader labels, focus management).
