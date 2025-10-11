# Authentication & User Management Scope

## Key Assumptions
- Users authenticate with email + password. No social login or SSO required right now.
- A single account can act as both an idea creator and a developer. Role preference is stored per profile but tied to the same user.
- Session persistence relies on HTTP-only cookies carrying a signed session token (JWT). The frontend is a browser SPA served from `localhost:5173`, so cookies will be shared via CORS with credentials.
- SMS verification is required before granting authenticated access. Users supply a phone number during signup and can trigger new codes from account settings.
- SMS delivery relies on Amazon SNS configuration (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_SESSION_TOKEN`, `AWS_SNS_SENDER_ID`, `AWS_SNS_ORIGINATION_NUMBER`, `AWS_SNS_SMS_TYPE`); without them verification texts will not be sent (codes are logged instead).
- Password reset flows (forgot password) remain out of scope for this iteration.
- Admin-level features (e.g., banning users) are not required yet.

## Must-Have Features
1. **Sign up** – Create a new user with email, password, display name, and optional role preference.
2. **Sign in** – Require pending users to verify via SMS before issuing a session.
3. **Sign out** – Invalidate the current session.
4. **Profile update** – Allow the authenticated user to edit display name, bio, and role preference.
5. **Account delete** – Soft delete the user and detach linked ideas/apps while retaining historical submissions for other users.
6. **Verification management** – Support resending codes and updating phone numbers from account settings.

## Non-Goals for Now
- Multi-factor authentication beyond the one-time code challenge.
- OAuth integrations (GitHub, Google, etc.).
- Mobile client parity (will be addressed after the web experience is stable).
- Rate limiting and brute-force protection (to be considered later).

## Follow-up Questions (for future iterations)
- Should users be able to upload avatars? (Requires storage planning.)
- Do we need email verification before granting full access?
- How should we treat existing mock profiles once real accounts exist?
