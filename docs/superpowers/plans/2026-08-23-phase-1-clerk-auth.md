# Phase 1: Clerk Auth and Explicit Authorization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clerk replaces Supabase authentication across all three sign-in surfaces, and every server action enforces an explicit ownership or role check in code rather than relying on row-level security.

**Architecture:** Authorization is split in two. A pure policy module (`src/lib/auth/policy.ts`) holds every access decision as a plain function over an `Actor` and an `ApplicationRef` — no database, no framework, exhaustively unit tested. Thin guards (`src/lib/auth/guards.ts`) load the actor from the Clerk session, fetch the row being acted on, and apply a policy predicate. Server actions and pages call guards; nothing queries the database without passing one. Because the policy is pure, the security-critical logic is fully testable before any credential exists.

**Tech Stack:** Next.js 16 App Router, `@clerk/nextjs` v7 (Core 3, Future API), Supabase service-role client (transitional — replaced by Drizzle in Phase 2), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-23-platform-stack-migration-design.md`

**Status (2026-08-23):** Tasks 1–3 complete on branch `feat/clerk-auth-phase-1`
(23 tests passing, typecheck clean). Task 4 onward is blocked on Clerk
credentials — see the credential gate below. Two deviations were made during
execution and are recorded in the tasks themselves: Vitest 4 rather than 3, and
no `vite-tsconfig-paths` plugin.

## Global Constraints

- Authentication is **email one-time code only**. No passwords, no social login. This is a client-locked decision recorded in `src/app/(auth)/actions.ts`: an authenticator app is a barrier for staff who change devices, and a six-digit email code is the same security story without the support burden. Clerk must be configured with **Email verification code** as the sole first factor, and password disabled.
- `@clerk/nextjs` v7 uses the **Future API** (`signIn.emailCode.sendCode()`, `signIn.finalize()`), *not* the legacy `prepareFirstFactor`/`attemptFirstFactor`/`setActive` pattern. Legacy examples found online will not work.
- `auth()` and `clerkClient()` are **async** in Core 3 — always `await auth()`.
- Next.js 16 uses `src/proxy.ts`, not `middleware.ts`. It exports a single function, default or named `proxy`.
- Roles (`app_role`, `staff_role`, `org_role`) stay in PostgreSQL, never in Clerk metadata.
- The service-role key is server-only and must never appear in a `NEXT_PUBLIC_` variable.
- Three sign-in surfaces must keep their distinct copy and destinations: traveller → `/app`, employer → `/employer`, operations → `/ops`.
- Do not modify anything under `src/components/ui/`, the design system, or `src/lib/domain/`.

## Prerequisites and credential gate

Tasks 1–3 need no external credentials and should be done first. Tasks 4–8 require:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the Toplance Clerk application, with email-code sign-in enabled and password disabled.
- A local Supabase (`npm run db:start`) plus `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

If Clerk keys are not yet available, stop after Task 3 and report. Do not stub or fake Clerk.

## Behaviour change to be aware of

`submitApplication` currently inserts a `status_events` row as the traveller. RLS policy `"staff write status events"` restricts that insert to staff, and the code never checks the returned error — so today the submission event is silently **not** recorded. Once queries run through the service-role client this insert starts succeeding. This is the intended behaviour (the event is system-generated on the traveller's behalf, not an authored action), so no code change is needed, but the reviewer should expect status events to begin appearing where previously there were none.

## File Structure

**Create:**
- `vitest.config.mts` — test runner configuration
- `src/lib/auth/policy.ts` — pure access-decision functions, no I/O
- `src/lib/auth/policy.test.ts` — exhaustive policy tests
- `src/lib/auth/errors.ts` — `UnauthenticatedError`, `ForbiddenError`
- `src/lib/auth/guards.ts` — session → actor, row fetch, policy application
- `src/lib/supabase/service.ts` — service-role client (transitional)
- `supabase/migrations/20260824090000_clerk_identity.sql` — detach `profiles` from Supabase auth

**Modify:**
- `package.json` — dependencies and `test` script
- `.env.local.example` — Clerk and service-role variables
- `src/app/layout.tsx` — `ClerkProvider`
- `src/proxy.ts` — `clerkMiddleware`
- `src/lib/supabase/env.ts` — service-role accessor, corrected comment
- `src/lib/data/applications.ts` — Clerk-backed profile lookup, JIT provisioning
- `src/app/(app)/actions.ts` — guards on all four actions
- `src/app/(auth)/actions.ts` — replaced with `completeProfile` and `signOut`
- `src/components/auth/auth-form.tsx` — Clerk Future API flows
- `src/app/(app)/layout.tsx`, `src/app/employer/page.tsx`, `src/app/ops/page.tsx` — role guards

**Delete:**
- `src/app/auth/callback/route.ts` — Supabase code exchange, replaced by Clerk

---

### Task 1: ✅ Test infrastructure

**Files:**
- Create: `vitest.config.mts`
- Modify: `package.json`
- Test: `src/lib/auth/policy.test.ts` (created in Task 2; this task only proves the runner works)

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs Vitest; `@/` path alias resolves in tests

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^4
```

Vitest 4 is the current stable line. No coverage reporter and no
`vite-tsconfig-paths` plugin are needed: nothing here measures coverage, and
Vite resolves tsconfig paths natively now.

- [ ] **Step 2: Create the config**

Create `vitest.config.mts`. The `.mts` extension matters — a `.ts` config in
this CommonJS package triggers a Vite loader warning.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test proving the alias resolves**

Create `src/lib/auth/policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test infrastructure", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.mts src/lib/auth/policy.test.ts
git commit -m "Add Vitest test infrastructure"
```

---

### Task 2: ✅ The authorization policy (security core)

This is the most important task in the phase. Every rule below is transcribed from the RLS policies in `supabase/migrations/20260821120000_init.sql` lines 356–466. Read that section before starting.

**Files:**
- Create: `src/lib/auth/policy.ts`
- Modify: `src/lib/auth/policy.test.ts` (replace the smoke test)

**Interfaces:**
- Consumes: nothing (pure module, no imports)
- Produces:
  - `type AppRole = "traveler" | "org_member" | "staff"`
  - `type StaffRole = "reviewer" | "owner"`
  - `type Actor = { userId: string; role: AppRole; staffRole: StaffRole | null; orgIds: readonly string[] }`
  - `type ApplicationRef = { id: string; travelerId: string; orgId: string | null }`
  - `type Permission = (actor: Actor, app: ApplicationRef) => boolean`
  - `isStaff(actor)`, `isOwner(actor)`, `ownsApplication(actor, app)`, `sponsorsApplication(actor, app)`
  - `canReadApplication`, `canWriteApplication`, `canReadDocuments`, `canWriteDocuments`, `canReadIntakeAnswers`, `canWriteIntakeAnswers`, `canReadStatusEvents` — all of type `Permission`
  - `canWriteCorridors(actor)`, `canReadAuditLog(actor)`

**Note on `Actor.userId`:** it holds whatever identifier `applications.traveler_id` stores. In Phase 1 that is the `profiles.id` UUID. In Phase 2 the primary key becomes the Clerk user ID and this module needs no change. Never put a Clerk ID in `Actor.userId` during Phase 1 — comparisons against `travelerId` would silently always be false.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `src/lib/auth/policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  type Actor,
  type ApplicationRef,
  canReadApplication,
  canReadAuditLog,
  canReadDocuments,
  canReadIntakeAnswers,
  canReadStatusEvents,
  canWriteApplication,
  canWriteCorridors,
  canWriteDocuments,
  canWriteIntakeAnswers,
  isOwner,
  isStaff,
  ownsApplication,
  sponsorsApplication,
} from "@/lib/auth/policy";

const ORG = "org-1";
const OTHER_ORG = "org-2";

const traveller: Actor = {
  userId: "user-traveller",
  role: "traveler",
  staffRole: null,
  orgIds: [],
};

const otherTraveller: Actor = {
  userId: "user-other",
  role: "traveler",
  staffRole: null,
  orgIds: [],
};

const hrAdmin: Actor = {
  userId: "user-hr",
  role: "org_member",
  staffRole: null,
  orgIds: [ORG],
};

const reviewer: Actor = {
  userId: "user-reviewer",
  role: "staff",
  staffRole: "reviewer",
  orgIds: [],
};

const owner: Actor = {
  userId: "user-owner",
  role: "staff",
  staffRole: "owner",
  orgIds: [],
};

/** A sponsored application: belongs to `traveller`, paid for by ORG. */
const sponsored: ApplicationRef = {
  id: "app-1",
  travelerId: "user-traveller",
  orgId: ORG,
};

/** The same traveller, applying privately. */
const selfFunded: ApplicationRef = {
  id: "app-2",
  travelerId: "user-traveller",
  orgId: null,
};

describe("role predicates", () => {
  it("recognises staff", () => {
    expect(isStaff(reviewer)).toBe(true);
    expect(isStaff(owner)).toBe(true);
    expect(isStaff(traveller)).toBe(false);
    expect(isStaff(hrAdmin)).toBe(false);
  });

  it("recognises owners, who are a subset of staff", () => {
    expect(isOwner(owner)).toBe(true);
    expect(isOwner(reviewer)).toBe(false);
    expect(isOwner(traveller)).toBe(false);
  });

  it("does not treat a non-staff actor claiming a staff role as staff", () => {
    const forged: Actor = { ...traveller, staffRole: "owner" };
    expect(isStaff(forged)).toBe(false);
    expect(isOwner(forged)).toBe(false);
  });
});

describe("ownership and sponsorship", () => {
  it("matches the traveller who owns the application", () => {
    expect(ownsApplication(traveller, sponsored)).toBe(true);
    expect(ownsApplication(otherTraveller, sponsored)).toBe(false);
  });

  it("matches an org the application is sponsored by", () => {
    expect(sponsorsApplication(hrAdmin, sponsored)).toBe(true);
  });

  it("does not match an org member from a different org", () => {
    const otherOrg: Actor = { ...hrAdmin, orgIds: [OTHER_ORG] };
    expect(sponsorsApplication(otherOrg, sponsored)).toBe(false);
  });

  it("never sponsors an application with no org", () => {
    expect(sponsorsApplication(hrAdmin, selfFunded)).toBe(false);
  });
});

describe("application access", () => {
  it("lets the traveller read and write their own", () => {
    expect(canReadApplication(traveller, sponsored)).toBe(true);
    expect(canWriteApplication(traveller, sponsored)).toBe(true);
  });

  it("denies another traveller entirely", () => {
    expect(canReadApplication(otherTraveller, sponsored)).toBe(false);
    expect(canWriteApplication(otherTraveller, sponsored)).toBe(false);
  });

  it("lets a sponsoring org read but never write", () => {
    expect(canReadApplication(hrAdmin, sponsored)).toBe(true);
    expect(canWriteApplication(hrAdmin, sponsored)).toBe(false);
  });

  it("lets staff read and write any application", () => {
    expect(canReadApplication(reviewer, sponsored)).toBe(true);
    expect(canWriteApplication(reviewer, sponsored)).toBe(true);
    expect(canReadApplication(reviewer, selfFunded)).toBe(true);
  });
});

describe("the document privacy boundary", () => {
  it("lets the traveller read and write their own documents", () => {
    expect(canReadDocuments(traveller, sponsored)).toBe(true);
    expect(canWriteDocuments(traveller, sponsored)).toBe(true);
  });

  it("lets staff read and review documents", () => {
    expect(canReadDocuments(reviewer, sponsored)).toBe(true);
    expect(canWriteDocuments(reviewer, sponsored)).toBe(true);
  });

  // The promise made on the marketing site and in the employer console:
  // an organisation sees progress, never a passport. Sponsoring the
  // application does not soften it.
  it("never lets a sponsoring org read documents", () => {
    expect(canReadDocuments(hrAdmin, sponsored)).toBe(false);
  });

  it("never lets a sponsoring org write documents", () => {
    expect(canWriteDocuments(hrAdmin, sponsored)).toBe(false);
  });

  it("denies documents to an unrelated traveller", () => {
    expect(canReadDocuments(otherTraveller, sponsored)).toBe(false);
    expect(canWriteDocuments(otherTraveller, sponsored)).toBe(false);
  });
});

describe("intake answers", () => {
  it("lets the traveller manage their own answers", () => {
    expect(canReadIntakeAnswers(traveller, sponsored)).toBe(true);
    expect(canWriteIntakeAnswers(traveller, sponsored)).toBe(true);
  });

  it("lets staff read answers but not author them", () => {
    expect(canReadIntakeAnswers(reviewer, sponsored)).toBe(true);
    expect(canWriteIntakeAnswers(reviewer, sponsored)).toBe(false);
  });

  it("hides answers from a sponsoring org", () => {
    expect(canReadIntakeAnswers(hrAdmin, sponsored)).toBe(false);
    expect(canWriteIntakeAnswers(hrAdmin, sponsored)).toBe(false);
  });
});

describe("status events", () => {
  it("is readable by traveller, sponsoring org and staff", () => {
    expect(canReadStatusEvents(traveller, sponsored)).toBe(true);
    expect(canReadStatusEvents(hrAdmin, sponsored)).toBe(true);
    expect(canReadStatusEvents(reviewer, sponsored)).toBe(true);
  });

  it("is hidden from an unrelated traveller", () => {
    expect(canReadStatusEvents(otherTraveller, sponsored)).toBe(false);
  });
});

describe("reference data and audit", () => {
  it("lets only owners write corridors", () => {
    expect(canWriteCorridors(owner)).toBe(true);
    expect(canWriteCorridors(reviewer)).toBe(false);
    expect(canWriteCorridors(traveller)).toBe(false);
  });

  it("lets only staff read the audit log", () => {
    expect(canReadAuditLog(reviewer)).toBe(true);
    expect(canReadAuditLog(owner)).toBe(true);
    expect(canReadAuditLog(hrAdmin)).toBe(false);
    expect(canReadAuditLog(traveller)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/auth/policy`.

- [ ] **Step 3: Write the policy module**

Create `src/lib/auth/policy.ts`:

```ts
/**
 * Every access decision in Toplance, as pure functions.
 *
 * These rules were the row-level security policies in the initial
 * migration. Moving off Supabase means the database no longer enforces
 * them, so they live here instead — deliberately free of I/O, so the
 * rules can be read, reviewed and tested on their own.
 *
 * Nothing in this file may import a client, a session or a framework.
 */

export type AppRole = "traveler" | "org_member" | "staff";
export type StaffRole = "reviewer" | "owner";

/**
 * `userId` is whatever identifier `applications.traveler_id` holds: the
 * profile id today, the Clerk user id once Phase 2 repoints the key.
 */
export type Actor = {
  userId: string;
  role: AppRole;
  staffRole: StaffRole | null;
  orgIds: readonly string[];
};

export type ApplicationRef = {
  id: string;
  travelerId: string;
  orgId: string | null;
};

export type Permission = (actor: Actor, app: ApplicationRef) => boolean;

export function isStaff(actor: Actor): boolean {
  return actor.role === "staff";
}

/** Owners are the only staff who may edit reference data. */
export function isOwner(actor: Actor): boolean {
  return isStaff(actor) && actor.staffRole === "owner";
}

export function ownsApplication(actor: Actor, app: ApplicationRef): boolean {
  return app.travelerId === actor.userId;
}

export function sponsorsApplication(actor: Actor, app: ApplicationRef): boolean {
  return app.orgId !== null && actor.orgIds.includes(app.orgId);
}

export const canReadApplication: Permission = (actor, app) =>
  ownsApplication(actor, app) || sponsorsApplication(actor, app) || isStaff(actor);

/** An employer pays for a seat; it does not fill in the form. */
export const canWriteApplication: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

/**
 * The privacy boundary. An organisation sees progress, never a
 * passport. There is deliberately no sponsorship branch here, and
 * adding one would break the promise made in the employer console.
 */
export const canReadDocuments: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

export const canWriteDocuments: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

export const canReadIntakeAnswers: Permission = (actor, app) =>
  ownsApplication(actor, app) || isStaff(actor);

/** Staff read the intake conversation; they never answer it. */
export const canWriteIntakeAnswers: Permission = (actor, app) =>
  ownsApplication(actor, app);

export const canReadStatusEvents: Permission = canReadApplication;

export function canWriteCorridors(actor: Actor): boolean {
  return isOwner(actor);
}

export function canReadAuditLog(actor: Actor): boolean {
  return isStaff(actor);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests green.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/policy.ts src/lib/auth/policy.test.ts
git commit -m "Add pure authorization policy with exhaustive tests"
```

---

### Task 3: ✅ Detach identity from Supabase auth

**Files:**
- Create: `supabase/migrations/20260824090000_clerk_identity.sql`
- Create: `src/lib/supabase/service.ts`
- Modify: `src/lib/supabase/env.ts`
- Modify: `.env.local.example`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `createServiceClient(): SupabaseClient<Database>` from `@/lib/supabase/service`
  - `SUPABASE_SERVICE_ROLE_KEY`, `hasServiceRoleEnv`, `requireServiceRoleEnv()` from `@/lib/supabase/env`
  - `profiles.clerk_user_id` column

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260824090000_clerk_identity.sql`:

```sql
-- ============================================================
-- Clerk owns identity from here on.
--
-- Transitional: this migration lets Clerk sessions address rows in a
-- database that still lives in Supabase. Phase 2 rebuilds the schema on
-- self-hosted Postgres, where `clerk_user_id` becomes the primary key
-- and this file is discarded with the rest of the Supabase project.
--
-- The RLS policies are deliberately left in place. They no longer
-- enforce anything — the app now connects with the service role, which
-- bypasses them — but they remain the reference these rules were
-- transcribed from into src/lib/auth/policy.ts.
-- ============================================================

-- Profiles were created by a trigger on auth.users. Clerk provisions
-- them just in time instead.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- A profile no longer requires a Supabase auth user to exist.
alter table profiles drop constraint if exists profiles_id_fkey;

alter table profiles add column if not exists clerk_user_id text unique;

comment on column profiles.clerk_user_id is
  'Clerk user id (user_...). The platform-wide identity key: every BeOrchid app keys off this, and BeOrchid Core will reference it as core.user_id.';

create index if not exists profiles_clerk_idx on profiles (clerk_user_id);
```

- [ ] **Step 2: Add the service-role accessor**

In `src/lib/supabase/env.ts`, replace the comment block at the top of the file and append the accessor. The existing comment claims the service-role key is never needed; that is no longer true. Replace the whole file with:

```ts
/**
 * Supabase credentials, and whether we have them.
 *
 * The public marketing page has no session and must render whether or
 * not Supabase is configured — a missing .env.local should not take the
 * whole site down, it should only disable the parts that need a
 * database. Anything that genuinely needs a client calls
 * `requireSupabaseEnv()` and gets an error that says what to do.
 *
 * Since Clerk took over identity, reads and writes go through the
 * service role: a Clerk session carries no Supabase JWT, so there is no
 * user-scoped client to build. The service role bypasses row-level
 * security entirely, which is why every query must pass a guard from
 * `@/lib/auth/guards`. The key is server-only and must never appear in
 * a NEXT_PUBLIC_ variable — anything with that prefix is compiled into
 * the browser bundle.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const hasServiceRoleEnv = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!hasSupabaseEnv) {
    throw new Error(
      [
        "Supabase is not configured.",
        "",
        "  1. npm run db:start        # boots Postgres and Storage in Docker",
        "  2. copy the API URL and anon key it prints into .env.local",
        "  3. npm run db:reset        # applies migrations and seeds the corridors",
        "",
        "See README.md for the full first-run sequence.",
      ].join("\n")
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function requireServiceRoleEnv(): { url: string; serviceRoleKey: string } {
  if (!hasServiceRoleEnv) {
    throw new Error(
      [
        "SUPABASE_SERVICE_ROLE_KEY is not set.",
        "",
        "`npm run db:start` prints it as the service_role key. Put it in",
        ".env.local without a NEXT_PUBLIC_ prefix — it must never reach",
        "the browser bundle.",
      ].join("\n")
    );
  }
  return { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY };
}
```

- [ ] **Step 3: Create the service client**

Create `src/lib/supabase/service.ts`:

```ts
import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { requireServiceRoleEnv } from "@/lib/supabase/env";

/**
 * The only database client left in the app.
 *
 * It bypasses row-level security, so it must never be reached without
 * an authorization decision from `@/lib/auth/guards`. Callers live in
 * `src/lib/data/`; server actions and pages go through those.
 *
 * Phase 2 replaces this with a Drizzle connection. The guards above it
 * do not change.
 */
export function createServiceClient() {
  const { url, serviceRoleKey } = requireServiceRoleEnv();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 4: Update the environment example**

Replace `.env.local.example` with:

```env
# Clerk. Both values are on the API Keys page of the Toplance
# application in the Clerk dashboard.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Where Clerk sends people who need to sign in.
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Local Supabase. `npm run db:start` prints all three values on first run.
# Transitional — Phase 2 replaces these with DATABASE_URL.
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only. Clerk sessions carry no Supabase JWT, so the app reads and
# writes with the service role and enforces access in src/lib/auth.
# Never give this a NEXT_PUBLIC_ prefix.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no output.

- [ ] **Step 6: Apply the migration if a local database is running**

Run: `npm run db:reset`
Expected: migrations apply cleanly. If Docker or Supabase is unavailable, skip — the migration is verified when Task 5 first reads a profile.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260824090000_clerk_identity.sql src/lib/supabase/service.ts src/lib/supabase/env.ts .env.local.example
git commit -m "Detach profiles from Supabase auth and add service-role client"
```

---

### Task 4: Clerk provider, proxy and route protection

**Requires Clerk credentials.** Stop here and report if they are unavailable.

**Files:**
- Modify: `package.json`
- Modify: `src/app/layout.tsx`
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: a Clerk session available to `await auth()` in every server context; unauthenticated requests to non-public paths redirected to `/sign-in?next=<path>`

- [ ] **Step 1: Install Clerk**

```bash
npm install @clerk/nextjs
```

- [ ] **Step 2: Wrap the app in ClerkProvider**

In `src/app/layout.tsx`, import `ClerkProvider` from `@clerk/nextjs` and wrap the existing returned tree with it. Place it **inside** `<body>`, not around `<html>` — Core 3 requires this for compatibility with cache components, and the existing `ThemeProvider`/`LocaleProvider` structure must stay nested where it is. The result should look like:

```tsx
<html lang={locale} suppressHydrationWarning>
  <body className={...}>
    <ClerkProvider>
      {/* existing providers and children, unchanged */}
    </ClerkProvider>
  </body>
</html>
```

Do not otherwise reorder the providers.

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

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no output.

- [ ] **Step 5: Verify manually**

Run: `npm run dev`, then visit `http://localhost:3000/app` while signed out.
Expected: redirect to `/sign-in?next=/app`. Visit `/` and confirm the marketing page still renders.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx src/proxy.ts
git commit -m "Replace Supabase session proxy with Clerk middleware"
```

---

### Task 5: Actor resolution and just-in-time provisioning

**Files:**
- Modify: `src/lib/data/applications.ts`
- Create: `src/lib/auth/errors.ts`

**Interfaces:**
- Consumes: `createServiceClient` (Task 3), `Actor` (Task 2)
- Produces:
  - `UnauthenticatedError`, `ForbiddenError` from `@/lib/auth/errors`
  - `getProfile(): Promise<Profile | null>` — unchanged signature, now Clerk-backed and provisioning on first call
  - `getActor(): Promise<Actor | null>` from `@/lib/data/applications`

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

- [ ] **Step 2: Rewrite profile lookup on Clerk**

In `src/lib/data/applications.ts`, replace the imports and the `getSessionUser`/`getProfile` functions. Delete `getSessionUser` entirely — it has no callers outside this file. The new top of the file:

```ts
import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { createServiceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/database.types";
import type { Actor, AppRole, StaffRole } from "@/lib/auth/policy";

export type Application = Tables<"applications">;
export type DocumentRow = Tables<"documents">;
export type Profile = Tables<"profiles">;

export type Completion = { total: number; verified: number; pct: number };

/**
 * The signed-in user's profile, created on first sight.
 *
 * Provisioning happens here rather than in a Clerk webhook so a user can
 * never reach the app without a profile row: a webhook that is slow,
 * retried or misconfigured would leave them in exactly that state.
 */
export async function getProfile(): Promise<Profile | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (existing) return existing;

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      clerk_user_id: clerkUserId,
      email,
      full_name: fullName,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[profiles] could not provision", error.message);
    return null;
  }
  return created;
}

/**
 * The profile plus everything an access decision needs. Built once per
 * request path and handed to the policy in `@/lib/auth/policy`.
 */
export async function getActor(): Promise<Actor | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = createServiceClient();
  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", profile.id);

  return {
    userId: profile.id,
    role: profile.role as AppRole,
    staffRole: (profile.staff_role as StaffRole | null) ?? null,
    orgIds: (memberships ?? []).map((m) => m.org_id),
  };
}
```

- [ ] **Step 3: Repoint the remaining queries in the file**

In the same file, replace every `const supabase = await createClient();` with `const supabase = createServiceClient();` (note: no `await` — the service client is synchronous), and in `getOrCreateApplication` replace the Supabase session lookup with the profile:

```ts
export async function getOrCreateApplication(): Promise<Application | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("applications")
    .select("*")
    .eq("traveler_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("applications")
    .insert({ traveler_id: profile.id })
    .select("*")
    .single();

  if (error) {
    console.error("[applications] could not create draft", error.message);
    return null;
  }
  return created;
}
```

Leave `completionOf` exactly as it is — it is pure and correct.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: errors only in files not yet migrated (`(auth)/actions.ts`, `auth/callback/route.ts`), which Tasks 7 and 8 remove. Errors anywhere else must be fixed now.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/errors.ts src/lib/data/applications.ts
git commit -m "Resolve profiles from the Clerk session, provisioning on first sight"
```

---

### Task 6: Guards on every server action

The security fix. After this task, no code path reaches the database without an access decision.

**Files:**
- Create: `src/lib/auth/guards.ts`
- Modify: `src/app/(app)/actions.ts`
- Modify: `src/app/(app)/layout.tsx`, `src/app/employer/page.tsx`, `src/app/ops/page.tsx`

**Interfaces:**
- Consumes: `Actor`, `ApplicationRef`, `Permission` and the `can*` predicates (Task 2); `getActor` (Task 5); `createServiceClient` (Task 3); `ForbiddenError`, `UnauthenticatedError` (Task 5)
- Produces:
  - `requireActor(): Promise<Actor>`
  - `requireApplicationAccess(applicationId: string, permission: Permission): Promise<{ actor: Actor; application: ApplicationRef }>`
  - `toActionError(error: unknown): string | null`

- [ ] **Step 1: Write the guards**

Create `src/lib/auth/guards.ts`:

```ts
import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { getActor } from "@/lib/data/applications";
import { ForbiddenError, UnauthenticatedError } from "@/lib/auth/errors";
import type { Actor, ApplicationRef, Permission } from "@/lib/auth/policy";

/**
 * The one door into the data layer.
 *
 * Row-level security used to make an unguarded query return nothing.
 * The service role returns everything, so every read and write now
 * passes through here first.
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

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("applications")
    .select("id, traveler_id, org_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!data) throw new ForbiddenError();

  const application: ApplicationRef = {
    id: data.id,
    travelerId: data.traveler_id,
    orgId: data.org_id,
  };

  if (!permission(actor, application)) throw new ForbiddenError();

  return { actor, application };
}
```

- [ ] **Step 2: Guard the four server actions**

In `src/app/(app)/actions.ts`, add the imports:

```ts
import { requireApplicationAccess, toActionError } from "@/lib/auth/guards";
import { canWriteApplication, canWriteDocuments, canWriteIntakeAnswers } from "@/lib/auth/policy";
import { createServiceClient } from "@/lib/supabase/service";
```

Remove the `createClient` import from `@/lib/supabase/server`, and replace every `const supabase = await createClient();` with `const supabase = createServiceClient();`.

Each of the four exported actions returns `{ error }` to the UI, so the guard goes inside a try/catch that preserves that shape. Wrap each action's **entire existing body**, with the guard as the first statement. `answerQuestion` becomes:

```ts
export async function answerQuestion(
  applicationId: string,
  questionKey: string,
  value: string
) {
  try {
    await requireApplicationAccess(applicationId, canWriteIntakeAnswers);

    // ...the existing body, unchanged...
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
```

Apply the identical shape to the other three, changing only the permission:

- `uploadDocument` — guard with `canWriteDocuments`, placed after `applicationId` and `docKey` are read from the form data and before the file size checks.
- `removeDocument` — guard with `canWriteDocuments`, first statement.
- `submitApplication` — guard with `canWriteApplication`, first statement.

Note that `uploadDocument`'s guard must come **before** the file is touched, so an unauthorized caller never causes an upload.

`buildChecklist` is private and only reachable from `answerQuestion`, which is now guarded; it needs no guard of its own. Do not export it.

- [ ] **Step 3: Guard the console pages**

In `src/app/ops/page.tsx`, replace the manual role check:

```ts
const profile = await getProfile();
if (!profile) redirect("/ops/sign-in?next=/ops");
if (profile.role !== "staff") { ... }
```

Keep the existing "This console is for Toplance staff" screen — it is better than an error — but drive it from the policy:

```ts
const profile = await getProfile();
if (!profile) redirect("/ops/sign-in?next=/ops");

const actor = await getActor();
if (!actor || !isStaff(actor)) {
  return (/* the existing staff-only screen, unchanged */);
}
```

Import `getActor` from `@/lib/data/applications` and `isStaff` from `@/lib/auth/policy`.

In `src/app/employer/page.tsx`, the roster query currently relies on RLS to scope `org_application_progress` to the caller's org. That protection is gone, so scope it explicitly. Replace the roster query with:

```ts
const actor = await getActor();
if (!actor) redirect("/employer/sign-in?next=/employer");

const { data: roster } = await supabase
  .from("org_application_progress")
  .select("*")
  .in("org_id", actor.orgIds.length ? [...actor.orgIds] : ["00000000-0000-0000-0000-000000000000"])
  .order("completion_pct", { ascending: false });
```

The impossible UUID keeps a member of no organisation from seeing every row — an empty `.in()` list is an error in PostgREST, and omitting the filter would return the whole table.

Replace `await createClient()` with `createServiceClient()` in both pages.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: errors only in `(auth)/actions.ts` and `auth/callback/route.ts`.

- [ ] **Step 5: Verify the boundary by hand**

With two traveller accounts A and B, and A's application id:

1. Sign in as B.
2. In the browser console on `/app`, call the `answerQuestion` action against A's application id (or temporarily point the form at it).

Expected: the action throws `ForbiddenError` and no row changes. Confirm in the database that A's `intake_answers` are untouched.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/guards.ts "src/app/(app)/actions.ts" "src/app/(app)/layout.tsx" src/app/employer/page.tsx src/app/ops/page.tsx
git commit -m "Enforce access in code on every server action"
```

---

### Task 7: Sign-in and sign-up on Clerk's custom flow

The branded three-audience form stays. Only the mechanism underneath it changes, from server actions calling Supabase OTP to Clerk's client-side Future API.

**Files:**
- Modify: `src/components/auth/auth-form.tsx`
- Modify: `src/app/(auth)/actions.ts`

**Interfaces:**
- Consumes: `getProfile` (Task 5)
- Produces: `completeProfile(input): Promise<{ error?: string }>` from `@/app/(auth)/actions`

- [ ] **Step 1: Replace the auth server actions**

Replace the entire contents of `src/app/(auth)/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { createServiceClient } from "@/lib/supabase/service";
import { getProfile } from "@/lib/data/applications";
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
  const profile = await getProfile();
  if (!profile) return { error: "Your session did not carry through. Sign in again." };

  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Enter your full name as it appears in your passport." };

  const digits = input.phone.replace(/\D/g, "");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: digits ? toE164(input.countryIso, digits) : null,
      country_iso: input.countryIso,
      locale: isLocale(input.locale) ? input.locale : "en",
    })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}
```

Note that `signOut` is gone: Clerk signs out on the client. Task 8 updates its caller.

- [ ] **Step 2: Rewire the auth form**

In `src/components/auth/auth-form.tsx`, keep the entire JSX tree, the two-screen structure, the OTP input, the copy and the audience handling exactly as they are. Change only the mechanism.

Replace the imports of `requestCode`, `verifyCode` and `AuthState` with:

```ts
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { completeProfile } from "@/app/(auth)/actions";
```

Replace the state and both handlers. `AuthState` becomes local:

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

Change the "Resend code" button's `onClick` from `router.refresh()` to re-sending through Clerk:

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

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: errors only in `auth/callback/route.ts`.

- [ ] **Step 4: Verify both flows by hand**

Run `npm run dev`, then:

1. `/sign-up` — enter a name, an email you can read, and a phone number. Expect a six-digit code by email, then landing on `/app`.
2. Confirm in the database that the new `profiles` row has `clerk_user_id`, `full_name`, `phone` in E.164, `country_iso` and `locale` all set.
3. Sign out, then `/sign-in` with the same address. Expect a code and a return to `/app`.
4. `/sign-in` with an address that has no account. Expect "We could not find an account for that address."
5. `/employer/sign-in` and `/ops/sign-in` — confirm their distinct copy is intact and that they land on `/employer` and `/ops`.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/auth-form.tsx "src/app/(auth)/actions.ts"
git commit -m "Move sign-in and sign-up onto Clerk's email code flow"
```

---

### Task 8: Sign-out and removing Supabase auth

**Files:**
- Modify: `src/components/app/account-menu.tsx`
- Delete: `src/app/auth/callback/route.ts`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(app)/app/*.tsx`, `src/app/(auth)/*/page.tsx`, `src/app/employer/page.tsx`, `src/app/ops/page.tsx` — setup-notice guard
- Delete: `src/lib/supabase/client.ts` if it has no remaining importers

**Interfaces:**
- Consumes: everything above
- Produces: a fully Clerk-authenticated app with no Supabase auth code left

- [ ] **Step 1: Sign out through Clerk**

In `src/components/app/account-menu.tsx`, remove `import { signOut } from "@/app/(auth)/actions";` and add:

```ts
import { useClerk } from "@clerk/nextjs";
```

Inside the component:

```ts
const { signOut } = useClerk();
```

Replace the `<form action={signOut}>` wrapper around the sign-out item with a plain button that calls:

```ts
onClick={() => signOut({ redirectUrl: "/" })}
```

Keep the `LogOut` icon and the existing label and styling.

- [ ] **Step 2: Delete the Supabase callback route**

```bash
git rm src/app/auth/callback/route.ts
```

If `src/app/auth/` is now empty, remove the directory.

- [ ] **Step 3: Repoint the setup notice**

`hasSupabaseEnv` currently gates every page. The app now needs Clerk as well as the database, so widen the check. In `src/lib/supabase/env.ts` the flag stays as is; in each page and layout that reads it, replace:

```ts
import { hasSupabaseEnv } from "@/lib/supabase/env";
...
if (!hasSupabaseEnv) return <SetupNotice />;
```

with:

```ts
import { hasServiceRoleEnv } from "@/lib/supabase/env";
...
if (!hasServiceRoleEnv) return <SetupNotice />;
```

Files to change: `src/app/(app)/layout.tsx`, `src/app/(app)/app/page.tsx`, `src/app/(app)/app/agent/page.tsx`, `src/app/(app)/app/documents/page.tsx`, `src/app/(app)/app/requirements/page.tsx`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/employer/sign-in/page.tsx`, `src/app/(auth)/ops/sign-in/page.tsx`, `src/app/employer/page.tsx`, `src/app/ops/page.tsx`.

Then update the instructions inside `src/components/shared/setup-notice.tsx` to mention the Clerk keys alongside the Supabase ones.

- [ ] **Step 4: Remove the browser client if unused**

```bash
grep -rn "lib/supabase/client" src || git rm src/lib/supabase/client.ts
```

- [ ] **Step 5: Full verification**

```bash
npm test
npm run typecheck
npm run build
```

Expected: tests pass, no type errors, build succeeds.

Then run `npm run dev` and walk every surface: marketing page signed out, sign-up, intake agent, requirements, documents upload and delete, sign out, sign in, employer console, ops console.

- [ ] **Step 6: Audit against the original policies**

Open `supabase/migrations/20260821120000_init.sql` at lines 356–466 and read each policy in turn. For every one, name the guard or policy function that now enforces it. Any policy without a counterpart is a gap and must be closed before this task is committed. Record the audit as a comment block at the bottom of `src/lib/auth/policy.ts` listing each original policy and its replacement.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Complete the move to Clerk and remove Supabase auth"
```

---

## Self-review notes

Checked against the spec's Phase 1 exit criteria:

- "All four surfaces authenticate through Clerk" — Tasks 4, 7, 8.
- "Every server action performs an explicit ownership or role check" — Task 6, audited in Task 8 Step 6.
- "Supabase is a database only" — Task 8 removes the callback route, the browser client and the OTP actions.
- The spec's requirement that a throwaway migration detaches `profiles` from `auth.users` and adds `clerk_user_id` — Task 3.
- The spec's note that roles stay in PostgreSQL — honoured; nothing writes Clerk metadata.

Two deliberate departures from the spec, both worth a reviewer's attention:

**Authorization lives in `src/lib/auth/`, not `src/lib/data/`.** The spec named
`src/lib/data/` as the single home for access decisions. Splitting the pure
policy out into its own module is what makes the rules testable with no
database, no Clerk session and no network — the whole reason Task 2 can be
completed and reviewed before any credential exists. `src/lib/data/` remains
the only place that queries, and it is still true that nothing reaches the
database without passing a guard.

**Guards throw; actions translate.** A returned error can be ignored by a
careless caller, which is the exact failure this phase exists to prevent, so
`requireApplicationAccess` throws. But the four server actions answer the UI
with `{ error }` objects that `intake-agent.tsx` and the document rows already
read, so each action catches at its own boundary via `toActionError` and
re-throws anything that is not an access failure.

Third pass over types found the guard/action contract mismatch described above
and one unused export (`requireStaff`, which no caller needed — the ops page
reads `isStaff` from the policy directly). Both are corrected in the tasks.
