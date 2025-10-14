# IdeaBridge Programming Specification

_Last updated: 2025-10-15_

## 1. Purpose
Provide consistent engineering guidelines across the monorepo so that new features integrate smoothly, remain testable, and align with the product roadmap.

## 2. Tech Stack Overview
| Layer | Stack |
| --- | --- |
| Web frontend | React 18, Vite, TypeScript, React Router |
| Mobile | Expo SDK 54, React Native, TypeScript, Native Stack Navigation |
| Backend API | Node.js 18, Express, Zod, @vendia/serverless-express |
| Database | Prisma (PostgreSQL target), optional DynamoDB adapters |
| Infrastructure | Terraform, AWS (CloudFront, S3, Lambda, API Gateway, DynamoDB, SNS) |
| Tooling | ESLint (flat config), Prettier, Jest, TypeScript strict mode |

## 3. Repository Conventions
- **TypeScript everywhere.** Avoid `.js` files except for generated output or tooling entry points.
- **Module boundaries:**
  - `frontend/src/api` & `mobile/src/api` should expose typed client helpers only; do not embed UI logic.
  - `backend/src/routes` coordinates request validation and delegates to services. Business rules live in `backend/src/services`.
  - `backend/src/data` is the persistence seam. When swapping in Prisma, only this layer changes.
- **Imports:** use relative paths within each package; avoid path aliases to keep tsconfig simple.
- **State management:**
  - Web: React Context for auth, local component state for everything else.
  - Mobile: React Context + hooks; avoid Redux unless a cross-app store arises.
- **Styling:**
  - Web: utility classes in `App.css` + component-scoped CSS modules.
  - Mobile: `StyleSheet.create` with semantic names; keep styles near components.
- **Commit messages:** Conventional (`feat:`, `fix:`, `docs:`) when contributing back to the repo.

## 4. Coding Standards
- Enable `strict` TypeScript options in all tsconfig files (already enforced).
- Prefer `async/await`; never mix with `.then()` in the same block.
- Use Zod for runtime validation at API boundaries; throw typed errors from services.
- Reuse shared utilities:
  - Phone parsing/formatting -> `mobile/src/utils/phone.ts` & mirrored logic in the backend helper.
  - Auth token management -> `mobile/src/api/http.ts` & `frontend/src/api/http.ts` (once unified).
- Error handling:
  - Backend responds with JSON bodies `{ error: string }` and appropriate HTTP status codes.
  - Frontend/mobile display toast or inline error messages; never swallow errors silently.

## 5. Testing Strategy
- **Backend:**
  - Jest + Supertest for route-level tests (`backend/tests`).
  - Use in-memory stores for deterministic behaviour; seed known fixtures per test file.
- **Frontend / Mobile:**
  - Lightweight unit tests using React Testing Library (planned).
  - Snapshot coverage for key components once UI stabilises.
  - Manual smoke runs recorded in QA checklist per release.
- **CI Pipeline:**
  - `npm run lint` and `npm test` gates per package.
  - Terraform plan in GitHub Actions before deploy.

## 6. API Guidelines
- Version routes under `/api` (v1 is implicit). Future major revisions should mount `/api/v2`.
- Use nouns for resources (`/api/ideas/:id`), verbs for RPC style only when necessary.
- Paginate list endpoints with `cursor` + `limit`; include `hasMore` in responses (backlog item).
- Document auth requirements in route comments and update `docs/programming-spec.md` when adding new scopes.

## 7. Security & Compliance
- Secrets loaded via environment variables; do not commit `.env` files.
- Sanitize all user-supplied HTML before rendering (currently not accepted; keep it that way).
- Password policy: minimum 8 characters. Enforce stronger rules before public launch.
- Rate limiting implemented with `backend/src/utils/rateLimiter.ts`; ensure new endpoints use it when exposed publicly.
- Sessions stored as opaque IDs; rotate signing keys quarterly.

## 8. Branching & Release
- `develop` is the integration branch; feature branches follow `feat/<slug>`.
- Create release branches (`release/*`) when preparing production deploys.
- Tag releases with semantic versioning `vMAJOR.MINOR.PATCH`.
- Post-deploy checklist lives in `docs/serverless-deployment.md`.

## 9. Definition of Done Checklist
- [ ] Feature behind flags or handled gracefully when dependencies missing.
- [ ] New environment variables documented in root README and `.env.example`.
- [ ] Unit tests updated/added.
- [ ] Telemetry/log statements included for critical flows.
- [ ] Documentation updated (README + relevant design doc).

## 10. Future Enhancements
- Shared package for domain types (`packages/domain`).
- Component library with design tokens across web & mobile.
- Automated accessibility tests using Axe & Detox.
- Storybook for visual regression alignment.
