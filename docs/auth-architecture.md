# Authentication Architecture Plan

## Data Model Changes

Update Prisma schema with new entities:

- `User`
  - `id` (UUID)
  - `email` (unique)
  - `passwordHash`
  - `displayName`
  - `bio` (optional)
  - `preferredRole` (`"idea-creator" | "developer" | null`)
  - `createdAt` / `updatedAt`
  - `deletedAt` (nullable for soft deletes)
- `Session`
  - `id` (UUID)
  - `userId` (FK → `User`)
  - `refreshTokenHash`
  - `expiresAt`
  - `createdAt`
  - Later: track user agent / IP if needed

Existing `IdeaCreatorProfile` and `DeveloperProfile` in the mock layer will gradually be replaced by filtering ideas/apps through the authenticated user. For now we will:
- Attach `userId` to future persistent idea/app records so we know who created them.
- Continue serving mock data until database integration is complete.

## Backend Endpoints

All routes are prefixed with `/api/auth`:

| Method | Path                         | Description                                           | Auth required |
|--------|------------------------------|-------------------------------------------------------|---------------|
| POST   | `/register`                  | Create a new user and dispatch verification challenge | No            |
| POST   | `/login`                     | Verify credentials, require verification if pending   | No            |
| POST   | `/logout`                    | Destroy session + clear cookie                        | Yes           |
| GET    | `/me`                        | Current user profile (from session)                   | Yes           |
| PUT    | `/me`                        | Update display name, bio, preferred role, phone       | Yes           |
| DELETE | `/me`                        | Soft delete user and revoke sessions                  | Yes           |
| GET    | `/verification/:requestId`   | Fetch masked destination + timers for a request       | No            |
| POST   | `/verification/request`      | Resend verification code (cooldown aware)             | No            |
| POST   | `/verification/confirm`      | Submit verification code to activate the account      | No            |
| POST   | `/verification/start`        | Authenticated users request a new SMS challenge       | Yes           |

### Auth & Verification Flow
- Passwords hashed with `argon2id` using `argon2` package.
- Every successful registration or login for an unverified account issues an SMS verification request and returns `{ status: "verification_required" }` with a masked destination and countdown timers.
- Users cannot obtain an authenticated session until they confirm the one-time code via `/verification/confirm`; the response sets the session cookie + JWT.
- Authenticated users can request new SMS challenges via `/verification/start` without dropping their current session.
- Updating the phone number through `/me` reuses the existing profile data when unchanged and triggers a fresh SMS challenge only when the number actually differs (normalized to E.164).
- Middleware validates the JWT from the session cookie on each request and attaches `req.authUser` when present.
- SMS delivery uses Amazon SNS. Configure `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_SESSION_TOKEN`, `AWS_SNS_SENDER_ID`, `AWS_SNS_ORIGINATION_NUMBER`, and `AWS_SNS_SMS_TYPE` to enable outbound messages. When unset, the API logs the code and returns a 201 response but no SMS is sent.

## Frontend State Management

- Create `auth` slice via React context + reducer.
- Persist access token in memory; rely on refresh cookie for background refresh later.
- On app init, call `/api/auth/me` to restore session (cookie-based) if available.

## Pages / Components

1. **Sign In (`/signin`)**
   - Email + password form
   - On success redirect to home and update auth context
2. **Sign Up (`/signup`)**
   - Email, password, confirm password, display name, optional preferred role
   - Auto login on success
3. **Profile settings (`/profile/settings`)**
   - Accessible when authenticated. Allows editing profile fields.
   - Buttons for logout and delete account. Deletion asks for confirmation.
4. **Navigation bar** adjusts to show login/signup when logged out, otherwise shows user dropdown with links to profile, logout.

## Middleware & Utilities

- `authMiddleware` verifying JWT, attaching `req.user`.
- `errorHandler` updates to handle auth errors consistently.
- `rateLimiter` (future enhancement) – out of scope now.

## Security Considerations

- Ensure CORS allows credentials (`credentials: true`) and set cookies with `SameSite=lax`.
- Use environment variable `JWT_SECRET` and `SESSION_COOKIE_NAME`.
- Hash refresh tokens before storing to mitigate DB leaks.
- Soft deletes keep historical data but prevent login by setting `deletedAt` and rejecting login attempts for deleted accounts.

## Migration Plan

1. Update Prisma schema + run `npx prisma migrate dev` (later).
2. Implement backend routes + middleware.
3. Integrate frontend pages and global auth context.
4. Replace mock profile fetching with `/auth/me` once real data available.
5. Remove or adapt mock fallbacks once persistent data is live.
