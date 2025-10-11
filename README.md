# IdeaBridge Monorepo

IdeaBridge is a full-stack starter that turns the product design into runnable frontend, backend, and database scaffolds. It supports idea creators who publish app concepts and developers who respond with working implementations.

## Project structure

```
.
├── frontend/   # Vite + React (TypeScript) single-page app
├── backend/    # Express + TypeScript API with in-memory mock data
├── database/   # Prisma schema and tooling for PostgreSQL
└── mobile/     # Expo + React Native app for iOS and Android
```

### Frontend (`frontend/`)
- React 18 + TypeScript + Vite.
- React Router pages for the idea feed, idea detail, submission forms, and profiles.
- Mock data mirrors the backend seed so UI can run without the API.

### Backend (`backend/`)
- Express REST API with TypeScript and Zod request validation.
- Routes:
  - `GET /api/ideas` – list ideas.
  - `GET /api/ideas/:id` – idea detail with submissions.
  - `POST /api/ideas` – create a new idea (in-memory prototype).
  - `GET /api/apps` and `POST /api/apps` – manage app submissions.
  - `GET /api/profiles/...` – fetch developer or idea-creator profiles.
- In-memory mock database seeded from the design doc for fast iteration.

### Database (`database/`)
- Prisma schema targeting PostgreSQL.
- Models cover idea creators, developers, ideas, app submissions, screenshots, likes, and bookmarks.
- Ready for migrations and Prisma Client generation.

### Mobile (`mobile/`)
- Expo 54 + React Native with TypeScript.
- Native stack navigation that mirrors the web experience (idea feed, detail, submissions, profiles).
- Re-uses the backend REST API with graceful fallbacks to bundled mock data when offline.

## Getting started

### Prerequisites
- Node.js 18.x (upgrade to 20+ when ready for the latest Vite/Prisma features).
- npm 9+
- PostgreSQL 14+ (or any PostgreSQL-compatible database) for the real database.
- Expo CLI (`npm install --global expo-cli`) for running the mobile app locally.

### Frontend dev server
```bash
cd frontend
npm install
npm run dev
```

### Quick start scripts (frontend + backend)
```bash
./start.sh   # launches both dev servers in the background
./stop.sh    # stops the running servers
```

- Logs are written to `.idea-bridge/logs/`. Tail them with `tail -f .idea-bridge/logs/backend.log` (or `frontend.log`).
- The helper scripts install dependencies automatically the first time they run.
- Always use `./stop.sh` instead of `Ctrl+C` to ensure processes shut down cleanly.

### Backend API server
```bash
cd backend
cp .env.example .env   # adjust PORT if needed
npm install
npm run dev
```

### Database toolkit
```bash
cd database
cp .env.example .env   # supply your DATABASE_URL
npm install
npm run generate
# npm run migrate  # when you are ready to create migrations
```

### Mobile app (iOS / Android / Web preview)
```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000 npm start
# Press i for iOS simulator, a for Android emulator, or run on a physical device via Expo Go.
```

- By default the app points at the local backend (`http://localhost:4000`). Adjust `EXPO_PUBLIC_API_BASE_URL` if the API runs elsewhere.
- The mobile client bundles demo data so the UI still works when the API is offline.

## Authentication & Verification
- Registration and login now issue short-lived session tokens backed by HTTP-only cookies.
- New accounts must confirm either their email address or a phone number via one-time code before accessing the app.
- Session recovery happens automatically when a valid session cookie is present; otherwise users are redirected to the verification screen.
- Account settings exposes verification status, allows updating the phone number, and lets users trigger fresh email/SMS codes.
- Configure verification behaviour with the following env vars (defaults shown in `backend/.env.example`):
  - `VERIFICATION_CODE_LENGTH`
  - `VERIFICATION_CODE_TTL_SECONDS`
  - `VERIFICATION_RESEND_COOLDOWN_SECONDS`
  - `VERIFICATION_MAX_ATTEMPTS`
  - `VERIFICATION_LOGGING_ENABLED`

## Next steps
- Connect backend routes to the Prisma client once the database is provisioned.
- Replace mock data in both frontend and backend with real API calls.
- Expand verification to persist to the real database and send codes through production email/SMS providers.
- Add real-time notifications or email updates when submissions land.

## Design notes
This repository follows the attached IdeaBridge product document: permanent idea listings, app submissions tied to ideas, distinct creator/developer profiles, and optional statistics. The current scaffolds keep the scope light while leaving clear seams for future expansion.
