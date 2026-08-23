# Leave Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toplance runs on Clerk, Drizzle over plain PostgreSQL, and S3-compatible storage, with no Supabase dependency and every access decision enforced in code.

**Architecture:** Authorization is already split in two and committed: a pure policy module (`src/lib/auth/policy.ts`) holds every access decision as a function over an `Actor` and an `ApplicationRef`, with 23 tests and no I/O. This plan adds the guards that load an actor from the Clerk session, fetch the row, and apply a policy predicate — then rebuilds the schema, data layer, identity and storage underneath them. Server actions call guards; nothing queries the database without passing one.

**Tech Stack:** Next.js 16 App Router, `@clerk/nextjs` v7 (Core 3, Future API), `drizzle-orm` 0.45 with `pg`, `drizzle-kit` 0.31, `@aws-sdk/client-s3`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-23-platform-stack-migration-design.md`

**Supersedes:** `2026-08-23-phase-1-clerk-auth.md`, which staged Supabase removal across three phases. Its Tasks 1 and 2 are done and carried forward; its Task 3 was reverted in `9e74061`.

## Already done

- Vitest, `vitest.config.mts`, `npm test` — commit `1f5d0e0`.
- `src/lib/auth/policy.ts` and its 23 tests — commit `68b3127`. Client-agnostic by design; nothing in this plan changes it.

## Global Constraints

- Authentication is **email one-time code only**. No passwords, no social login. Client-locked, recorded in `src/app/(auth)/actions.ts`. Clerk must be configured with **Email verification code** as the sole first factor and password disabled.
- `@clerk/nextjs` v7 uses the **Future API** (`signIn.emailCode.sendCode()`, `signIn.finalize()`), *not* the legacy `prepareFirstFactor`/`attemptFirstFactor`/`setActive` pattern. Legacy examples found online will not work.
- `auth()` and `clerkClient()` are **async** in Core 3 — always `await auth()`.
- Next.js 16 uses `src/proxy.ts`, not `middleware.ts`. It exports a single function, default or named `proxy`.
- Drizzle's `pgTable` second-argument callback returns an **array**, not an object.
- Roles (`app_role`, `staff_role`, `org_role`) stay in PostgreSQL, never in Clerk metadata.
- Three sign-in surfaces keep their distinct copy and destinations: traveller → `/app`, employer → `/employer`, operations → `/ops`.
- Do not modify anything under `src/components/ui/`, the design system, or `src/lib/domain/`.
- Port 54322 is taken on the development machine by another Supabase project. This project uses **54329** for Postgres and **54330/54331** for the object store.

## Table naming: keep the current names

The schema is rebuilt from scratch, which would be the cheapest moment to fix the
deviations AGENTS.md records — `audit_log` → `audit_logs`, `organisations` →
`organizations`, `org_members` → `memberships`, tables into a `toplance` schema
with identity in `core`.

**This plan keeps the current names**, because AGENTS.md is explicit: *"Do not
migrate these unilaterally — the schema move is part of BeOrchid Core work and
gets planned with the platform team."* Renaming without written agreement would
break that instruction; recreating the names silently as if they were correct
would break the other half of it, which is why this section exists.

The cost of deferring is low and bounded: every name lives in one file,
`src/lib/db/schema.ts`, and with no production data a rename is an edit plus a
regenerated migration. When sign-off arrives, that is the whole change.

One name does change, unavoidably: `profiles.id` stops being a UUID foreign key
to `auth.users` and becomes the Clerk user ID as a `text` primary key. That is
not a convention decision, it is what removing Supabase auth means.

## Prerequisites

Tasks 1–4 need no credentials and can be done immediately. Tasks 5 onward need:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the Toplance Clerk application, email-code enabled, password disabled.

If Clerk keys are unavailable, stop after Task 4 and report. Do not stub or fake Clerk.

## Behaviour change to be aware of

`submitApplication` inserts a `status_events` row as the traveller. The RLS policy `"staff write status events"` restricts that insert to staff, and the code never checks the returned error — so today the submission event is silently **not** recorded. Without RLS the insert starts succeeding. That is correct (the event is system-generated on the traveller's behalf), but expect status events to appear where previously there were none.

## File Structure

**Create:**
- `docker-compose.yml` — Postgres and MinIO for local development
- `drizzle.config.ts` — Drizzle Kit configuration
- `src/lib/db/schema.ts` — the entire schema, and the only place table names live
- `src/lib/db/client.ts` — the pooled connection
- `src/lib/db/seed.ts` — runs `supabase/seed.sql`'s successor
- `drizzle/` — generated migrations, committed
- `src/lib/auth/errors.ts` — `UnauthenticatedError`, `ForbiddenError`
- `src/lib/auth/guards.ts` — session → actor, row fetch, policy application
- `src/lib/storage/documents.ts` — S3 upload, signed download, delete

**Modify:**
- `package.json` — dependencies and scripts
- `.env.local.example` — Clerk, `DATABASE_URL`, S3
- `src/app/layout.tsx` — `ClerkProvider`
- `src/proxy.ts` — `clerkMiddleware`
- `src/lib/data/applications.ts` — Drizzle queries, Clerk profile lookup, provisioning
- `src/app/(app)/actions.ts` — Drizzle, guards, S3 storage
- `src/app/(auth)/actions.ts` — `completeProfile` only
- `src/components/auth/auth-form.tsx` — Clerk Future API
- `src/components/app/account-menu.tsx` — Clerk sign-out
- `src/app/(app)/layout.tsx`, `src/app/(app)/app/*.tsx`, `src/app/employer/page.tsx`, `src/app/ops/page.tsx` — setup guard and role checks
- `src/components/shared/setup-notice.tsx` — new setup instructions

**Delete:**
- `src/lib/supabase/` — the whole directory
- `src/app/auth/callback/route.ts`
- `supabase/` — migrations, seed, config
- `@supabase/ssr`, `@supabase/supabase-js`, `supabase` from `package.json`

---

### Task 1: Local Postgres, MinIO and the Drizzle connection

**Files:**
- Create: `docker-compose.yml`, `drizzle.config.ts`, `src/lib/db/client.ts`
- Modify: `package.json`, `.env.local.example`, `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: `db` (a `NodePgDatabase<typeof schema>`) from `@/lib/db/client`; `npm run db:up`, `db:down`, `db:generate`, `db:migrate`, `db:seed`

- [ ] **Step 1: Install the dependencies**

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

- [ ] **Step 2: Write the compose file**

Create `docker-compose.yml`:

```yaml
# Local development only. Staging and production run on Coolify.
#
# Ports are deliberately not the Supabase defaults: another project on
# this machine already holds 54322.
services:
  postgres:
    image: postgres:16-alpine
    container_name: toplance_postgres
    environment:
      POSTGRES_USER: toplance
      POSTGRES_PASSWORD: toplance
      POSTGRES_DB: toplance
    ports:
      - "54329:5432"
    volumes:
      - toplance_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U toplance"]
      interval: 5s
      timeout: 5s
      retries: 10

  # Stands in for whatever S3-compatible store production uses. The app
  # talks to it through the S3 SDK, so swapping MinIO for R2 or S3 is an
  # endpoint and a pair of credentials.
  minio:
    image: minio/minio:latest
    container_name: toplance_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: toplance
      MINIO_ROOT_PASSWORD: toplance123
    ports:
      - "54330:9000"
      - "54331:9001"
    volumes:
      - toplance_minio:/data

volumes:
  toplance_pgdata:
  toplance_minio:
```

- [ ] **Step 3: Configure Drizzle Kit**

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  casing: "snake_case",
});
```

- [ ] **Step 4: Create the connection**

Create `src/lib/db/client.ts`:

```ts
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";

/**
 * Whether this process has a database to talk to.
 *
 * The public marketing page has no session and must render whether or
 * not the stack is configured — a missing .env.local should disable the
 * parts that need a database, not take the whole site down. Pages that
 * need one check this and show the setup notice instead.
 */
export const hasDatabaseEnv = Boolean(process.env.DATABASE_URL);

export const SETUP_STEPS = [
  "npm run db:up          # starts Postgres and MinIO in Docker",
  "cp .env.local.example .env.local",
  "npm run db:migrate     # applies the schema",
  "npm run db:seed        # loads the corridors",
] as const;

/**
 * One pool per process. `new Pool` opens no connection on its own, so
 * building it without a URL is harmless: the failure surfaces on first
 * query, and `hasDatabaseEnv` is what stops us getting there.
 *
 * Next reloads modules in development, so the pool is cached on
 * `globalThis` — otherwise every hot reload leaks one until Postgres
 * refuses new connections.
 */
const globalForDb = globalThis as unknown as { pool?: Pool };

globalForDb.pool ??= new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(globalForDb.pool, { schema, casing: "snake_case" });
```

Note that the pool must **not** throw when `DATABASE_URL` is absent. Building it
at import time and throwing there would take down the marketing page, which is
required to render without a database. `hasDatabaseEnv` is the gate; Task 8
wires it into every page that needs one.

- [ ] **Step 5: Replace the database scripts**

In `package.json`, remove the five `db:*` Supabase scripts and add:

```json
"db:up": "docker compose up -d",
"db:down": "docker compose down",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"db:seed": "node --experimental-strip-types src/lib/db/seed.ts"
```

Leave the `supabase` dev dependency in place for now; Task 8 removes it along with the rest.

- [ ] **Step 6: Update the environment example**

Replace `.env.local.example`:

```env
# Clerk. Both values are on the API Keys page of the Toplance
# application in the Clerk dashboard.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Where Clerk sends people who need to sign in.
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Postgres. `npm run db:up` starts it on this port; staging and
# production get their own value from Coolify.
DATABASE_URL=postgres://toplance:toplance@127.0.0.1:54329/toplance

# Document storage, S3-compatible. `npm run db:up` starts MinIO with
# these credentials; production points at whatever the platform team
# provisions.
S3_ENDPOINT=http://127.0.0.1:54330
S3_REGION=us-east-1
S3_BUCKET=documents
S3_ACCESS_KEY_ID=toplance
S3_SECRET_ACCESS_KEY=toplance123
```

- [ ] **Step 7: Start the stack and prove the connection**

```bash
npm run db:up
docker exec toplance_postgres pg_isready -U toplance
docker ps --filter name=toplance --format '{{.Names}}\t{{.Status}}'
```

Expected: `accepting connections`, and both containers up with
`toplance_postgres` healthy.

If the first pull fails with `docker-credential-desktop: executable file not
found in $PATH`, Docker Desktop's helper is not on the shell's PATH. Prefix the
command rather than reconfiguring Docker:

```bash
PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" npm run db:up
```

Only the first pull needs it; once the images are local, `npm run db:up` works
unprefixed.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml drizzle.config.ts src/lib/db/client.ts package.json package-lock.json .env.local.example
git commit -m "Add local Postgres, MinIO and the Drizzle connection"
```

---

### Task 2: The schema

Translate `supabase/migrations/20260821120000_init.sql` into Drizzle. Read that file first. Everything except the RLS policies, the `auth.uid()` helper functions and the storage bucket carries over; those are replaced by `src/lib/auth/policy.ts` and Task 7 respectively.

**Files:**
- Create: `src/lib/db/schema.ts`

**Interfaces:**
- Consumes: nothing
- Produces: table objects `profiles`, `organisations`, `orgMembers`, `invitations`, `corridors`, `corridorRequirements`, `applications`, `intakeAnswers`, `documents`, `messages`, `statusEvents`, `itineraries`, `auditLog`; enums `appRole`, `staffRole`, `orgRoleEnum`, `applicationStatus`, `documentState`, `travelPurpose`, `invitationStatus`; inferred types `Profile`, `Application`, `DocumentRow`

- [ ] **Step 1: Write the schema**

Create `src/lib/db/schema.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The whole Toplance schema.
 *
 * Table and column names match the previous Supabase schema on purpose:
 * the BeOrchid conventions call for `core`/`toplance` schemas and some
 * corrected spellings, but AGENTS.md reserves that move for platform
 * work planned with the team. This file is the only place the names
 * appear, so adopting them later is an edit and a regenerated migration.
 *
 * The one forced change: `profiles.id` is the Clerk user id, a text
 * primary key, and every reference to a person is text too.
 */

export const appRole = pgEnum("app_role", ["traveler", "org_member", "staff"]);
export const staffRole = pgEnum("staff_role", ["reviewer", "owner"]);
export const orgRoleEnum = pgEnum("org_role", ["hr_admin", "owner"]);

export const applicationStatus = pgEnum("application_status", [
  "draft",
  "collecting_documents",
  "submitted",
  "under_review",
  "additional_documents",
  "approved",
  "rejected",
]);

export const documentState = pgEnum("document_state", [
  "not_started",
  "uploaded",
  "checking",
  "verified",
  "flagged",
  "failed",
]);

export const travelPurpose = pgEnum("travel_purpose", [
  "tourism",
  "work",
  "study",
  "medical",
  "relocation",
]);

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

/**
 * One row per person, keyed on the Clerk user id. English is official
 * in Nigeria but a second language for many, so the traveller surface
 * localises to Hausa, Yoruba and Igbo.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: text().primaryKey(),
    fullName: text().notNull().default(""),
    email: text().notNull(),
    phone: text(),
    countryIso: text().notNull().default("ng"),
    locale: text().notNull().default("en"),
    role: appRole().notNull().default("traveler"),
    staffRole: staffRole(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("locale_supported", sql`${t.locale} in ('en', 'ha', 'yo', 'ig')`),
    check(
      "staff_role_only_for_staff",
      sql`${t.staffRole} is null or ${t.role} = 'staff'`
    ),
  ]
);

export const organisations = pgTable(
  "organisations",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    domain: text(),
    seatsPurchased: integer().notNull().default(0),
    billingContact: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("seats_not_negative", sql`${t.seatsPurchased} >= 0`)]
);

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: orgRoleEnum().notNull().default("hr_admin"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })]
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid()
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    email: text().notNull(),
    fullName: text().notNull().default(""),
    jobTitle: text(),
    destinationIso: text(),
    purpose: travelPurpose(),
    status: invitationStatus().notNull().default("pending"),
    token: text()
      .notNull()
      .unique()
      .default(sql`encode(gen_random_bytes(24), 'hex')`),
    invitedBy: text().references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 days'`),
  },
  (t) => [index("invitations_org_idx").on(t.orgId, t.status)]
);

/**
 * A corridor is one nationality → one destination → one purpose. Rule
 * sets are versioned: when a mission changes what it wants, everyone on
 * that corridor sees the change with its effective date.
 */
export const corridors = pgTable(
  "corridors",
  {
    id: uuid().primaryKey().defaultRandom(),
    nationalityIso: text().notNull(),
    destinationIso: text().notNull(),
    purpose: travelPurpose().notNull(),
    visaName: text().notNull(),
    version: integer().notNull().default(1),
    effectiveFrom: date().notNull().defaultNow(),
    sourceName: text(),
    sourceUrl: text(),
    processingWeeksMin: integer(),
    processingWeeksMax: integer(),
    governmentFeeMinor: bigint({ mode: "number" }),
    governmentFeeCurrency: text().default("NGN"),
    isLive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("corridors_corridor_version_key").on(
      t.nationalityIso,
      t.destinationIso,
      t.purpose,
      t.version
    ),
  ]
);

export const corridorRequirements = pgTable(
  "corridor_requirements",
  {
    id: uuid().primaryKey().defaultRandom(),
    corridorId: uuid()
      .notNull()
      .references(() => corridors.id, { onDelete: "cascade" }),
    docKey: text().notNull(),
    name: text().notNull(),
    description: text(),
    category: text().notNull().default("identity"),
    isRequired: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [unique("corridor_requirements_doc_key").on(t.corridorId, t.docKey)]
);

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    caseRef: text()
      .notNull()
      .unique()
      .default(sql`'TPL-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0')`),
    travelerId: text()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    orgId: uuid().references(() => organisations.id, { onDelete: "set null" }),
    corridorId: uuid().references(() => corridors.id, { onDelete: "set null" }),
    status: applicationStatus().notNull().default("draft"),
    assigneeId: text().references(() => profiles.id, { onDelete: "set null" }),
    intakeComplete: boolean().notNull().default(false),
    submittedAt: timestamp({ withTimezone: true }),
    decidedAt: timestamp({ withTimezone: true }),
    slaDueAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("applications_traveler_idx").on(t.travelerId),
    index("applications_org_idx").on(t.orgId),
    index("applications_status_idx").on(t.status, t.slaDueAt),
  ]
);

/**
 * The intake conversation, one row per answered topic. Answers stay
 * editable: re-answering supersedes and rebuilds the checklist.
 */
export const intakeAnswers = pgTable(
  "intake_answers",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    questionKey: text().notNull(),
    value: text().notNull(),
    answeredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("intake_answers_question_key").on(t.applicationId, t.questionKey)]
);

/**
 * The privacy boundary in data form. Nothing an organisation can reach
 * exposes a row of this table — see canReadDocuments in
 * src/lib/auth/policy.ts, which is now the only thing enforcing it.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    docKey: text().notNull(),
    name: text().notNull(),
    state: documentState().notNull().default("not_started"),
    storagePath: text(),
    reason: text(),
    attempts: integer().notNull().default(0),
    isRequired: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    checkedAt: timestamp({ withTimezone: true }),
    verifiedBy: text().references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("documents_doc_key").on(t.applicationId, t.docKey),
    index("documents_application_idx").on(t.applicationId, t.state),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    applicationId: uuid()
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    senderId: text().references(() => profiles.id, { onDelete: "set null" }),
    senderRole: appRole().notNull(),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp({ withTimezone: true }),
  },
  (t) => [index("messages_application_idx").on(t.applicationId, t.createdAt)]
);

/** Every status change carries a message to the traveller. */
export const statusEvents = pgTable("status_events", {
  id: uuid().primaryKey().defaultRandom(),
  applicationId: uuid()
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  fromStatus: applicationStatus(),
  toStatus: applicationStatus().notNull(),
  message: text(),
  actorId: text().references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const itineraries = pgTable("itineraries", {
  id: uuid().primaryKey().defaultRandom(),
  applicationId: uuid()
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: "cascade" }),
  payload: jsonb().notNull().default({}),
  generatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    actorId: text().references(() => profiles.id, { onDelete: "set null" }),
    action: text().notNull(),
    subjectType: text().notNull(),
    subjectId: uuid(),
    meta: jsonb().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_subject_idx").on(t.subjectType, t.subjectId, t.createdAt),
  ]
);

export type Profile = typeof profiles.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Corridor = typeof corridors.$inferSelect;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no output. Errors here are usually a Drizzle API mismatch — check the installed version's docs rather than guessing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "Define the schema in Drizzle"
```

---

### Task 3: Generate, extend and apply the migration

**Files:**
- Create: `drizzle/*.sql` (generated), `drizzle/9999_sql_objects.sql` (hand-written)

**Interfaces:**
- Consumes: `src/lib/db/schema.ts` (Task 2)
- Produces: an applied schema, the `application_completion` function, the `org_application_progress` view, and `updated_at` triggers

- [ ] **Step 1: Generate the migration**

```bash
npm run db:generate
```

Expected: a new file under `drizzle/`, reporting 13 tables. Read it and confirm
every table from Task 2 is present.

Then add the extension by hand, as the first statement of the generated file.
Drizzle Kit does not model extensions, and the `invitations.token` default calls
`gen_random_bytes`, which `pgcrypto` provides — without it the migration fails
at the first `CREATE TABLE` that depends on it:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
```

(`gen_random_uuid` is built in from Postgres 13 and needs nothing.)

- [ ] **Step 2: Add the SQL objects Drizzle does not model**

Create `drizzle/9999_sql_objects.sql`. Drizzle Kit does not generate functions, views or triggers, so these are hand-written and applied after the generated migration:

```sql
-- One definition of "percent complete", used by every persona.
create or replace function application_completion(app_id uuid)
returns table (total int, verified int, pct int)
language sql
stable
as $$
  select
    count(*)::int as total,
    count(*) filter (where state = 'verified')::int as verified,
    coalesce(
      round(
        100.0 * count(*) filter (where state = 'verified') / nullif(count(*), 0)
      )::int,
      0
    ) as pct
  from documents
  where application_id = app_id and is_required;
$$;

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();

drop trigger if exists applications_touch on applications;
create trigger applications_touch before update on applications
  for each row execute function touch_updated_at();

drop trigger if exists documents_touch on documents;
create trigger documents_touch before update on documents
  for each row execute function touch_updated_at();

-- Everything an employer is allowed to see about a sponsored
-- application. It carries no column that could reveal a document.
--
-- The previous version was `security_invoker`, which leaned on RLS to
-- scope rows to the caller's own organisation. Without RLS that does
-- nothing, so the data layer filters by org_id explicitly and this view
-- is a plain projection. Adding a column that reveals document contents
-- would break the promise made on the marketing site and in the console.
create or replace view org_application_progress as
select
  a.id,
  a.case_ref,
  a.org_id,
  p.full_name,
  p.email,
  a.status,
  c.destination_iso,
  c.visa_name,
  a.submitted_at,
  a.updated_at,
  comp.total as documents_total,
  comp.verified as documents_verified,
  comp.pct as completion_pct
from applications a
join profiles p on p.id = a.traveler_id
left join corridors c on c.id = a.corridor_id
cross join lateral application_completion(a.id) comp;
```

- [ ] **Step 3: Apply everything**

```bash
npm run db:migrate
docker exec -i toplance_postgres psql -U toplance -d toplance -v ON_ERROR_STOP=1 < drizzle/9999_sql_objects.sql
```

Expected: `migrations applied successfully!`, then three "trigger does not
exist, skipping" notices.

**If `db:migrate` exits non-zero, it will not tell you why** — the spinner
overwrites the error. Get the real message by applying the file directly:

```bash
docker exec -i toplance_postgres psql -U toplance -d toplance \
  -v ON_ERROR_STOP=1 -q < drizzle/0000_*.sql
```

Note that psql applies statements one at a time with no surrounding
transaction, so a failure part-way leaves the database half-built. Reset before
retrying — there is no data to lose:

```bash
docker exec toplance_postgres psql -U toplance -d toplance \
  -c "drop schema public cascade; create schema public; drop schema if exists drizzle cascade;"
```

- [ ] **Step 4: Verify the shape**

```bash
docker exec toplance_postgres psql -U toplance -d toplance -c "\dt"
docker exec toplance_postgres psql -U toplance -d toplance -c "\d profiles"
docker exec toplance_postgres psql -U toplance -d toplance -c "select * from org_application_progress limit 1"
```

Expected: thirteen tables plus Drizzle's migrations table; `profiles.id` is `text`; the view returns zero rows without error.

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "Generate the initial migration and add the SQL objects"
```

---

### Task 4: Seed the corridors

`supabase/seed.sql` is plain SQL touching only `corridors`, `corridor_requirements` and `organisations`. It carries over unchanged apart from its location.

**Files:**
- Create: `src/lib/db/seed.sql`, `src/lib/db/seed.ts`
- Delete: `supabase/seed.sql`

**Interfaces:**
- Consumes: the applied schema (Task 3)
- Produces: four seeded corridors with their requirements, and one demo organisation

- [ ] **Step 1: Move the seed**

```bash
git mv supabase/seed.sql src/lib/db/seed.sql
```

The contents need no change: it references no Supabase-specific object.

- [ ] **Step 2: Write the runner**

Create `src/lib/db/seed.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Pool } from "pg";

/**
 * Reference data, not fixtures: the corridors are what the requirements
 * engine reads to build a traveller's checklist. Safe to re-run — every
 * statement in seed.sql is guarded.
 */
const here = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.local.example.");

const pool = new Pool({ connectionString: url });

try {
  await pool.query(readFileSync(join(here, "seed.sql"), "utf8"));
  console.log("Seeded corridors, requirements and the demo organisation.");
} finally {
  await pool.end();
}
```

- [ ] **Step 3: Make the seed re-runnable**

`seed.sql` inserts corridors unconditionally, so a second run would duplicate them. Add a guard as the first statement of the file, after the header comment:

```sql
-- Reference data is replaced wholesale on each run. Applications
-- reference corridors with `on delete set null`, so a re-seed during
-- development detaches checklists rather than destroying them.
delete from corridor_requirements;
delete from corridors;
```

- [ ] **Step 4: Run it**

```bash
npm run db:seed
docker exec toplance_postgres psql -U toplance -d toplance -c "select destination_iso, purpose, visa_name from corridors order by destination_iso"
```

Expected: four corridors — `ca` study, `de` work, `gb` work, `ae` work.

Run `npm run db:seed` a second time and confirm the count stays at four.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/seed.sql src/lib/db/seed.ts
git rm --cached supabase/seed.sql 2>/dev/null || true
git commit -m "Move the corridor seed onto Drizzle's Postgres"
```

---

### Task 5: Clerk identity

**Requires Clerk credentials.** Stop and report if unavailable.

**Files:**
- Modify: `package.json`, `src/app/layout.tsx`, `src/proxy.ts`, `src/components/auth/auth-form.tsx`, `src/app/(auth)/actions.ts`, `src/components/app/account-menu.tsx`
- Delete: `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `profiles` (Task 2), `db` (Task 1)
- Produces: a Clerk session available to `await auth()`; `completeProfile(input)` from `@/app/(auth)/actions`

- [ ] **Step 1: Install Clerk**

```bash
npm install @clerk/nextjs
```

- [ ] **Step 2: Wrap the app in ClerkProvider**

In `src/app/layout.tsx`, import `ClerkProvider` from `@clerk/nextjs` and wrap the returned tree with it, **inside** `<body>` rather than around `<html>` — Core 3 requires this for cache-component compatibility. Keep the existing provider nesting otherwise unchanged:

```tsx
<html lang={locale} suppressHydrationWarning>
  <body className={...}>
    <ClerkProvider>
      {/* existing providers and children, unchanged */}
    </ClerkProvider>
  </body>
</html>
```

- [ ] **Step 3: Replace the proxy**

Replace the entire contents of `src/proxy.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Next 16 renamed Middleware to Proxy. Clerk's own guide still says
 * `middleware.ts`; the export shape is identical, so a default export
 * here is what Next picks up.
 *
 * Session handling and a convenience redirect only. Authorization
 * decisions belong in the data layer, where `@/lib/auth/guards`
 * enforces them: a redirect here is a courtesy to the user, never the
 * thing standing between them and someone else's passport.
 */

/** Prefixes a signed-out visitor may reach. Everything else redirects. */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/employer/sign-in(.*)",
  "/ops/sign-in(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  const { userId } = await auth();
  if (userId) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
```

- [ ] **Step 4: Replace the auth server actions**

Replace the entire contents of `src/app/(auth)/actions.ts`:

```ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { toE164 } from "@/lib/domain/countries";
import { isLocale } from "@/lib/i18n/locales";

/**
 * Clerk holds the email address and the credential; everything a visa
 * application needs about a person lives in `profiles`. This runs once,
 * straight after sign-up completes, to write the fields the form
 * collected that Clerk has no opinion about.
 */
export async function completeProfile(input: {
  fullName: string;
  phone: string;
  countryIso: string;
  locale: string;
}): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Your session did not carry through. Sign in again." };

  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Enter your full name as it appears in your passport." };

  const digits = input.phone.replace(/\D/g, "");

  await db
    .update(profiles)
    .set({
      fullName,
      phone: digits ? toE164(input.countryIso, digits) : null,
      countryIso: input.countryIso,
      locale: isLocale(input.locale) ? input.locale : "en",
    })
    .where(eq(profiles.id, userId));

  revalidatePath("/", "layout");
  return {};
}
```

`signOut` is gone — Clerk signs out on the client, handled in Step 6.

- [ ] **Step 5: Rewire the auth form**

In `src/components/auth/auth-form.tsx`, keep the entire JSX tree, the two-screen structure, the OTP input, the copy and the audience handling exactly as they are. Change only the mechanism.

Replace the imports of `requestCode`, `verifyCode` and `AuthState` with:

```ts
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { completeProfile } from "@/app/(auth)/actions";
```

`AuthState` becomes local:

```ts
type FormState = { error?: string; sent?: boolean; email?: string };
```

Inside the component, after the existing `useLocale`/`useRouter`/`useSearchParams` calls:

```ts
const { signIn } = useSignIn();
const { signUp } = useSignUp();
const [profileFields, setProfileFields] = React.useState({
  fullName: "",
  phone: "",
  countryIso: "ng",
});
```

Replace `onRequest` with:

```ts
function onRequest(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const countryIso = String(formData.get("country_iso") ?? "ng");
  const phone = String(formData.get("phone") ?? "");

  if (!email || !email.includes("@")) {
    setState({ error: "Enter the email address you want the code sent to." });
    return;
  }
  if (mode === "sign-up" && !fullName) {
    setState({ error: "Enter your full name as it appears in your passport." });
    return;
  }

  setProfileFields({ fullName, phone, countryIso });

  startTransition(async () => {
    try {
      if (mode === "sign-up") {
        if (!signUp) return;
        await signUp.create({ emailAddress: email });
        await signUp.verifications.sendEmailCode();
      } else {
        if (!signIn) return;
        await signIn.create({ identifier: email });
        await signIn.emailCode.sendCode({ emailAddress: email });
      }
      setState({ sent: true, email });
      toast.success(`Code sent to ${email}`);
    } catch {
      const message =
        mode === "sign-in"
          ? "We could not find an account for that address. Create one instead."
          : "We could not send a code to that address. Check it and try again.";
      setState({ error: message });
      toast.error(message);
    }
  });
}
```

Replace `onVerify` with:

```ts
function onVerify() {
  startTransition(async () => {
    try {
      if (mode === "sign-up") {
        if (!signUp) return;
        await signUp.verifications.verifyEmailCode({ code });
        await signUp.finalize();
        const result = await completeProfile({ ...profileFields, locale });
        if (result.error) toast.error(result.error);
      } else {
        if (!signIn) return;
        await signIn.emailCode.verifyCode({ code });
        await signIn.finalize();
      }
      router.push(next);
    } catch {
      const message =
        "That code did not work. It expires after ten minutes and can only be used once.";
      setState((s) => ({ ...s, error: message }));
      toast.error(message);
    }
  });
}
```

Change the verify form to call the handler directly, since it no longer submits form data:

```tsx
<form
  onSubmit={(e) => {
    e.preventDefault();
    onVerify();
  }}
  className="mt-6"
>
```

Change the "Resend code" button's `onClick` from `router.refresh()` to:

```tsx
onClick={() => {
  startTransition(async () => {
    try {
      if (mode === "sign-up") await signUp?.verifications.sendEmailCode();
      else await signIn?.emailCode.sendCode({ emailAddress: state.email ?? "" });
      toast.success("New code sent.");
    } catch {
      toast.error("Could not send another code. Wait a moment and try again.");
    }
  });
}}
```

- [ ] **Step 6: Sign out through Clerk**

In `src/components/app/account-menu.tsx`, remove `import { signOut } from "@/app/(auth)/actions";` and add `import { useClerk } from "@clerk/nextjs";`. Inside the component add `const { signOut } = useClerk();`, and replace the `<form action={signOut}>` wrapper around the sign-out item with a plain button calling `signOut({ redirectUrl: "/" })`. Keep the `LogOut` icon, label and styling.

- [ ] **Step 7: Delete the Supabase callback**

```bash
git rm src/app/auth/callback/route.ts
```

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: errors only in files Task 6 rewrites (`src/lib/data/applications.ts`, `src/app/(app)/actions.ts` and the pages). Errors elsewhere must be fixed now.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Move authentication onto Clerk's email code flow"
```

---

### Task 6: Data layer and guards on Drizzle

The security-critical task. After it, no code path reaches the database without an access decision.

**Files:**
- Create: `src/lib/auth/errors.ts`, `src/lib/auth/guards.ts`
- Modify: `src/lib/data/applications.ts`, `src/app/(app)/actions.ts`, `src/app/(app)/layout.tsx`, `src/app/employer/page.tsx`, `src/app/ops/page.tsx`

**Interfaces:**
- Consumes: `Actor`, `ApplicationRef`, `Permission`, the `can*` predicates (`src/lib/auth/policy.ts`, already committed); `db`, schema tables
- Produces:
  - `UnauthenticatedError`, `ForbiddenError` from `@/lib/auth/errors`
  - `getProfile(): Promise<Profile | null>`, `getActor(): Promise<Actor | null>` from `@/lib/data/applications`
  - `requireActor()`, `requireApplicationAccess(applicationId, permission)`, `toActionError(error)` from `@/lib/auth/guards`

- [ ] **Step 1: Create the error types**

Create `src/lib/auth/errors.ts`:

```ts
/** No signed-in user. The caller should redirect to a sign-in screen. */
export class UnauthenticatedError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "UnauthenticatedError";
  }
}

/**
 * A signed-in user asked for something that is not theirs. Never
 * include the subject in the message: an error that distinguishes "does
 * not exist" from "exists but is not yours" is a disclosure.
 */
export class ForbiddenError extends Error {
  constructor() {
    super("Not allowed.");
    this.name = "ForbiddenError";
  }
}
```

- [ ] **Step 2: Rewrite the data layer on Drizzle**

Replace the entire contents of `src/lib/data/applications.ts`:

```ts
import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  corridors,
  documents,
  intakeAnswers,
  orgMembers,
  profiles,
  type Application,
  type DocumentRow,
  type Profile,
} from "@/lib/db/schema";
import type { Actor } from "@/lib/auth/policy";

export type { Application, DocumentRow, Profile };

export type Completion = { total: number; verified: number; pct: number };

/**
 * The signed-in user's profile, created on first sight.
 *
 * Provisioning happens here rather than in a Clerk webhook so a user
 * can never reach the app without a profile row: a webhook that is
 * slow, retried or misconfigured would leave them in exactly that state.
 */
export async function getProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (existing) return existing;

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const [created] = await db
    .insert(profiles)
    .values({
      id: userId,
      email,
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    })
    .onConflictDoNothing()
    .returning();

  return created ?? null;
}

/**
 * The profile plus everything an access decision needs. Built once per
 * request path and handed to the policy in `@/lib/auth/policy`.
 */
export async function getActor(): Promise<Actor | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const memberships = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, profile.id));

  return {
    userId: profile.id,
    role: profile.role,
    staffRole: profile.staffRole ?? null,
    orgIds: memberships.map((m) => m.orgId),
  };
}

/**
 * A traveller has one application in flight at a time. This returns it,
 * creating a draft on first visit so the intake agent always has
 * somewhere to write answers.
 */
export async function getOrCreateApplication(): Promise<Application | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const [existing] = await db
    .select()
    .from(applications)
    .where(eq(applications.travelerId, profile.id))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(applications)
    .values({ travelerId: profile.id })
    .returning();

  return created ?? null;
}

export async function getIntakeAnswers(applicationId: string) {
  const rows = await db
    .select({ questionKey: intakeAnswers.questionKey, value: intakeAnswers.value })
    .from(intakeAnswers)
    .where(eq(intakeAnswers.applicationId, applicationId));

  return Object.fromEntries(rows.map((r) => [r.questionKey, r.value]));
}

export async function getDocuments(applicationId: string): Promise<DocumentRow[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.applicationId, applicationId))
    .orderBy(documents.sortOrder);
}

/**
 * One definition of "percent complete", shared by the traveller's
 * dashboard, the reviewer's queue and the employer's roster. Optional
 * documents are excluded so an applicant is never held below 100% by a
 * document nobody requires.
 */
export function completionOf(docs: DocumentRow[]): Completion {
  const required = docs.filter((d) => d.isRequired);
  const verified = required.filter((d) => d.state === "verified").length;
  const total = required.length;
  return {
    total,
    verified,
    pct: total === 0 ? 0 : Math.round((100 * verified) / total),
  };
}

export async function getCorridorFor(applicationId: string) {
  const [row] = await db
    .select({ corridor: corridors })
    .from(applications)
    .innerJoin(corridors, eq(corridors.id, applications.corridorId))
    .where(eq(applications.id, applicationId))
    .limit(1);

  return row?.corridor ?? null;
}
```

Note that column names are now camelCase in TypeScript (`isRequired`, `travelerId`, `storagePath`). Every consumer — the pages and components that read `doc.is_required` or `profile.full_name` — must be updated to match. Work through the typecheck errors; do not add a compatibility shim.

- [ ] **Step 3: Write the guards**

Create `src/lib/auth/guards.ts`:

```ts
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";
import { getActor } from "@/lib/data/applications";
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth/errors";
import type { Actor, ApplicationRef, Permission } from "@/lib/auth/policy";

/**
 * The one door into the data layer.
 *
 * Row-level security used to make an unguarded query return nothing.
 * A plain Postgres connection returns everything, so every read and
 * write now passes through here first.
 */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthenticatedError();
  return actor;
}

/**
 * Guards throw, because a return value can be ignored and this one must
 * not be. Server actions answer the UI with `{ error }` objects, so each
 * one catches at its own boundary and translates — anything that is not
 * an access failure keeps propagating.
 */
export function toActionError(error: unknown): string | null {
  if (error instanceof ForbiddenError) return "You do not have access to that.";
  if (error instanceof UnauthenticatedError) {
    return "Your session has expired. Sign in again.";
  }
  return null;
}

/**
 * Load an application and decide access in one step, so a caller cannot
 * hold a row it has not been cleared for. A missing application and a
 * forbidden one raise the same error: telling them apart would confirm
 * that someone else's case reference exists.
 */
export async function requireApplicationAccess(
  applicationId: string,
  permission: Permission
): Promise<{ actor: Actor; application: ApplicationRef }> {
  const actor = await requireActor();

  const [row] = await db
    .select({
      id: applications.id,
      travelerId: applications.travelerId,
      orgId: applications.orgId,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!row) throw new ForbiddenError();
  if (!permission(actor, row)) throw new ForbiddenError();

  return { actor, application: row };
}
```

- [ ] **Step 4: Guard the server actions**

Rewrite `src/app/(app)/actions.ts` onto Drizzle, keeping the existing logic and comments. Each of the four exported actions returns `{ error }` to the UI, so the guard goes inside a try/catch that preserves that shape. `answerQuestion` becomes:

```ts
export async function answerQuestion(
  applicationId: string,
  questionKey: string,
  value: string
) {
  try {
    await requireApplicationAccess(applicationId, canWriteIntakeAnswers);

    // ...the existing body, rewritten onto Drizzle...
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
```

Apply the identical shape to the other three, changing only the permission:

- `uploadDocument` — `canWriteDocuments`, guarded after `applicationId` and `docKey` are read from the form data and **before** the file is touched, so an unauthorized caller never causes an upload.
- `removeDocument` — `canWriteDocuments`, first statement.
- `submitApplication` — `canWriteApplication`, first statement.

`buildChecklist` is private and only reachable from `answerQuestion`, which is now guarded. Do not export it.

- [ ] **Step 5: Guard the console pages**

In `src/app/ops/page.tsx`, keep the existing "This console is for Toplance staff" screen but drive it from the policy:

```ts
const actor = await getActor();
if (!actor) redirect("/ops/sign-in?next=/ops");
if (!isStaff(actor)) {
  return (/* the existing staff-only screen, unchanged */);
}
```

Import `getActor` from `@/lib/data/applications` and `isStaff` from `@/lib/auth/policy`.

In `src/app/employer/page.tsx`, the roster query relied on RLS to scope `org_application_progress` to the caller's organisation. That protection is gone, so scope it explicitly:

```ts
const actor = await getActor();
if (!actor) redirect("/employer/sign-in?next=/employer");
if (actor.orgIds.length === 0) {
  // Nothing to show, and no filter would mean the whole table.
  return (/* the existing empty-roster screen */);
}

const roster = await db
  .select()
  .from(orgApplicationProgress)
  .where(inArray(orgApplicationProgress.orgId, [...actor.orgIds]))
  .orderBy(desc(orgApplicationProgress.completionPct));
```

The view is not in the Drizzle schema, so declare it there first with `pgView("org_application_progress", { ... }).existing()`, matching the columns in `drizzle/9999_sql_objects.sql`.

- [ ] **Step 6: Typecheck and test**

```bash
npm run typecheck
npm test
```

Expected: no type errors; 23 tests still passing.

- [ ] **Step 7: Verify the boundary by hand**

With two traveller accounts A and B, and A's application id:

1. Sign in as B.
2. Invoke `answerQuestion` against A's application id.

Expected: `{ error: "You do not have access to that." }` and no row changed. Confirm A's `intake_answers` are untouched.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Move the data layer onto Drizzle behind explicit guards"
```

---

### Task 7: Document storage on the S3 API

**Files:**
- Create: `src/lib/storage/documents.ts`
- Modify: `src/app/(app)/actions.ts`, `src/components/app/document-row.tsx` (download link)

**Interfaces:**
- Consumes: env from Task 1
- Produces: `putDocument(path, file)`, `signedDocumentUrl(path)`, `deleteDocument(path)` from `@/lib/storage/documents`

- [ ] **Step 1: Install the SDK**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Write the storage module**

Create `src/lib/storage/documents.ts`:

```ts
import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Documents live in an S3-compatible bucket: MinIO locally, whatever
 * the platform team provisions in production. Talking to the S3 API
 * rather than a vendor SDK keeps that a matter of configuration.
 *
 * Nothing here decides who may touch an object. Callers reach it only
 * through guarded server actions, which is where the per-application
 * ownership check lives.
 */
const BUCKET = process.env.S3_BUCKET ?? "documents";

function client() {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) throw new Error("S3_ENDPOINT is not set. See .env.local.example.");

  return new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    // MinIO serves buckets as a path, not a subdomain.
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function putDocument(path: string, file: File): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    })
  );
}

/**
 * A short-lived URL, because the bucket is private and a document is a
 * passport. Ten minutes is long enough to open one and short enough
 * that a copied link is not a standing grant.
 */
export async function signedDocumentUrl(path: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: BUCKET, Key: path }),
    { expiresIn: 600 }
  );
}

export async function deleteDocument(path: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: path }));
}
```

- [ ] **Step 3: Create the bucket**

Add a one-off step to the local setup — MinIO starts with no buckets:

```bash
docker exec toplance_minio mc alias set local http://127.0.0.1:9000 toplance toplance123
docker exec toplance_minio mc mb --ignore-existing local/documents
```

Record both commands in `README.md` under the first-run sequence.

- [ ] **Step 4: Repoint the actions**

In `src/app/(app)/actions.ts`, replace the Supabase storage calls. `uploadDocument` keeps its existing validation and path layout (`{application_id}/{doc_key}/{timestamp}-{filename}`) and swaps the upload for `putDocument(path, file)`. `removeDocument` swaps `supabase.storage.remove` for `deleteDocument(path)`.

- [ ] **Step 5: Repoint the download link**

Wherever a document is opened, replace the Supabase public/signed URL with a call to `signedDocumentUrl(doc.storagePath)` from a guarded server action. A document URL must never be generated in a client component.

- [ ] **Step 6: Verify end to end**

Run `npm run dev`, sign in, upload a file to a checklist item, open it, then delete it.

Expected: upload succeeds, the link opens the file, the link 403s after ten minutes, delete removes both the row state and the object. Confirm in the MinIO console at `http://127.0.0.1:54331`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Move document storage onto the S3 API"
```

---

### Task 8: Remove Supabase and audit

**Files:**
- Delete: `src/lib/supabase/`, `supabase/`
- Modify: `package.json`, `src/components/shared/setup-notice.tsx`, every page that reads `hasSupabaseEnv`, `README.md`, `AGENTS.md`

**Interfaces:**
- Consumes: everything above
- Produces: a repository with no Supabase reference

- [ ] **Step 1: Replace the setup guard**

`hasSupabaseEnv` gates every page. Replace it with a check on the new stack. Add to `src/lib/db/client.ts`:

```ts
export const hasDatabaseEnv = Boolean(process.env.DATABASE_URL);
```

Then in each page and layout, replace `hasSupabaseEnv` with `hasDatabaseEnv` imported from `@/lib/db/client`. Files: `src/app/(app)/layout.tsx`, `src/app/(app)/app/page.tsx`, `src/app/(app)/app/agent/page.tsx`, `src/app/(app)/app/documents/page.tsx`, `src/app/(app)/app/requirements/page.tsx`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/employer/sign-in/page.tsx`, `src/app/(auth)/ops/sign-in/page.tsx`, `src/app/employer/page.tsx`, `src/app/ops/page.tsx`.

Rewrite the instructions in `src/components/shared/setup-notice.tsx` for the new sequence: `npm run db:up`, copy `.env.local.example`, `npm run db:migrate`, `npm run db:seed`, plus the Clerk keys.

- [ ] **Step 2: Delete the Supabase code**

```bash
git rm -r src/lib/supabase supabase
npm uninstall @supabase/ssr @supabase/supabase-js supabase
```

- [ ] **Step 3: Confirm nothing references it**

```bash
grep -rn "supabase" src/ package.json README.md AGENTS.md --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" -i
```

Expected: no matches outside the "Known deviations" table in `AGENTS.md`, which Step 5 updates.

- [ ] **Step 4: Audit against the original policies**

Check out the deleted `supabase/migrations/20260821120000_init.sql` from git history and read lines 356–466. For every RLS policy, name the guard or policy function that now enforces it. Any policy without a counterpart is a gap and must be closed before this task is committed.

Record the audit as a comment block at the bottom of `src/lib/auth/policy.ts`, listing each original policy and its replacement.

- [ ] **Step 5: Update the documentation**

In `AGENTS.md`, update the "Known deviations" table: the schema is no longer in Supabase, so the `core.users` row now reads that identity is keyed on the Clerk user id in `profiles`, and the rows for schema, spelling and plural names stay open pending the platform decision. In `README.md`, replace the Supabase first-run sequence with the Docker Compose one.

- [ ] **Step 6: Full verification**

```bash
npm test
npm run typecheck
npm run build
```

Then `npm run dev` and walk every surface: marketing page signed out, sign-up, intake agent, requirements, document upload and delete, sign out, sign in, employer console, ops console.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove Supabase"
```

---

## Self-review notes

Checked against the spec's Phase 1 exit criteria:

- "All four surfaces run on Clerk and Coolify-shaped Postgres with no Supabase dependency" — Tasks 5, 6, 8.
- "Every server action performs an explicit ownership or role check, audited against `init.sql` line by line" — Task 6, audited in Task 8 Step 4.
- "Documents upload, download and delete" — Task 7.
- "Typecheck, tests and build pass" — Task 8 Step 6.
- Schema keyed on Clerk user IDs in final shape — Task 2.
- Completion function and progress view carried as raw SQL, view without `security_invoker` — Task 3.
- Local Postgres on a non-conflicting port — Task 1.

Two things a reviewer should watch:

**The camelCase sweep is wider than it looks.** Drizzle returns `isRequired` where supabase-js returned `is_required`, so every page and component reading a row changes. Task 6 Step 2 says to work through the typecheck errors rather than adding a shim, and that is the right call, but it makes Task 6 the largest diff in the plan.

**The employer view needs a Drizzle declaration.** `org_application_progress` is created in raw SQL and must also be declared with `pgView(...).existing()` for the employer page to query it typed. Task 6 Step 5 says so; it is easy to miss because the view works fine in psql without it.
