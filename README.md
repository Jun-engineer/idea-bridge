# IdeaBridge Monorepo

IdeaBridge is a full-stack starter that turns the product design into runnable frontend, backend, and infrastructure scaffolds. It supports idea creators who publish app concepts and developers who respond with working implementations, spanning web and serverless deployment targets.

## Project structure

```
.
├── frontend/         # Vite + React (TypeScript) single-page app
├── backend/          # Express + TypeScript API with in-memory mock data
├── database/         # Prisma schema and tooling for PostgreSQL
├── infra/            # Terraform + auxiliary scripts for AWS
└── docs/             # Product & technical design documents (markdown + draw.io)
```

### Frontend (`frontend/`)
- React 18 + TypeScript + Vite.
- React Router pages for the idea feed, idea detail, submission forms, profiles, verification, and account management.
- Mock data mirrors the backend seed so UI can run without the API during early development.
- Shared UI primitives (cards, layout, navigation) keep the experience consistent across the site.

### Backend (`backend/`)
- Express REST API with TypeScript and Zod request validation.
- Auth routes for registration, login, phone verification, and secure session management.
- Core domain routes:
  - `GET /api/ideas` – list ideas.
  - `GET /api/ideas/:id` – idea detail with submissions.
  - `POST /api/ideas` – create a new idea (in-memory prototype).
  - `GET /api/apps` and `POST /api/apps` – manage app submissions.
  - `GET /api/profiles/...` – fetch developer or idea-creator profiles.
- In-memory mock database seeded from the design doc for fast iteration.
- SNS integration stub for SMS verification (logs codes locally until credentials are configured).

### Database (`database/`)
- Prisma schema targeting PostgreSQL.
- Models cover idea creators, developers, ideas, app submissions, screenshots, likes, bookmarks, and verification challenges.
- Ready for migrations and Prisma Client generation.


## Documentation

Authoritative reference material lives in the `docs/` folder:

- `docs/database-design.md` – logical & physical data model plus migration guidance.
- `docs/programming-spec.md` – coding conventions, module boundaries, and testing strategy.
- `docs/aws-infrastructure.md` – AWS resource blueprint with Terraform mapping.
- `docs/aws-architecture.drawio` – AWS 2025 icon architecture diagram (open in diagrams.net).
- `docs/auth-architecture.md` + `docs/auth-requirements.md` – detailed authentication flows.
- `docs/serverless-deployment.md` – operational walkthrough for the Lambda/API Gateway stack.

## Getting started

### Prerequisites
- Node.js 18.x (upgrade to 20+ when ready for the latest Vite/Prisma features).
- npm 9+
- PostgreSQL 14+ (or any PostgreSQL-compatible database) for the real database.

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

- The dev server runs on `http://localhost:4000` by default and exposes all REST routes under `/api/*`.
- `npm run test` executes Jest unit tests, and `npm run lint` enforces the shared ESLint configuration.

### Database toolkit
```bash
cd database
cp .env.example .env   # supply your DATABASE_URL
npm install
npm run generate
# npm run migrate  # when you are ready to create migrations
```

- Prisma is configured for PostgreSQL; adjust `schema.prisma` and `DATABASE_URL` for other providers.
- Seed scripts are deferred until DynamoDB/Postgres persistence replaces the in-memory stores.

## Authentication & Verification
- Registration and login issue short-lived session tokens backed by HTTP-only cookies.
- New accounts must confirm a phone number via one-time SMS code before accessing the app.
- Session recovery happens automatically when a valid session cookie is present; otherwise users are redirected to the verification screen.
- Account settings exposes verification status, allows updating the phone number, and lets users trigger fresh SMS codes.
- Configure verification behaviour with the following env vars (defaults shown in `backend/.env.example`):
  - `VERIFICATION_CODE_LENGTH`
  - `VERIFICATION_CODE_TTL_SECONDS`
  - `VERIFICATION_RESEND_COOLDOWN_SECONDS`
  - `VERIFICATION_MAX_ATTEMPTS`
  - `VERIFICATION_LOGGING_ENABLED`
  - Amazon SNS settings (for SMS delivery):
    - `AWS_REGION`
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`
    - `AWS_SESSION_TOKEN` (optional for temporary credentials)
    - `AWS_SNS_SENDER_ID`
    - `AWS_SNS_ORIGINATION_NUMBER`
    - `AWS_SNS_SMS_TYPE`
    - Without these values, the backend logs verification codes but does not send SMS messages.

## Next steps
- Connect backend routes to the Prisma client once the database is provisioned (see `docs/database-design.md`).
- Replace mock data in both frontend and backend with real persistence and caching.
- Expand verification to persist to the real database and send codes through production email/SMS providers.
- Add real-time notifications or email updates when submissions land.
- Explore the [AWS serverless deployment guide](docs/serverless-deployment.md) and architecture diagram (`docs/aws-architecture.drawio`) to run the stack on Lambda, API Gateway, S3, and CloudFront without managing servers or VPCs.

## Design notes
This repository follows the attached IdeaBridge product document: permanent idea listings, app submissions tied to ideas, distinct creator/developer profiles, and optional statistics. The current scaffolds keep the scope light while leaving clear seams for future expansion across web and infrastructure layers.
