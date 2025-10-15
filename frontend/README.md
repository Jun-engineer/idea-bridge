# IdeaBridge Frontend (Vite + React)

The IdeaBridge frontend is a single-page application built with Vite, React 18, and TypeScript. It delivers the full product experience for idea creators and builders, including authentication, idea browsing, submissions, profiles, and account management.

## Feature highlights
- **Idea feed & detail:** Browse curated ideas, drill into requirements, and view submitted apps.
- **Submissions:** Forms for idea creators to propose new ideas and for builders to submit implementations.
- **How it works guide:** Dedicated instructions page walking new users through account setup, idea exploration, and collaboration steps.
- **Authentication & verification:** Email/password auth with phone verification, mirroring the backend contract.
- **Account settings:** Update display name, bio, phone number, and preferred role; trigger SMS codes.
- **Shared mock data:** When the API is offline the app can fall back to bundled mocks to stay functional.

## Project structure
```
src/
├── api/          # Typed REST API client wrappers
├── components/   # Shared layout/navigation controls
├── context/      # Auth context provider and hooks
├── data/         # Mock fixtures (mirrors backend seed)
├── pages/        # Route components for each major view
├── types/        # Shared TypeScript models
└── utils/        # Helpers (formatting, validation, filtering)
```

## Getting started
```bash
cd frontend
npm install
npm run dev
```

- Development server defaults to `http://localhost:5173`.
- The app expects the backend at `http://localhost:4000` during development. Override by setting `VITE_API_BASE_URL`.

## Environment variables
Create `.env` (ignored) with any overrides:
```
VITE_API_BASE_URL=https://api.example.com
VITE_ENABLE_MOCKS=false
```

`VITE_ENABLE_MOCKS` toggles whether the app should use in-memory data when the API is unavailable. During CI this remains `false` so network failures surface quickly.

## Scripts
```bash
npm run dev       # Start Vite dev server
npm run build     # Production bundle (outputs to dist/)
npm run preview   # Preview the production build locally
npm run lint      # ESLint with type-aware rules
```

## Testing
Frontend testing is handled via Playwright and integration tests in the monorepo (roadmap). For now, focus on end-to-end coverage through the backend test suite and manual QA.

## Shared conventions
- TypeScript strict mode is enabled; all components must be typed.
- Styling leverages Tailwind-esque utility classes defined in `App.css` until a full design system lands.
- API calls go through `src/api/http.ts` to ensure auth headers and error handling are consistent across clients.

## Deployment
`npm run build` emits a static bundle that the Terraform stack uploads to S3 and serves through CloudFront (see `docs/aws-infrastructure.md`).

## Further reading
- Root repository guide: [`../README.md`](../README.md)
- Auth requirements: [`../docs/auth-requirements.md`](../docs/auth-requirements.md)
- Programming spec: [`../docs/programming-spec.md`](../docs/programming-spec.md)
