# IdeaBridge Database Design

_Last updated: 2025-10-15_

## 1. Goals & Principles
- Provide a normalized relational schema that models ideas, submissions, users, sessions, and verification flows.
- Support future migration from the current in-memory stores with minimal code churn.
- Optimise for transactional workloads (OLTP) while remaining analytics-friendly via materialised views.
- Keep the schema portable between PostgreSQL (primary target) and DynamoDB (serverless alternative).

## 2. Logical Data Model
```
Users ──< Ideas ──< AppSubmissions
  │          │           │
  │          └──< IdeaTags
  │          └──< IdeaLikes
  │          └──< IdeaBookmarks
  │
  ├──< Sessions
  ├──< VerificationRequests
  └──< PhoneNumbers (history)
```

### Core entities
| Entity | Description |
| --- | --- |
| `users` | Registered accounts (idea creators & developers). Stores auth profile, display name, phone state. |
| `ideas` | Problem statements authored by idea creators. Contains metadata & moderation flags. |
| `app_submissions` | Builder submissions linked to ideas with deployment links & media. |
| `sessions` | Server-side session tokens (HTTP-only cookie reference). |
| `verification_requests` | One-time codes for phone verification. |
| `idea_tags` | Join table for flexible tagging. |
| `idea_likes` & `idea_bookmarks` | Interaction tables to support counts & personalised views. |
| `submission_likes` | Optional extension mirroring idea likes for apps. |

## 3. Physical Schema (PostgreSQL)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  preferred_role TEXT CHECK (preferred_role IN ('idea-creator','developer')),
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT FALSE NOT NULL,
  pending_verification_method TEXT,
  role_change_eligible_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0 NOT NULL,
  bookmarks_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  published BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE idea_tags (
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (idea_id, tag)
);

CREATE TABLE idea_likes (
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE idea_bookmarks (
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE app_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  developer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE submission_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES app_submissions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order SMALLINT DEFAULT 0 NOT NULL
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  destination TEXT NOT NULL,
  masked_destination TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts_remaining SMALLINT NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_ideas_creator ON ideas(creator_id);
CREATE INDEX idx_app_submissions_idea ON app_submissions(idea_id);
CREATE INDEX idx_app_submissions_developer ON app_submissions(developer_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_verification_user_method ON verification_requests(user_id, method);
```

### Derived data views
- `idea_summary_view`: join ideas with counts from `idea_likes` & `app_submissions` for feed queries.
- `developer_metrics_view`: aggregate submissions & likes for profile badges.

## 4. Seed & Migration Strategy
1. Use Prisma Migrate to create the base schema (models map directly to the SQL above).
2. Seed scripts should live under `database/prisma/seed.ts`, importing the JSON fixtures currently used by the backend.
3. When production data exists, prefer idempotent upsert seeds for reference data (tags, onboarding prompts).
4. Apply migrations through CI using GitHub Actions once the Terraform pipeline deploys the Aurora/RDS instance (future milestone).

## 5. DynamoDB Compatibility Bridge
While PostgreSQL is the long-term store, the backend includes Dynamo-aware utilities.
- Partition key strategy: `PK`/`SK` design shown in `backend/src/data/verificationStore.ts`.
- To pivot fully to Dynamo, mirror the relational schema using the following patterns:
  - `USER#<id>` items for user core data.
  - `IDEA#<id>` with GSI for tag lookups.
  - `SUBMISSION#<id>` anchored to `IDEA#` partition.
- Store verification requests exactly as implemented in `verificationStore` (already Dynamo-compatible).

## 6. Data Retention & GDPR
- `deleted_at` allows soft deletion; background workers should purge PII after 30 days.
- Phone numbers are stored in `phone_numbers` history for auditing; mask when presented.
- Audit logs (future) should capture role changes, verification attempts, and submission approvals.

## 7. Next Steps
- Model moderation queues (`idea_moderation_events`) to capture approve/reject workflows.
- Add notification preferences to `users` for granular communication controls.
- Introduce vector indices or trigram indexes on `ideas.title` and `ideas.description` to power search.
- Align Prisma schema with this document (update `schema.prisma`, regenerate client, adjust services).
