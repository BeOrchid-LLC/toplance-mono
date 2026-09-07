# Platform Console Tenant Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give BeOrchid staff a `/ops/tenants` surface that lists every agency with aggregate counts, works the demo-request queue, and provisions a tenant end to end — create, invite, promote, set seats, suspend, restore.

**Architecture:** Two server-rendered pages under `/ops/tenants` following the exact shape of `/ops/corridors` (AppBar + counter row + Panel + Table). All reads go through one new `server-only` data module whose stated contract is that it selects `count(*)` from `applications` and never a row. All writes are Server Actions gated by `requireStaffAction()`, then tracked, audited and revalidated.

**Tech Stack:** Next.js 16.3.2 App Router, React Server Components, Drizzle ORM against Postgres, Vitest against a real local database, Tailwind with the repo's own token classes, Clerk for sessions.

**Spec:** `docs/superpowers/specs/2026-09-07-ops-tenants-design.md`

## Global Constraints

- **This is not the Next.js in your training data.** Before writing any route or action, read `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`. `params` in a dynamic route is a **Promise** — `const { id } = await params`.
- **Table names** are lowercase, snake_case, plural. Every name lives in `src/lib/db/schema.ts` and nowhere else.
- **Analytics events** are `app.object_action`, all lowercase. They must be added to the union in `src/lib/analytics/events.ts` or they are a compile error. `events.test.ts` asserts the format.
- **The boundary:** `src/lib/data/tenants.ts` selects `count(*)` from `applications` and never a row. No `case_ref`, no `traveler_id`, no per-case status, no document. This is the spec's central claim — do not add "just one" identifying column.
- **Every string shown to a user** goes in a `src/lib/i18n/*.ts` dictionary as `Record<Locale, string>` across all ten locales (`en ha yo ig fr pt sw ar tw zu`), marked `NEEDS NATIVE REVIEW`. No bare English in a component.
- **Every action** opens with `requireStaffAction()` before it reads a single form field's meaning. A Server Action is a POST endpoint with a public id, not a private function of the page that drew its button.
- **Tests** run against the real local database and skip themselves without `DATABASE_URL`. Start it with `npm run db:up`.
- **Do not touch** `acceptInvitationTx`. Its "an invitation cannot mint an owner" rule is what the two-step provisioning flow exists to preserve.
- Run `npm run typecheck` and `npm test` before every commit.

---

### Task 1: Demo request status columns

**Files:**
- Modify: `src/lib/db/schema.ts:918-950` (the `demoRequests` block and the comment above it)
- Create: `drizzle/0025_*.sql` (generated, do not hand-write)
- Test: `src/lib/data/demo-requests.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `demoRequestStatus` pgEnum with values `"new" | "contacted" | "scheduled" | "converted" | "declined"`; `demoRequests.status` (not null, default `"new"`); `demoRequests.convertedOrgId` (`uuid`, nullable, references `organisations.id` on delete set null); exported type `DemoRequestStatus`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/data/demo-requests.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";

/**
 * The demo queue, against the real database.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("demo requests", async () => {
  const { db } = await import("@/lib/db/client");
  const { demoRequests } = await import("@/lib/db/schema");

  const ids: string[] = [];

  async function request(companyName: string) {
    const [row] = await db
      .insert(demoRequests)
      .values({
        fullName: "Ada Visitor",
        email: `ada+${companyName}@test.invalid`,
        companyName,
        jobTitle: "Director",
        preferredAt: new Date("2026-10-01T14:00:00Z"),
        preferredTz: "Africa/Lagos",
        locale: "en",
      })
      .returning({ id: demoRequests.id });

    ids.push(row.id);
    return row.id;
  }

  afterEach(async () => {
    if (ids.length) await db.delete(demoRequests).where(inArray(demoRequests.id, ids));
    ids.length = 0;
  });

  it("starts every new request at 'new' with nothing converted", async () => {
    const id = await request("Kite Travel");

    const [row] = await db.select().from(demoRequests).where(inArray(demoRequests.id, [id]));

    expect(row.status).toBe("new");
    expect(row.convertedOrgId).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/data/demo-requests.test.ts`
Expected: FAIL — `row.status` is `undefined` because the column does not exist yet (or a Postgres error naming `status`).

- [ ] **Step 3: Add the enum and the columns to the schema**

In `src/lib/db/schema.ts`, beside the other `pgEnum` declarations near the top (next to `invitationStatus`, around line 161):

```ts
/**
 * How far a demo enquiry has been carried. `converted` is the only value
 * that means something happened in the product rather than in somebody's
 * calendar — it is written by `provisionTenantTx`, in the same
 * transaction as the agency it names.
 */
export const demoRequestStatus = pgEnum("demo_request_status", [
  "new",
  "contacted",
  "scheduled",
  "converted",
  "declined",
]);
```

Then add the two columns inside the `demoRequests` table, after `locale`:

```ts
  status: demoRequestStatus().notNull().default("new"),
  /**
   * The agency this enquiry became, when it became one.
   *
   * `set null` rather than `cascade`: an organisation is never deleted
   * in this product, and if one ever were, losing the record that the
   * demo happened is worse than a dangling null.
   */
  convertedOrgId: uuid().references(() => organisations.id, { onDelete: "set null" }),
```

And add the exported type beside `export type DemoRequest`:

```ts
export type DemoRequestStatus = (typeof demoRequestStatus.enumValues)[number];
```

- [ ] **Step 4: Rewrite the table's comment so it stops arguing against the table**

The block comment above `demoRequests` currently ends:

```
 * No status column. Nothing in the product reads this table yet — the
 * notification email is the read path — so a status would hold `new`
 * forever and describe a workflow that does not exist. Adding one with
 * the ops surface that changes it is a migration.
```

Replace those five lines with:

```
 * `status` and `converted_org_id` arrived with the ops surface that
 * changes them (`/ops/tenants`), which is the condition this comment
 * used to set for adding them. `converted_org_id` is the only reference
 * this table has ever held, and it points forward — at what an enquiry
 * became — rather than claiming the stranger who sent it was already
 * somebody here.
```

- [ ] **Step 5: Generate and run the migration**

```bash
npm run db:generate
npm run db:migrate
```

Read the generated `drizzle/0025_*.sql` before running it. Expected: a `CREATE TYPE "public"."demo_request_status"`, an `ALTER TABLE "demo_requests" ADD COLUMN "status"` with the default, and an `ADD COLUMN "converted_org_id"` with its foreign key. If it contains a `DROP` of anything, stop and report it.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/lib/data/demo-requests.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts drizzle/ src/lib/data/demo-requests.test.ts
git commit -m "Give a demo request somewhere to go

The table's own comment set the condition for these columns: a status
would describe a workflow that does not exist until an ops surface
changes it. That surface is being built, so the columns arrive with it
and the comment is rewritten rather than left arguing with the schema
beneath it."
```

---

### Task 2: The demo request data module

**Files:**
- Create: `src/lib/data/demo-requests.ts`
- Test: `src/lib/data/demo-requests.test.ts` (extend)

**Interfaces:**
- Consumes: `demoRequests`, `DemoRequestStatus` from Task 1.
- Produces:
  - `type DemoRequestRow = { id, fullName, email, companyName, jobTitle, preferredAt: Date, preferredTz, locale, status: DemoRequestStatus, convertedOrgId: string | null, convertedOrgName: string | null, createdAt: Date }`
  - `listDemoRequests(): Promise<DemoRequestRow[]>` — newest first
  - `setDemoRequestStatus(id: string, status: DemoRequestStatus): Promise<{ ok: true } | { error: string }>`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/data/demo-requests.test.ts`, inside the existing `describe`, after the existing `it`. Add these imports to the dynamic import block at the top of the describe:

```ts
  const { listDemoRequests, setDemoRequestStatus } = await import(
    "@/lib/data/demo-requests"
  );
```

Then the tests:

```ts
  it("lists newest first", async () => {
    const older = await request("Older Agency");
    // Explicit timestamps, so the assertion does not depend on two
    // inserts landing in different microseconds.
    await db
      .update(demoRequests)
      .set({ createdAt: new Date("2026-09-01T09:00:00Z") })
      .where(inArray(demoRequests.id, [older]));

    const newer = await request("Newer Agency");
    await db
      .update(demoRequests)
      .set({ createdAt: new Date("2026-09-05T09:00:00Z") })
      .where(inArray(demoRequests.id, [newer]));

    const rows = await listDemoRequests();
    const ours = rows.filter((r) => ids.includes(r.id));

    expect(ours.map((r) => r.id)).toEqual([newer, older]);
  });

  it("persists a status change", async () => {
    const id = await request("Kite Travel");

    const result = await setDemoRequestStatus(id, "contacted");
    expect(result).toEqual({ ok: true });

    const rows = await listDemoRequests();
    expect(rows.find((r) => r.id === id)?.status).toBe("contacted");
  });

  it("refuses a status change for an id that is not there", async () => {
    const result = await setDemoRequestStatus(
      "00000000-0000-4000-8000-00000000dead",
      "declined"
    );

    expect("error" in result).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/data/demo-requests.test.ts`
Expected: FAIL — cannot resolve `@/lib/data/demo-requests`.

- [ ] **Step 3: Write the module**

Create `src/lib/data/demo-requests.ts`:

```ts
import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { demoRequests, organisations, type DemoRequestStatus } from "@/lib/db/schema";

/**
 * The demo queue, as the platform console reads it.
 *
 * A row here is a stranger — `demo_requests` references nothing about a
 * person and never will. `convertedOrgName` is the one thing joined in,
 * because "became Kite Travel" is the only fact about an enquiry that
 * lives outside this table.
 *
 * Conversion is not written here. It happens inside `provisionTenantTx`
 * (`@/lib/data/tenants`), which has to stamp this row in the same
 * transaction that creates the agency it points at.
 */
export type DemoRequestRow = {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  preferredAt: Date;
  preferredTz: string;
  locale: string;
  status: DemoRequestStatus;
  convertedOrgId: string | null;
  convertedOrgName: string | null;
  createdAt: Date;
};

/** Newest first: the queue is worked from the top. */
export async function listDemoRequests(): Promise<DemoRequestRow[]> {
  return db
    .select({
      id: demoRequests.id,
      fullName: demoRequests.fullName,
      email: demoRequests.email,
      companyName: demoRequests.companyName,
      jobTitle: demoRequests.jobTitle,
      preferredAt: demoRequests.preferredAt,
      preferredTz: demoRequests.preferredTz,
      locale: demoRequests.locale,
      status: demoRequests.status,
      convertedOrgId: demoRequests.convertedOrgId,
      convertedOrgName: organisations.name,
      createdAt: demoRequests.createdAt,
    })
    .from(demoRequests)
    .leftJoin(organisations, eq(organisations.id, demoRequests.convertedOrgId))
    .orderBy(desc(demoRequests.createdAt));
}

/**
 * Move one enquiry along the queue.
 *
 * Deliberately cannot write `converted`'s other half. Setting the status
 * to `converted` here would leave `converted_org_id` null — a row
 * claiming it became an agency it cannot name — so the honest conversion
 * path is the one that creates the agency.
 */
export async function setDemoRequestStatus(
  id: string,
  status: DemoRequestStatus
): Promise<{ ok: true } | { error: string }> {
  const updated = await db
    .update(demoRequests)
    .set({ status })
    .where(eq(demoRequests.id, id))
    .returning({ id: demoRequests.id });

  if (!updated.length) return { error: "We could not find that demo request." };

  return { ok: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/data/demo-requests.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/data/demo-requests.ts src/lib/data/demo-requests.test.ts
git commit -m "Read the demo queue

listDemoRequests joins only the name of what an enquiry became.
setDemoRequestStatus deliberately cannot write 'converted': that value
has a second half, and a row claiming it became an agency it cannot name
is worse than no status at all."
```

---

### Task 3: Tenant reads

**Files:**
- Create: `src/lib/data/tenants.ts`
- Test: `src/lib/data/tenants.test.ts`

**Interfaces:**
- Consumes: `organisations`, `orgMembers`, `applications`, `invitations`, `profiles` from schema; `ApplicationStatus` from `@/lib/domain/status`.
- Produces:
  - `type TenantCounts = { members: number; applicationsTotal: number; inProgress: number; withReviewer: number; approved: number; rejected: number; pendingInvitations: number }`
  - `type TenantRow = { id: string; name: string; domain: string | null; seatsPurchased: number; billingContact: string | null; suspendedAt: Date | null; createdAt: Date } & TenantCounts`
  - `type TenantMember = { userId: string; fullName: string; email: string; role: "reviewer" | "owner"; joinedAt: Date }`
  - `type TenantDetail = TenantRow & { members_: TenantMember[]; pendingInvites: { id: string; email: string; fullName: string; kind: "client" | "staff"; createdAt: Date; expiresAt: Date }[] }`
  - `listTenants(): Promise<TenantRow[]>` — newest first
  - `getTenant(orgId: string): Promise<TenantDetail | null>`

Note on naming: the roster field is `members_` with a trailing underscore because `members` is already the seat **count** on `TenantCounts`. Two different things called `members` on one object is the bug this avoids.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/data/tenants.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * What the platform console is allowed to know about an agency.
 *
 * The claim these tests exist to pin down is a negative one: the counts
 * add up without any query in `tenants.ts` ever selecting an application
 * row. A test that starts asserting on a case ref means the boundary the
 * v1.3 tenancy drew has moved, and that is a spec change rather than a
 * test change.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("tenant reads", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, invitations, orgMembers, organisations, profiles } =
    await import("@/lib/db/schema");
  const { getTenant, listTenants } = await import("@/lib/data/tenants");

  // Fixed ids no other suite uses, so two files running against the same
  // database cannot delete each other's rows.
  const BUSY = "00000000-0000-4000-8000-0000000d0001";
  const EMPTY = "00000000-0000-4000-8000-0000000d0002";
  const OWNER = "test_tenant_owner";
  const REVIEWER = "test_tenant_reviewer";
  const TRAVELER = "test_tenant_traveler";

  beforeEach(async () => {
    await db
      .insert(organisations)
      .values([
        { id: BUSY, name: "Busy Agency", seatsPurchased: 5 },
        { id: EMPTY, name: "Empty Agency", seatsPurchased: 2 },
      ])
      .onConflictDoNothing();

    await db
      .insert(profiles)
      .values([
        { id: OWNER, email: "owner@tenant.invalid", fullName: "Ada Owner", role: "org_member" },
        { id: REVIEWER, email: "rev@tenant.invalid", fullName: "Bo Reviewer", role: "org_member" },
        { id: TRAVELER, email: "trav@tenant.invalid", fullName: "Cy Traveler" },
      ])
      .onConflictDoNothing();

    await db
      .insert(orgMembers)
      .values([
        { orgId: BUSY, userId: OWNER, role: "owner" },
        { orgId: BUSY, userId: REVIEWER, role: "reviewer" },
      ])
      .onConflictDoNothing();
  });

  afterEach(async () => {
    // `applications.org_id` is `restrict`, so cases go before agencies.
    await db.delete(applications).where(eq(applications.travelerId, TRAVELER));
    await db.delete(invitations).where(inArray(invitations.orgId, [BUSY, EMPTY]));
    await db.delete(orgMembers).where(inArray(orgMembers.orgId, [BUSY, EMPTY]));
    await db.delete(organisations).where(inArray(organisations.id, [BUSY, EMPTY]));
    await db.delete(profiles).where(inArray(profiles.id, [OWNER, REVIEWER, TRAVELER]));
  });

  it("shows an agency with no applications at zero rather than hiding it", async () => {
    const rows = await listTenants();
    const empty = rows.find((r) => r.id === EMPTY);

    // The LEFT JOIN assertion. An INNER JOIN would silently drop exactly
    // the tenant ops most needs to see — the one provisioned this
    // morning that has done nothing yet.
    expect(empty).toBeDefined();
    expect(empty?.applicationsTotal).toBe(0);
    expect(empty?.members).toBe(0);
  });

  it("counts members as seats used", async () => {
    const rows = await listTenants();
    const busy = rows.find((r) => r.id === BUSY);

    expect(busy?.members).toBe(2);
    expect(busy?.seatsPurchased).toBe(5);
  });

  it("buckets every application status, and the buckets add up", async () => {
    await db.insert(applications).values([
      { travelerId: TRAVELER, orgId: BUSY, status: "draft" },
    ]);

    const rows = await listTenants();
    const busy = rows.find((r) => r.id === BUSY)!;

    expect(busy.applicationsTotal).toBe(1);
    expect(busy.inProgress).toBe(1);
    expect(busy.inProgress + busy.withReviewer + busy.approved + busy.rejected).toBe(
      busy.applicationsTotal
    );
  });

  it("keeps counting a suspended agency, and says that it is suspended", async () => {
    await db
      .update(organisations)
      .set({ suspendedAt: new Date("2026-09-01T00:00:00Z") })
      .where(eq(organisations.id, BUSY));

    const rows = await listTenants();
    const busy = rows.find((r) => r.id === BUSY);

    // Suspension is a state to see, not a reason to disappear. An agency
    // ops cannot find is an agency ops cannot restore.
    expect(busy?.suspendedAt).not.toBeNull();
    expect(busy?.members).toBe(2);
  });

  it("counts pending invitations and ignores accepted ones", async () => {
    await db.insert(invitations).values([
      { orgId: BUSY, email: "pending@tenant.invalid", kind: "staff", status: "pending" },
      { orgId: BUSY, email: "done@tenant.invalid", kind: "staff", status: "accepted" },
    ]);

    const rows = await listTenants();
    expect(rows.find((r) => r.id === BUSY)?.pendingInvitations).toBe(1);
  });

  it("returns the roster with roles, newest agency first in the list", async () => {
    const detail = await getTenant(BUSY);

    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("Busy Agency");

    const roles = Object.fromEntries(
      detail!.members_.map((m) => [m.userId, m.role])
    );
    expect(roles[OWNER]).toBe("owner");
    expect(roles[REVIEWER]).toBe("reviewer");
  });

  it("returns null for an agency that is not there", async () => {
    expect(await getTenant("00000000-0000-4000-8000-00000000dead")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/data/tenants.test.ts`
Expected: FAIL — cannot resolve `@/lib/data/tenants`.

- [ ] **Step 3: Write the read side of the module**

Create `src/lib/data/tenants.ts`:

```ts
import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  invitations,
  orgMembers,
  organisations,
  profiles,
} from "@/lib/db/schema";
import type { ApplicationStatus } from "@/lib/domain/status";

/**
 * What BeOrchid is allowed to know about the agencies on the platform.
 *
 * **This module selects `count(*)` from `applications` and never a row.**
 * No `case_ref`, no `traveler_id`, no status per case, no document. That
 * is not a stylistic preference — the v1.3 tenancy moved review into the
 * agency and deleted the console's case screens because they reached a
 * traveller's documents without passing through
 * `requireApplicationAccess` (see `@/app/[locale]/ops/page.tsx`). Ops
 * learns that an agency has forty-one applications and that six are with
 * a reviewer. It cannot learn whose.
 *
 * Adding an identifying column here is a change to that decision, not a
 * change to a query. It needs the platform team, not a code review.
 */

/** The four buckets a status falls into, and the two flat counts beside them. */
export type TenantCounts = {
  /** Seats used: members of the agency. See the spec on what a seat means. */
  members: number;
  applicationsTotal: number;
  inProgress: number;
  withReviewer: number;
  approved: number;
  rejected: number;
  pendingInvitations: number;
};

export type TenantRow = {
  id: string;
  name: string;
  domain: string | null;
  seatsPurchased: number;
  billingContact: string | null;
  suspendedAt: Date | null;
  createdAt: Date;
} & TenantCounts;

export type TenantMember = {
  userId: string;
  fullName: string;
  email: string;
  role: "reviewer" | "owner";
  joinedAt: Date;
};

export type TenantPendingInvite = {
  id: string;
  email: string;
  fullName: string;
  kind: "client" | "staff";
  createdAt: Date;
  expiresAt: Date;
};

/**
 * `members_` rather than `members` because `TenantCounts.members` is
 * already the seat count. One object with two different things called
 * `members` is a bug waiting for a tired reader.
 */
export type TenantDetail = TenantRow & {
  members_: TenantMember[];
  pendingInvites: TenantPendingInvite[];
};

/**
 * Which headline number a raw status contributes to.
 *
 * Exhaustive over the enum by type, so adding an eighth
 * `application_status` value is a compile error here rather than a
 * silent zero in a console someone is reading to make a decision.
 */
const BUCKET: Record<
  ApplicationStatus,
  "inProgress" | "withReviewer" | "approved" | "rejected"
> = {
  draft: "inProgress",
  collecting_documents: "inProgress",
  additional_documents: "inProgress",
  submitted: "withReviewer",
  under_review: "withReviewer",
  approved: "approved",
  rejected: "rejected",
};

const ZERO_COUNTS: TenantCounts = {
  members: 0,
  applicationsTotal: 0,
  inProgress: 0,
  withReviewer: 0,
  approved: 0,
  rejected: 0,
  pendingInvitations: 0,
};

/**
 * Every agency with its numbers, newest first.
 *
 * Four grouped queries and three Maps rather than one query with joined
 * aggregate subqueries — the idiom `listCorridors` already uses in this
 * directory. Joining a one-to-many count onto the base row multiplies
 * the rows before it aggregates them, and the shape that avoids that is
 * harder to read than four flat `group by`s. What matters is that the
 * cost does not grow with the number of tenants: there is no per-tenant
 * follow-up query here.
 */
export async function listTenants(): Promise<TenantRow[]> {
  const [orgs, memberCounts, statusCounts, inviteCounts] = await Promise.all([
    db
      .select({
        id: organisations.id,
        name: organisations.name,
        domain: organisations.domain,
        seatsPurchased: organisations.seatsPurchased,
        billingContact: organisations.billingContact,
        suspendedAt: organisations.suspendedAt,
        createdAt: organisations.createdAt,
      })
      .from(organisations)
      .orderBy(desc(organisations.createdAt)),

    db
      .select({ orgId: orgMembers.orgId, total: count() })
      .from(orgMembers)
      .groupBy(orgMembers.orgId),

    db
      .select({
        orgId: applications.orgId,
        status: applications.status,
        total: count(),
      })
      .from(applications)
      .groupBy(applications.orgId, applications.status),

    db
      .select({ orgId: invitations.orgId, total: count() })
      .from(invitations)
      .where(eq(invitations.status, "pending"))
      .groupBy(invitations.orgId),
  ]);

  const membersByOrg = new Map(memberCounts.map((m) => [m.orgId, m.total]));
  const invitesByOrg = new Map(inviteCounts.map((i) => [i.orgId, i.total]));

  const countsByOrg = new Map<string, TenantCounts>();
  for (const row of statusCounts) {
    const current = countsByOrg.get(row.orgId) ?? { ...ZERO_COUNTS };
    current.applicationsTotal += row.total;
    current[BUCKET[row.status]] += row.total;
    countsByOrg.set(row.orgId, current);
  }

  // Spread `ZERO_COUNTS` first, so an agency with no applications, no
  // members and no invitations reports zeroes rather than being dropped.
  return orgs.map((org) => ({
    ...org,
    ...ZERO_COUNTS,
    ...countsByOrg.get(org.id),
    members: membersByOrg.get(org.id) ?? 0,
    pendingInvitations: invitesByOrg.get(org.id) ?? 0,
  }));
}

/** One agency with its roster and its live invitations, or null. */
export async function getTenant(orgId: string): Promise<TenantDetail | null> {
  const rows = await listTenants();
  const row = rows.find((r) => r.id === orgId);
  if (!row) return null;

  const [members_, pendingInvites] = await Promise.all([
    db
      .select({
        userId: orgMembers.userId,
        fullName: profiles.fullName,
        email: profiles.email,
        role: orgMembers.role,
        joinedAt: orgMembers.createdAt,
      })
      .from(orgMembers)
      .innerJoin(profiles, eq(profiles.id, orgMembers.userId))
      .where(eq(orgMembers.orgId, orgId))
      .orderBy(orgMembers.createdAt),

    // Never selects `token`. The console has no reason to hold an
    // agency's accept credential — the same stance `listInvitations`
    // takes for the agency's own roster.
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        fullName: invitations.fullName,
        kind: invitations.kind,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(and(eq(invitations.orgId, orgId), eq(invitations.status, "pending")))
      .orderBy(desc(invitations.createdAt)),
  ]);

  return { ...row, members_, pendingInvites };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/data/tenants.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/data/tenants.ts src/lib/data/tenants.test.ts
git commit -m "Count what an agency is doing without reading a case

The module's contract is written at the top of it: count(*) from
applications, never a row. v1.3 deleted the console's case screens for
reaching documents outside requireApplicationAccess, and stating the rule
where the queries live makes widening it an edit to a sentence rather
than one more column on a select.

BUCKET is exhaustive over ApplicationStatus by type, so an eighth status
is a compile error rather than a silent zero in a console somebody is
reading to make a decision."
```

---

### Task 4: Tenant writes

**Files:**
- Modify: `src/lib/data/tenants.ts` (append)
- Test: `src/lib/data/tenants.test.ts` (add a second `describe`)

**Interfaces:**
- Consumes: everything from Task 3.
- Produces:
  - `type ProvisionInput = { name: string; domain?: string; seatsPurchased?: number; billingContact?: string; ownerEmail: string; ownerName?: string; demoRequestId?: string }`
  - `provisionTenantTx(input: ProvisionInput, actorId: string): Promise<{ ok: true; orgId: string; inviteToken: string } | { error: string }>`
  - `setTenantSuspension(orgId: string, suspend: boolean): Promise<{ ok: true } | { error: string }>`
  - `setTenantBilling(orgId: string, seatsPurchased: number, billingContact: string | null): Promise<{ ok: true } | { error: string }>`
  - `setMemberRole(orgId: string, userId: string, role: "owner" | "reviewer"): Promise<{ ok: true } | { error: string }>`

- [ ] **Step 1: Write the failing tests**

Append a second `describe` block to `src/lib/data/tenants.test.ts`:

```ts
describe.skipIf(!process.env.DATABASE_URL)("tenant writes", async () => {
  const { db } = await import("@/lib/db/client");
  const { demoRequests, invitations, orgMembers, organisations, profiles } =
    await import("@/lib/db/schema");
  const {
    getTenant,
    provisionTenantTx,
    setMemberRole,
    setTenantBilling,
    setTenantSuspension,
  } = await import("@/lib/data/tenants");
  const { eq, inArray } = await import("drizzle-orm");

  const STAFF = "test_tenant_staff";
  const orgIds: string[] = [];
  const requestIds: string[] = [];

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({
        id: STAFF,
        email: "staff@tenant.invalid",
        fullName: "Di Staff",
        role: "staff",
        staffRole: "owner",
      })
      .onConflictDoNothing();
  });

  afterEach(async () => {
    if (requestIds.length) {
      await db.delete(demoRequests).where(inArray(demoRequests.id, requestIds));
      requestIds.length = 0;
    }
    if (orgIds.length) {
      await db.delete(invitations).where(inArray(invitations.orgId, orgIds));
      await db.delete(orgMembers).where(inArray(orgMembers.orgId, orgIds));
      await db.delete(organisations).where(inArray(organisations.id, orgIds));
      orgIds.length = 0;
    }
    await db.delete(profiles).where(eq(profiles.id, STAFF));
  });

  it("creates the agency and its first invitation together", async () => {
    const result = await provisionTenantTx(
      { name: "Kite Travel", ownerEmail: "Owner@Kite.Invalid", ownerName: "Eve Owner" },
      STAFF
    );

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    orgIds.push(result.orgId);

    const detail = await getTenant(result.orgId);
    expect(detail?.name).toBe("Kite Travel");

    // One pending staff invitation, lowercased the way createInvitation
    // lowercases, and seating nobody yet — the invitee becomes a
    // reviewer only when they accept.
    expect(detail?.pendingInvites).toHaveLength(1);
    expect(detail?.pendingInvites[0].email).toBe("owner@kite.invalid");
    expect(detail?.pendingInvites[0].kind).toBe("staff");
    expect(detail?.members_).toHaveLength(0);
    expect(result.inviteToken).toMatch(/^[0-9a-f]{48}$/);
  });

  it("refuses a nameless agency and writes nothing", async () => {
    const before = await db.select({ id: organisations.id }).from(organisations);

    const result = await provisionTenantTx(
      { name: "   ", ownerEmail: "owner@kite.invalid" },
      STAFF
    );

    expect("error" in result).toBe(true);

    const after = await db.select({ id: organisations.id }).from(organisations);
    expect(after).toHaveLength(before.length);
  });

  it("refuses an invalid owner address and rolls the agency back", async () => {
    const before = await db.select({ id: organisations.id }).from(organisations);

    // The whole point of one transaction: the organisation insert has
    // already run when this is refused, and must not survive.
    const result = await provisionTenantTx(
      { name: "Rollback Agency", ownerEmail: "not-an-address" },
      STAFF
    );

    expect("error" in result).toBe(true);

    const after = await db.select({ id: organisations.id }).from(organisations);
    expect(after).toHaveLength(before.length);
  });

  it("stamps the demo request it was provisioned from", async () => {
    const [req] = await db
      .insert(demoRequests)
      .values({
        fullName: "Ada Visitor",
        email: "ada@kite.invalid",
        companyName: "Kite Travel",
        jobTitle: "Director",
        preferredAt: new Date("2026-10-01T14:00:00Z"),
        preferredTz: "Africa/Lagos",
        locale: "en",
      })
      .returning({ id: demoRequests.id });
    requestIds.push(req.id);

    const result = await provisionTenantTx(
      { name: "Kite Travel", ownerEmail: "ada@kite.invalid", demoRequestId: req.id },
      STAFF
    );
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    orgIds.push(result.orgId);

    const [row] = await db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, req.id));

    expect(row.status).toBe("converted");
    expect(row.convertedOrgId).toBe(result.orgId);
  });

  it("leaves other demo requests alone when none was named", async () => {
    const result = await provisionTenantTx(
      { name: "Walk In Agency", ownerEmail: "walkin@kite.invalid" },
      STAFF
    );
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    orgIds.push(result.orgId);

    const converted = await db
      .select({ id: demoRequests.id })
      .from(demoRequests)
      .where(eq(demoRequests.convertedOrgId, result.orgId));

    expect(converted).toHaveLength(0);
  });

  it("suspends and restores", async () => {
    const result = await provisionTenantTx(
      { name: "Suspendable", ownerEmail: "s@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    await setTenantSuspension(result.orgId, true);
    expect((await getTenant(result.orgId))?.suspendedAt).not.toBeNull();

    await setTenantSuspension(result.orgId, false);
    expect((await getTenant(result.orgId))?.suspendedAt).toBeNull();
  });

  it("writes seats and a billing contact, and refuses negative seats", async () => {
    const result = await provisionTenantTx(
      { name: "Billable", ownerEmail: "b@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    expect(await setTenantBilling(result.orgId, 12, "ap@kite.invalid")).toEqual({
      ok: true,
    });

    const detail = await getTenant(result.orgId);
    expect(detail?.seatsPurchased).toBe(12);
    expect(detail?.billingContact).toBe("ap@kite.invalid");

    // Refused here rather than left to the `seats_not_negative` check
    // constraint, so ops reads a sentence instead of a Postgres error.
    expect("error" in (await setTenantBilling(result.orgId, -1, null))).toBe(true);
  });

  it("promotes a reviewer to owner, and is idempotent", async () => {
    const result = await provisionTenantTx(
      { name: "Promotable", ownerEmail: "p@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    // Stand in for the invitee having accepted: acceptInvitationTx seats
    // a staff invitee as reviewer, and this suite does not re-test it.
    await db.insert(orgMembers).values({
      orgId: result.orgId,
      userId: STAFF,
      role: "reviewer",
    });

    expect(await setMemberRole(result.orgId, STAFF, "owner")).toEqual({ ok: true });
    expect(await setMemberRole(result.orgId, STAFF, "owner")).toEqual({ ok: true });

    const detail = await getTenant(result.orgId);
    expect(detail?.members_.find((m) => m.userId === STAFF)?.role).toBe("owner");
  });

  it("refuses to demote the last owner", async () => {
    const result = await provisionTenantTx(
      { name: "Last Owner", ownerEmail: "l@kite.invalid" },
      STAFF
    );
    if ("error" in result) throw new Error(result.error);
    orgIds.push(result.orgId);

    await db.insert(orgMembers).values({
      orgId: result.orgId,
      userId: STAFF,
      role: "owner",
    });

    // An agency of reviewers can invite nobody and change no billing.
    // The only way back is a staff member noticing.
    expect("error" in (await setMemberRole(result.orgId, STAFF, "reviewer"))).toBe(true);
    const detail = await getTenant(result.orgId);
    expect(detail?.members_.find((m) => m.userId === STAFF)?.role).toBe("owner");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/data/tenants.test.ts`
Expected: FAIL — `provisionTenantTx is not a function`.

- [ ] **Step 3: Append the write side to `src/lib/data/tenants.ts`**

Add these imports to the existing import block:

```ts
import { count, desc, eq, and, ne, sql } from "drizzle-orm";
import { demoRequests } from "@/lib/db/schema";
import { ORG_NAME_MAX } from "@/lib/domain/organisations";
```

(Merge the drizzle names into the one existing `drizzle-orm` import; merge `demoRequests` into the existing `@/lib/db/schema` import.)

Then append:

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProvisionInput = {
  name: string;
  domain?: string;
  seatsPurchased?: number;
  billingContact?: string;
  ownerEmail: string;
  ownerName?: string;
  /** The enquiry this agency came from, when it came from one. */
  demoRequestId?: string;
};

export type ProvisionResult =
  | { ok: true; orgId: string; inviteToken: string }
  | { error: string };

/**
 * Create an agency and invite the person who will run it, in one
 * transaction.
 *
 * The invitation is inserted here rather than through
 * `createInvitation` for two reasons. That function runs against `db`
 * and so cannot join this transaction — and a half-provisioned tenant
 * (an agency nobody was invited to, or an enquiry marked converted
 * pointing at nothing) must not be a reachable state. Its
 * duplicate-pending-invitation guard is also vacuous against an
 * organisation created three statements earlier.
 *
 * `token` and `expiresAt` are still left to the column defaults, so this
 * decides nothing about either that `createInvitation` does not.
 *
 * `kind: "staff"` and **no membership row**. The invitee becomes a
 * `reviewer` when they accept, through the untouched `acceptInvitationTx`
 * — an invitation in this product cannot mint an owner. Ops promotes
 * them afterwards with `setMemberRole`. Two acts, both audited.
 *
 * The email is NOT sent from here. Sending inside the transaction would
 * put a live invitation link in somebody's inbox pointing at an agency a
 * later rollback removed; the caller sends it once this has committed.
 */
export async function provisionTenantTx(
  input: ProvisionInput,
  actorId: string
): Promise<ProvisionResult> {
  const name = input.name.trim();
  if (!name) return { error: "The agency needs a name." };
  if (name.length > ORG_NAME_MAX) return { error: "That name is too long." };

  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(ownerEmail)) {
    return { error: "Enter a valid email address for the first owner." };
  }

  const seats = input.seatsPurchased ?? 0;
  if (!Number.isInteger(seats) || seats < 0) {
    return { error: "Seats must be a whole number, zero or more." };
  }

  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organisations)
      .values({
        name,
        domain: input.domain?.trim() || null,
        seatsPurchased: seats,
        billingContact: input.billingContact?.trim() || null,
      })
      .returning({ id: organisations.id });

    const [invitation] = await tx
      .insert(invitations)
      .values({
        orgId: org.id,
        invitedBy: actorId,
        email: ownerEmail,
        fullName: input.ownerName?.trim() || "",
        kind: "staff",
      })
      .returning({ token: invitations.token });

    if (input.demoRequestId) {
      const stamped = await tx
        .update(demoRequests)
        .set({ status: "converted", convertedOrgId: org.id })
        .where(eq(demoRequests.id, input.demoRequestId))
        .returning({ id: demoRequests.id });

      // A request id that matches nothing means the console showed a row
      // that is no longer there. Rolling back is the honest answer:
      // provisioning "from" an enquiry that does not exist is not what
      // the operator asked for.
      if (!stamped.length) {
        tx.rollback();
      }
    }

    return { ok: true, orgId: org.id, inviteToken: invitation.token };
  });
}

/**
 * Take an agency's reach away, or give it back.
 *
 * `liveOrgIdsFor` drops a suspended membership before it reaches
 * `Actor.orgIds`, so every `isAgencyFor` check answers no the moment
 * this commits. The traveller keeps their own case throughout —
 * `ownsApplication` never consults the agency, deliberately, because a
 * billing dispute must not lock somebody out of their own passport scan
 * nine days before an interview.
 */
export async function setTenantSuspension(
  orgId: string,
  suspend: boolean
): Promise<{ ok: true } | { error: string }> {
  const updated = await db
    .update(organisations)
    .set({ suspendedAt: suspend ? new Date() : null })
    .where(eq(organisations.id, orgId))
    .returning({ id: organisations.id });

  if (!updated.length) return { error: "We could not find that agency." };

  return { ok: true };
}

/** What the agency bought, and who to bill for it. */
export async function setTenantBilling(
  orgId: string,
  seatsPurchased: number,
  billingContact: string | null
): Promise<{ ok: true } | { error: string }> {
  // Checked here as well as by the `seats_not_negative` constraint, so
  // an operator reads a sentence rather than a Postgres error.
  if (!Number.isInteger(seatsPurchased) || seatsPurchased < 0) {
    return { error: "Seats must be a whole number, zero or more." };
  }

  const contact = billingContact?.trim() || null;
  if (contact && !EMAIL_RE.test(contact)) {
    return { error: "Enter a valid email address for the billing contact." };
  }

  const updated = await db
    .update(organisations)
    .set({ seatsPurchased, billingContact: contact })
    .where(eq(organisations.id, orgId))
    .returning({ id: organisations.id });

  if (!updated.length) return { error: "We could not find that agency." };

  return { ok: true };
}

/**
 * The second half of provisioning: seat the person who accepted as the
 * agency's owner.
 *
 * Also the way back down — with one refusal. An agency whose last owner
 * is demoted can invite nobody and change no billing, and nothing inside
 * it can undo that; the only remedy is a staff member noticing. So the
 * demotion is refused under a lock that holds for as long as the count
 * it was decided on.
 */
export async function setMemberRole(
  orgId: string,
  userId: string,
  role: "owner" | "reviewer"
): Promise<{ ok: true } | { error: string }> {
  return db.transaction(async (tx) => {
    const [member] = await tx
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .for("update")
      .limit(1);

    if (!member) return { error: "That person is not a member of this agency." };
    if (member.role === role) return { ok: true };

    if (role === "reviewer") {
      const [others] = await tx
        .select({ total: count() })
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, orgId),
            eq(orgMembers.role, "owner"),
            ne(orgMembers.userId, userId)
          )
        );

      if (!others || others.total === 0) {
        return { error: "An agency needs at least one owner." };
      }
    }

    await tx
      .update(orgMembers)
      .set({ role })
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));

    return { ok: true };
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/data/tenants.test.ts`
Expected: PASS (16 tests across both describes)

If the rollback test fails because `tx.rollback()` throws a rejection the transaction wrapper surfaces rather than swallows, wrap the `db.transaction(...)` call in a `try`/`catch` returning `{ error: "We could not find that demo request." }` — do not remove the rollback.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/data/tenants.ts src/lib/data/tenants.test.ts
git commit -m "Provision, suspend and promote from one module

provisionTenantTx inserts the invitation itself rather than calling
createInvitation: that function runs against db and cannot join the
transaction, and a half-provisioned tenant must not be reachable. It
seats nobody — kind: staff, no membership row — so acceptInvitationTx
keeps deciding who a new member is, and 'an invitation cannot mint an
owner' stays literally true.

The email is sent by the caller, after the commit. Inside, a rollback
would leave a live invite link pointing at an agency that no longer
exists.

setMemberRole refuses to demote the last owner. An agency of reviewers
can invite nobody and change no billing, and nothing inside it can undo
that."
```

---

### Task 5: Events, action strings, and the policy comment

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/lib/auth/policy.ts:170`
- Modify: `src/lib/i18n/ops-actions.ts`
- Test: `src/lib/analytics/events.test.ts` (already exists; asserts the format)

**Interfaces:**
- Produces: six event names usable in `track()`; four new `OPS_ACTIONS` keys — `tenantNotFound`, `demoRequestNotFound`, `provisionFailed`, `chooseADemoStatus`.

- [ ] **Step 1: Add the events**

In `src/lib/analytics/events.ts`, after the corridor block, add:

```ts
  /**
   * The platform console's tenant surface. `provisioned` is one event
   * for one transaction — an agency and its first invitation — so the
   * funnel from `demo_requested` to a working tenant is two rows, not
   * five.
   */
  "toplance.tenant_provisioned",
  "toplance.tenant_suspended",
  "toplance.tenant_restored",
  "toplance.tenant_seats_changed",
  "toplance.tenant_member_role_changed",
  "toplance.demo_request_status_changed",
```

- [ ] **Step 2: Run the events test**

Run: `npx vitest run src/lib/analytics/events.test.ts`
Expected: PASS — the names already match `app.object_action`. If it fails, the format assertion is telling you a name has a capital or a second dot; fix the name, not the test.

- [ ] **Step 3: Amend the policy comment**

In `src/lib/auth/policy.ts`, replace line 170:

```ts
export const canManageInvitations = isOrgMemberOf; // platform staff deliberately excluded
```

with:

```ts
/**
 * Every invitation surface an agency operates — invite, resend, revoke,
 * the roster — is closed to platform staff. BeOrchid does not reach into
 * a tenant's people.
 *
 * One exception, and it is not here: the *first* invitation, sent while
 * the agency is being created. `provisionTenantTx`
 * (`@/lib/data/tenants`) writes that row directly, under
 * `requireStaffAction()`, because there is nobody inside the agency yet
 * to send it. It seats no one — the invitee accepts as a `reviewer`
 * through `acceptInvitationTx` like anyone else.
 *
 * There is deliberately no `canProvisionTenants` predicate beside this
 * one. It could only be `isStaff(actor)`, and every caller already sits
 * behind `requireStaffAction()`, which admits nobody else — a function
 * that can only return `true` reads as a check while checking nothing,
 * and this is the file people trust.
 */
export const canManageInvitations = isOrgMemberOf;
```

- [ ] **Step 4: Add the action error strings**

In `src/lib/i18n/ops-actions.ts`, add four keys to the type annotation and four entries to the object. All ten locales required:

```ts
  tenantNotFound: {
    en: "We could not find that agency.",
    ha: "Ba mu sami wannan hukumar ba.",
    yo: "A kò rí ilé-iṣẹ́ yẹn.",
    ig: "Anyị ahụghị ụlọ ọrụ ahụ.",
    fr: "Nous n'avons pas trouvé cette agence.",
    pt: "Não encontrámos essa agência.",
    sw: "Hatukupata wakala huyo.",
    ar: "لم نتمكن من العثور على تلك الوكالة.",
    tw: "Yɛanhu saa adwumakuo no.",
    zu: "Asiyitholanga leyo ejensi.",
  },
  demoRequestNotFound: {
    en: "We could not find that demo request.",
    ha: "Ba mu sami wannan buƙatar nunin ba.",
    yo: "A kò rí ìbéèrè àfihàn yẹn.",
    ig: "Anyị ahụghị arịrịọ ngosi ahụ.",
    fr: "Nous n'avons pas trouvé cette demande de démonstration.",
    pt: "Não encontrámos esse pedido de demonstração.",
    sw: "Hatukupata ombi hilo la onyesho.",
    ar: "لم نتمكن من العثور على طلب العرض التوضيحي.",
    tw: "Yɛanhu saa yɛkyerɛ abisadeɛ no.",
    zu: "Asisitholanga leso sicelo somboniso.",
  },
  provisionFailed: {
    en: "We could not set that agency up. Nothing was created.",
    ha: "Ba mu iya kafa wannan hukumar ba. Ba a ƙirƙiri kome ba.",
    yo: "A kò lè ṣètò ilé-iṣẹ́ yẹn. A kò dá ohunkóhun.",
    ig: "Anyị enweghị ike ịtọlite ụlọ ọrụ ahụ. E kereghị ihe ọ bụla.",
    fr: "Nous n'avons pas pu créer cette agence. Rien n'a été créé.",
    pt: "Não conseguimos criar essa agência. Nada foi criado.",
    sw: "Hatukuweza kusanidi wakala huyo. Hakuna kilichoundwa.",
    ar: "لم نتمكن من إعداد تلك الوكالة. لم يتم إنشاء أي شيء.",
    tw: "Yɛantumi ansiesie saa adwumakuo no. Wɔanyɛ biribiara.",
    zu: "Asikwazanga ukusetha leyo ejensi. Akukho okudaliwe.",
  },
  chooseADemoStatus: {
    en: "Choose a status for this request.",
    ha: "Zaɓi matsayi don wannan buƙatar.",
    yo: "Yan ipò kan fún ìbéèrè yìí.",
    ig: "Họrọ ọnọdụ maka arịrịọ a.",
    fr: "Choisissez un statut pour cette demande.",
    pt: "Escolha um estado para este pedido.",
    sw: "Chagua hali kwa ombi hili.",
    ar: "اختر حالة لهذا الطلب.",
    tw: "Yi gyinabea bi ma saa abisadeɛ yi.",
    zu: "Khetha isimo salesi sicelo.",
  },
```

- [ ] **Step 5: Typecheck, run the full suite, commit**

```bash
npm run typecheck
npm test
git add src/lib/analytics/events.ts src/lib/auth/policy.ts src/lib/i18n/ops-actions.ts
git commit -m "Name the tenant events and the one invitation exception

canManageInvitations keeps its definition and keeps excluding staff. Its
comment now says where the single exception lives and what gates it,
because the comment as written was about to become false.

No canProvisionTenants predicate: it could only be isStaff(actor), every
caller is already behind requireStaffAction(), and a function in
policy.ts that can only return true reads as a check while checking
nothing."
```

---

### Task 6: The tenant actions

**Files:**
- Create: `src/app/[locale]/ops/tenants/actions.ts`

**Interfaces:**
- Consumes: everything from Tasks 2, 4, 5.
- Produces, each returning `{ ok: true } | { error: string }` (except `provisionTenant`, which also returns `orgId`):
  - `provisionTenant(formData: FormData)` — fields `name`, `domain`, `seats`, `billing_contact`, `owner_email`, `owner_name`, `demo_request_id`; returns `{ ok: true; orgId: string; inviteUrl: string } | { error: string }`
  - `suspendTenant(formData)` / `restoreTenant(formData)` — field `org_id`
  - `updateTenantBilling(formData)` — fields `org_id`, `seats`, `billing_contact`
  - `updateMemberRole(formData)` — fields `org_id`, `user_id`, `role`
  - `updateDemoRequestStatus(formData)` — fields `request_id`, `status`

- [ ] **Step 1: Read the Next docs**

Read `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`. This repo's Next is 16.3.2 and its conventions may differ from what you remember.

- [ ] **Step 2: Write the actions file**

Create `src/app/[locale]/ops/tenants/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics/track";
import { audit } from "@/lib/audit";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import {
  provisionTenantTx,
  setMemberRole,
  setTenantBilling,
  setTenantSuspension,
} from "@/lib/data/tenants";
import { setDemoRequestStatus } from "@/lib/data/demo-requests";
import { demoRequestStatus } from "@/lib/db/schema";
import { appUrl } from "@/lib/notifications/notify";
import { sendEmail } from "@/lib/notifications/email";
import { invitationEmail } from "@/lib/notifications/templates";
import { getActionLocale } from "@/lib/i18n/server";
import { OPS_ACTIONS } from "@/lib/i18n/ops-actions";

/**
 * Tenant management, which is the other half of what the platform
 * console does.
 *
 * Every action opens with `requireStaffAction()` — staff plus a second
 * factor, in the shape an action can return. These are POST endpoints
 * with public ids, reachable without ever rendering the page whose
 * button posts to them, so the page gate is not their gate.
 *
 * None of them is owner-gated, and that is a decision rather than an
 * omission. `approveCorridor` is owner-only because an approved corridor
 * changes what every traveller on a route is told to bring. A tenant
 * write changes one customer's account, is fully audited, and is
 * reversible — making it owner-only would put one person in the way of
 * provisioning a customer who signed today.
 *
 * Nothing here reaches a traveller's case. The data module these call
 * into selects `count(*)` from `applications` and never a row.
 */

/** Both tenant screens, after any write. */
function revalidateTenants() {
  revalidatePath("/[locale]/ops", "layout");
}

export async function provisionTenant(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const seatsRaw = field("seats").trim();
  const result = await provisionTenantTx(
    {
      name: field("name"),
      domain: field("domain") || undefined,
      seatsPurchased: seatsRaw ? Number(seatsRaw) : 0,
      billingContact: field("billing_contact") || undefined,
      ownerEmail: field("owner_email"),
      ownerName: field("owner_name") || undefined,
      demoRequestId: field("demo_request_id") || undefined,
    },
    actor.userId
  );

  if ("error" in result) return result;

  /**
   * After the commit, never inside it. An invitation email sent from
   * within the transaction would put a live link in somebody's inbox
   * pointing at an agency a rollback then removed.
   *
   * Not awaited into the result: `sendEmail` failing does not un-create
   * the agency, and the token is on screen for the operator to copy —
   * the same stance `notify` takes after a corridor approval.
   */
  const inviteUrl = appUrl(`/invite/${result.inviteToken}`);
  await sendEmail({
    to: field("owner_email").trim().toLowerCase(),
    ...invitationEmail({
      orgName: field("name").trim(),
      inviteUrl,
      fullName: field("owner_name").trim() || undefined,
    }),
  });

  await track(
    "toplance.tenant_provisioned",
    { orgId: result.orgId, fromDemoRequest: Boolean(field("demo_request_id")) },
    actor.userId
  );
  await audit(actor.userId, "tenant.provisioned", "organisation", result.orgId, {
    name: field("name").trim(),
  });

  revalidateTenants();
  return { ok: true as const, orgId: result.orgId, inviteUrl };
}

/**
 * Suspension and restoration are one function with two exported names.
 *
 * They differ only in a boolean and in which event they emit, and a
 * single `setSuspension(formData)` reading its verb from a form field
 * would make "is this button the dangerous one" a question about form
 * data rather than about which function was called.
 */
async function changeSuspension(formData: FormData, suspend: boolean) {
  const orgId = String(formData.get("org_id") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const result = await setTenantSuspension(orgId, suspend);
  if ("error" in result) return { error: OPS_ACTIONS.tenantNotFound[await getActionLocale()] };

  await track(
    suspend ? "toplance.tenant_suspended" : "toplance.tenant_restored",
    { orgId },
    actor.userId
  );
  await audit(
    actor.userId,
    suspend ? "tenant.suspended" : "tenant.restored",
    "organisation",
    orgId
  );

  revalidateTenants();
  /**
   * The agency's own people are reading a layout that was cached while
   * their tenant was live. Suspension changes what `liveOrgIdsFor`
   * returns, so that cache has to go with it.
   */
  revalidatePath("/[locale]/app", "layout");
  revalidatePath("/[locale]/agency", "layout");
  return { ok: true as const };
}

export async function suspendTenant(formData: FormData) {
  return changeSuspension(formData, true);
}

export async function restoreTenant(formData: FormData) {
  return changeSuspension(formData, false);
}

export async function updateTenantBilling(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const seats = Number(String(formData.get("seats") ?? "").trim());
  const billingContact = String(formData.get("billing_contact") ?? "").trim() || null;

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const result = await setTenantBilling(orgId, seats, billingContact);
  if ("error" in result) return result;

  await track("toplance.tenant_seats_changed", { orgId, seats }, actor.userId);
  await audit(actor.userId, "tenant.seats_changed", "organisation", orgId, { seats });

  revalidateTenants();
  return { ok: true as const };
}

export async function updateMemberRole(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const role = formData.get("role") === "owner" ? "owner" : "reviewer";

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const result = await setMemberRole(orgId, userId, role);
  if ("error" in result) return result;

  await track(
    "toplance.tenant_member_role_changed",
    { orgId, role },
    actor.userId
  );
  await audit(actor.userId, "tenant.member_role_changed", "organisation", orgId, {
    userId,
    role,
  });

  revalidateTenants();
  // Their own console shows a different set of controls now.
  revalidatePath("/[locale]/agency", "layout");
  return { ok: true as const };
}

export async function updateDemoRequestStatus(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const raw = String(formData.get("status") ?? "");

  const gate = await requireStaffAction();
  if ("error" in gate) return gate;
  const { actor } = gate;

  const locale = await getActionLocale();

  // Narrowed against the enum's own values rather than cast. The status
  // arrives from a POST body, and a value Postgres has never heard of
  // should be a sentence here, not an error from the driver.
  const status = demoRequestStatus.enumValues.find((v) => v === raw);
  if (!status) return { error: OPS_ACTIONS.chooseADemoStatus[locale] };

  /**
   * `converted` is refused. Its other half is `converted_org_id`, and
   * only `provisionTenantTx` can write both — a request marked converted
   * with nothing to point at is a lie the console would then display.
   */
  if (status === "converted") {
    return { error: OPS_ACTIONS.provisionFailed[locale] };
  }

  const result = await setDemoRequestStatus(requestId, status);
  if ("error" in result) {
    return { error: OPS_ACTIONS.demoRequestNotFound[locale] };
  }

  await track("toplance.demo_request_status_changed", { status }, actor.userId);
  await audit(actor.userId, "demo_request.status_changed", "demo_request", requestId, {
    status,
  });

  revalidateTenants();
  return { ok: true as const };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `invitationEmail`'s parameter names differ from `{ orgName, inviteUrl, fullName }`, read `src/lib/notifications/templates.ts` and match it — do not change the template.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/ops/tenants/actions.ts"
git commit -m "Write the tenant actions

Every one opens with requireStaffAction(): these are POST endpoints with
public ids, reachable without rendering the page whose button posts to
them.

None is owner-gated, deliberately. approveCorridor is owner-only because
it changes what every traveller on a route is told to bring; a tenant
write changes one account, is audited, and is reversible.

updateDemoRequestStatus refuses 'converted'. That value has a second half
only provisionTenantTx can write, and a request marked converted with
nothing to point at is a lie the console would then display."
```

---

### Task 7: The tenant dictionary

**Files:**
- Create: `src/lib/i18n/ops-tenants.ts`
- Modify: `src/lib/i18n/ops-common.ts` (add `nav.tenants`)

**Interfaces:**
- Produces: `OPS_TENANTS` with the keys listed below, each an `L = Record<Locale, string>`; `OPS_COMMON.nav.tenants`.

- [ ] **Step 1: Add the nav label to `OPS_COMMON`**

In `src/lib/i18n/ops-common.ts`, change the `nav` field in the type annotation from `nav: { caseQueue: L; routes: L };` to `nav: { caseQueue: L; routes: L; tenants: L };`, then add to the `nav` object:

```ts
    tenants: {
      en: "Agencies",
      ha: "Hukumomi",
      yo: "Àwọn ilé-iṣẹ́",
      ig: "Ụlọ ọrụ",
      fr: "Agences",
      pt: "Agências",
      sw: "Mawakala",
      ar: "الوكالات",
      tw: "Adwumakuo",
      zu: "Ama-ejensi",
    },
```

- [ ] **Step 2: Create the dictionary**

Create `src/lib/i18n/ops-tenants.ts` with this exact type annotation, then fill every leaf with all ten locales:

```ts
import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/tenants` and `/ops/tenants/[id]` — the agencies on the platform
 * and the demo enquiries that have not become one yet.
 *
 * The review-state words and the nav labels stay in `OPS_COMMON`, and
 * the `{ error }` strings the actions return stay in `OPS_ACTIONS`, for
 * the same reason `OPS_CORRIDORS` keeps neither: a second copy of a word
 * is a word that will disagree with itself.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_TENANTS: {
  heading: L;
  intro: L;
  counters: {
    liveTenants: { label: L; sub: L };
    suspended: { label: L; sub: L };
    seats: { label: L; sub: L };
    openEnquiries: { label: L; sub: L };
  };
  tenantsPanel: L;
  agenciesWord: L;
  emptyTenants: L;
  tableHead: {
    agency: L;
    members: L;
    applications: L;
    progress: L;
    state: L;
    added: L;
  };
  live: L;
  suspendedBadge: L;
  seatsOf: L;
  demoPanel: L;
  emptyDemoRequests: L;
  demoHead: { who: L; company: L; preferred: L; status: L; action: L };
  demoStatus: {
    new: L;
    contacted: L;
    scheduled: L;
    converted: L;
    declined: L;
  };
  provisionButton: L;
  provisionTitle: L;
  provisionNotice: L;
  fieldAgencyName: L;
  fieldDomain: L;
  fieldSeats: L;
  fieldBillingContact: L;
  fieldOwnerEmail: L;
  fieldOwnerName: L;
  createButton: L;
  cancelButton: L;
  toastProvisioned: L;
  inviteLinkLabel: L;
  detailBackToList: L;
  rosterPanel: L;
  emptyRoster: L;
  rosterHead: { person: L; role: L; joined: L; action: L };
  roleOwner: L;
  roleReviewer: L;
  promoteButton: L;
  demoteButton: L;
  toastRoleChanged: L;
  invitesPanel: L;
  emptyInvites: L;
  invitesHead: { email: L; kind: L; sent: L; expires: L };
  kindStaff: L;
  kindClient: L;
  billingPanel: L;
  saveBillingButton: L;
  toastBillingSaved: L;
  dangerPanel: L;
  suspendNotice: L;
  suspendButton: L;
  restoreNotice: L;
  restoreButton: L;
  toastSuspended: L;
  toastRestored: L;
  awaitingFirstOwner: L;
} = {
  // ... every key above, each with en ha yo ig fr pt sw ar tw zu
};
```

Write the English first for all of them, then translate. Reference English, so the translations carry the right meaning:

- `heading`: "Agencies"
- `intro`: "Every agency on the platform, what they are handling, and the enquiries that have not become one yet."
- `counters.liveTenants`: label "Live agencies", sub "able to review a case"
- `counters.suspended`: label "Suspended", sub "reach removed, records intact"
- `counters.seats`: label "Seats used", sub "across every agency"
- `counters.openEnquiries`: label "Open enquiries", sub "not yet converted or declined"
- `tenantsPanel`: "Every agency"
- `agenciesWord`: "agencies"
- `emptyTenants`: "No agency has been created yet. Provision one from an enquiry below, or start from scratch."
- `tableHead`: "Agency" / "Members" / "Applications" / "Progress" / "State" / "Added"
- `live`: "Live"
- `suspendedBadge`: "Suspended"
- `seatsOf`: "of" (renders as "3 of 5")
- `demoPanel`: "Demo requests"
- `emptyDemoRequests`: "Nobody has asked for a demo yet."
- `demoHead`: "Who" / "Company" / "Preferred time" / "Status" / ""
- `demoStatus`: "New" / "Contacted" / "Scheduled" / "Converted" / "Declined"
- `provisionButton`: "Provision agency"
- `provisionTitle`: "Set up an agency"
- `provisionNotice`: "This creates the agency and emails its first person an invitation. They join as a reviewer; you make them the owner once they have accepted."
- `fieldAgencyName`: "Agency name"
- `fieldDomain`: "Email domain (optional)"
- `fieldSeats`: "Seats purchased"
- `fieldBillingContact`: "Billing contact (optional)"
- `fieldOwnerEmail`: "First owner's email"
- `fieldOwnerName`: "First owner's name (optional)"
- `createButton`: "Create and invite"
- `cancelButton`: "Cancel"
- `toastProvisioned`: "Agency created and the invitation is on its way."
- `inviteLinkLabel`: "Invitation link"
- `detailBackToList`: "All agencies"
- `rosterPanel`: "People"
- `emptyRoster`: "Nobody has accepted an invitation to this agency yet."
- `rosterHead`: "Person" / "Role" / "Joined" / ""
- `roleOwner`: "Owner"
- `roleReviewer`: "Reviewer"
- `promoteButton`: "Make owner"
- `demoteButton`: "Make reviewer"
- `toastRoleChanged`: "Role updated."
- `invitesPanel`: "Pending invitations"
- `emptyInvites`: "No invitation is waiting to be accepted."
- `invitesHead`: "Email" / "Kind" / "Sent" / "Expires"
- `kindStaff`: "Colleague"
- `kindClient`: "Traveller"
- `billingPanel`: "Seats and billing"
- `saveBillingButton`: "Save"
- `toastBillingSaved`: "Saved."
- `dangerPanel`: "Access"
- `suspendNotice`: "Suspending removes the agency's reach at once: its people stop being able to open any case. Nothing is deleted, every traveller keeps their own documents, and restoring gives it all back."
- `suspendButton`: "Suspend agency"
- `restoreNotice`: "This agency is suspended. Its people cannot open a case. Restoring gives back exactly what it had."
- `restoreButton`: "Restore agency"
- `toastSuspended`: "Agency suspended."
- `toastRestored`: "Agency restored."
- `awaitingFirstOwner`: "Waiting for the first owner to accept"

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. A missing locale on any leaf is a compile error — that is what the type annotation is for.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/ops-tenants.ts src/lib/i18n/ops-common.ts
git commit -m "Write the tenant console's words in all ten locales

Review-state words stay in OPS_COMMON and action errors stay in
OPS_ACTIONS, the same split OPS_CORRIDORS keeps. NEEDS NATIVE REVIEW."
```

---

### Task 8: The tenant list page

**Files:**
- Create: `src/app/[locale]/ops/tenants/page.tsx`
- Modify: `src/components/ops/ops-nav.ts`
- Test: `src/components/ops/ops-nav.test.ts`

**Interfaces:**
- Consumes: `listTenants` (Task 3), `listDemoRequests` (Task 2), `OPS_TENANTS` (Task 7).
- Produces: the route `/ops/tenants`; `opsNav` with two entries.

- [ ] **Step 1: Write the failing nav test**

Add to `src/components/ops/ops-nav.test.ts`, inside the existing `describe`:

```ts
  it("carries the tenants entry, second", () => {
    // Not first: `AppNav.isActive` matches item 0 exactly as the section
    // root, and `/ops` redirects to `/ops/corridors`. Reordering this
    // list lights the wrong pill.
    expect(opsNav.map((i) => i.href)).toContain("/ops/tenants");
    expect(opsNav[1].href).toBe("/ops/tenants");
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ops/ops-nav.test.ts`
Expected: FAIL — `opsNav[1]` is undefined.

- [ ] **Step 3: Add the nav entry**

In `src/components/ops/ops-nav.ts`, replace the `opsNav` constant and `localizedOpsNav`:

```ts
export const opsNav: NavItem[] = [
  { href: "/ops/corridors", label: "Routes" },
  { href: "/ops/tenants", label: "Agencies" },
];

/** `opsNav`, with each label resolved to `locale` — what every ops page actually renders. */
export function localizedOpsNav(locale: Locale): NavItem[] {
  return [
    { ...opsNav[0], label: OPS_COMMON.nav.routes[locale] },
    { ...opsNav[1], label: OPS_COMMON.nav.tenants[locale] },
  ];
}
```

Then update the block comment above `opsNav`: replace the paragraph beginning "One entry, because route curation is what the platform console is now." through "...belong here when they are built; nothing that reaches a traveller's case ever does." with:

```
 * Two entries. Route curation is one half of the console; tenant
 * management is the other, and it arrived with `/ops/tenants`. An
 * audit-log reader still belongs here when it is built.
 *
 * Nothing that reaches a traveller's case ever does. The v1.3 tenancy
 * moved review into the agency and deleted the case queue and case
 * detail screens with it: they read documents directly, without passing
 * through `requireApplicationAccess`, so they were the enforcement gap
 * rather than merely a surface nobody should visit. `/ops/tenants` is
 * built to the same rule — it counts an agency's applications and can
 * open none of them.
```

- [ ] **Step 4: Run the nav test to verify it passes**

Run: `npx vitest run src/components/ops/ops-nav.test.ts`
Expected: PASS (4 tests) — including the existing "offers no route into a traveller's case".

- [ ] **Step 5: Write the list page**

Create `src/app/[locale]/ops/tenants/page.tsx`. Model it on `src/app/[locale]/ops/corridors/page.tsx` — same imports, same `AppBar` block, same `security-paper` wrapper, same counter `<dl>` markup, same `Panel` + `Table` structure. The parts that differ:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { DemoRequestQueue } from "@/components/ops/demo-request-queue";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { localizedOpsNav } from "@/components/ops/ops-nav";
import { Shell } from "@/components/shared/shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listTenants } from "@/lib/data/tenants";
import { listDemoRequests } from "@/lib/data/demo-requests";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_TENANTS.heading[locale] };
}

export default async function OpsTenantsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [tenants, demoRequests, notifications, unreadCount] = await Promise.all([
    listTenants(),
    listDemoRequests(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  const live = tenants.filter((t) => !t.suspendedAt);
  const suspended = tenants.filter((t) => t.suspendedAt);
  const seatsUsed = tenants.reduce((sum, t) => sum + t.members, 0);
  const seatsPurchased = tenants.reduce((sum, t) => sum + t.seatsPurchased, 0);
  const openEnquiries = demoRequests.filter(
    (r) => r.status !== "converted" && r.status !== "declined"
  );

  const counters = [
    {
      label: OPS_TENANTS.counters.liveTenants.label[locale],
      value: String(live.length),
      sub: OPS_TENANTS.counters.liveTenants.sub[locale],
      tone: "text-ink",
    },
    {
      label: OPS_TENANTS.counters.suspended.label[locale],
      value: String(suspended.length),
      sub: OPS_TENANTS.counters.suspended.sub[locale],
      tone: suspended.length ? "text-warning-ink" : "text-ink",
    },
    {
      label: OPS_TENANTS.counters.seats.label[locale],
      value: `${seatsUsed} ${OPS_TENANTS.seatsOf[locale]} ${seatsPurchased}`,
      sub: OPS_TENANTS.counters.seats.sub[locale],
      tone: "text-info-ink",
    },
    {
      label: OPS_TENANTS.counters.openEnquiries.label[locale],
      value: String(openEnquiries.length),
      sub: OPS_TENANTS.counters.openEnquiries.sub[locale],
      tone: openEnquiries.length ? "text-brand-text" : "text-ink",
    },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={localizedOpsNav(locale)}
        name={profile.fullName}
        email={profile.email}
        subtitle={`${OPS_COMMON.subtitlePrefix[locale]} · ${OPS_COMMON.staffRole[actor.staffRole ?? "reviewer"][locale]}`}
        notifications={
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/ops"
          />
        }
      />

      <div className="relative isolate">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px]"
        />

        <Shell className="pt-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="t-h2">{OPS_TENANTS.heading[locale]}</h1>
              <p className="t-muted mt-2 max-w-[62ch]">{OPS_TENANTS.intro[locale]}</p>
            </div>
            <ProvisionTenant />
          </div>

          {/* Counter row: copy the <dl> markup from
              `/ops/corridors/page.tsx` verbatim, mapping over `counters`.
              `value` is already a string here, since the seats counter
              renders "3 of 5" rather than one number. */}

          <Panel className="mt-8">
            <PanelHeader
              label={OPS_TENANTS.tenantsPanel[locale]}
              aside={
                <Badge variant="outline">
                  <span className="num">{tenants.length}</span>{" "}
                  {OPS_TENANTS.agenciesWord[locale]}
                </Badge>
              }
            />
            {tenants.length === 0 ? (
              <PanelBody>
                <p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyTenants[locale]}</p>
              </PanelBody>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{OPS_TENANTS.tableHead.agency[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.members[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.applications[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.progress[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.state[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.added[locale]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/ops/tenants/${t.id}`}
                          className="font-semibold text-brand-text hover:underline"
                        >
                          {t.name}
                        </Link>
                        {t.domain && <span className="t-muted block">{t.domain}</span>}
                      </TableCell>
                      <TableCell className="num">
                        {t.members} {OPS_TENANTS.seatsOf[locale]} {t.seatsPurchased}
                      </TableCell>
                      <TableCell className="num">{t.applicationsTotal}</TableCell>
                      <TableCell className="t-muted">
                        {/* Four numbers, not four badges: this is a scan
                            column, and colour here would compete with the
                            state pill beside it. */}
                        <span className="num">{t.inProgress}</span> ·{" "}
                        <span className="num">{t.withReviewer}</span> ·{" "}
                        <span className="num">{t.approved}</span> ·{" "}
                        <span className="num">{t.rejected}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.suspendedAt ? "warning" : "success"}>
                          {t.suspendedAt
                            ? OPS_TENANTS.suspendedBadge[locale]
                            : OPS_TENANTS.live[locale]}
                        </Badge>
                      </TableCell>
                      <TableCell className="t-muted">
                        {t.createdAt.toISOString().slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>

          <DemoRequestQueue requests={demoRequests} className="mt-8 mb-16" />
        </Shell>
      </div>
    </div>
  );
}
```

Fill in the counter `<dl>` block by copying it from `/ops/corridors/page.tsx` lines 158-185, changing `{c.value}` to render the string directly.

`ProvisionTenant` and `DemoRequestQueue` do not exist yet — Task 9 creates them. Write the page now and expect the typecheck to fail until Task 9; commit them together at the end of Task 9.

- [ ] **Step 6: Commit the nav change alone**

The nav change stands on its own and its test passes now:

```bash
git add src/components/ops/ops-nav.ts src/components/ops/ops-nav.test.ts
git commit -m "Give the console its second half

Tenant management is the other thing the platform console does, and the
nav comment has been promising it. Second, not first: AppNav.isActive
matches item 0 exactly as the section root and /ops redirects to
/ops/corridors."
```

Leave `page.tsx` uncommitted until Task 9.

---

### Task 9: The client components

**Files:**
- Create: `src/components/ops/provision-tenant.tsx`
- Create: `src/components/ops/demo-request-queue.tsx`
- Create: `src/components/ops/tenant-controls.tsx`

**Interfaces:**
- Consumes: the actions from Task 6, `OPS_TENANTS` from Task 7, `DemoRequestRow` from Task 2, `TenantDetail` from Task 3.
- Produces:
  - `<ProvisionTenant demoRequest?={DemoRequestRow} />` — a `Dialog` with the provisioning form
  - `<DemoRequestQueue requests={DemoRequestRow[]} className?={string} />` — the panel with per-row status `<select>` and a Provision button
  - `<TenantControls tenant={TenantDetail} />` — the detail page's roster actions, billing form, and suspend/restore

All three are `"use client"`, use `useT()` from `@/components/locale-provider` for strings, `React.useTransition` for pending state, and `toast` from `sonner` for both outcomes, exactly as `src/components/ops/corridor-decision.tsx` does. Each calls `router.refresh()` after a success.

- [ ] **Step 1: Read the pattern you are copying**

Read `src/components/ops/corridor-decision.tsx` in full. Every component in this task follows its shape: build a `FormData`, call the action inside `startTransition`, `toast.error(result.error)` on `"error" in result`, otherwise `toast.success(...)` and `router.refresh()`.

- [ ] **Step 2: Write `provision-tenant.tsx`**

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { provisionTenant } from "@/app/[locale]/ops/tenants/actions";
import type { DemoRequestRow } from "@/lib/data/demo-requests";
import { useT } from "@/components/locale-provider";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/**
 * Create an agency and invite the person who will run it.
 *
 * Two steps by design, and the notice says so in words: this sends an
 * invitation, the invitee joins as a reviewer, and somebody here makes
 * them the owner afterwards. An invitation in this product cannot mint
 * an owner (`acceptInvitationTx`), and an operator who does not know
 * that will think provisioning failed halfway.
 *
 * `demoRequest` pre-fills the form and carries the enquiry's id, so the
 * transaction can stamp it converted. Without one this is a walk-in.
 */
export function ProvisionTenant({ demoRequest }: { demoRequest?: DemoRequestRow }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);

  function submit(formData: FormData) {
    if (demoRequest) formData.set("demo_request_id", demoRequest.id);

    startTransition(async () => {
      const result = await provisionTenant(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // The link stays on screen after the dialog's work is done: the
      // email can fail silently and this is the only other copy — the
      // roster never selects `token`.
      setInviteUrl(result.inviteUrl);
      toast.success(t(OPS_TENANTS.toastProvisioned));
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Building2 /> {t(OPS_TENANTS.provisionButton)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(OPS_TENANTS.provisionTitle)}</DialogTitle>
        </DialogHeader>

        <p className="t-muted max-w-[52ch]">{t(OPS_TENANTS.provisionNotice)}</p>

        {inviteUrl ? (
          <div className="flex flex-col gap-2">
            <Label>{t(OPS_TENANTS.inviteLinkLabel)}</Label>
            <Input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
          </div>
        ) : (
          <form action={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t(OPS_TENANTS.fieldAgencyName)}</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={160}
                defaultValue={demoRequest?.companyName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="owner_email">{t(OPS_TENANTS.fieldOwnerEmail)}</Label>
              <Input
                id="owner_email"
                name="owner_email"
                type="email"
                required
                defaultValue={demoRequest?.email ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="owner_name">{t(OPS_TENANTS.fieldOwnerName)}</Label>
              <Input
                id="owner_name"
                name="owner_name"
                defaultValue={demoRequest?.fullName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="domain">{t(OPS_TENANTS.fieldDomain)}</Label>
              <Input id="domain" name="domain" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="seats">{t(OPS_TENANTS.fieldSeats)}</Label>
              <Input id="seats" name="seats" type="number" min={0} defaultValue={0} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing_contact">{t(OPS_TENANTS.fieldBillingContact)}</Label>
              <Input id="billing_contact" name="billing_contact" type="email" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>
                {t(OPS_TENANTS.createButton)}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {t(OPS_TENANTS.cancelButton)}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Check `src/components/ui/dialog.tsx` for the exact exported names before writing this — if `DialogTrigger` is not exported, drive `open` from a plain `Button` beside a `<Dialog open=...>`, as `src/components/site/demo-dialog.tsx` does.

- [ ] **Step 3: Write `demo-request-queue.tsx`**

There is no `Select` primitive in `src/components/ui` — `src/components/site/demo-dialog.tsx:25` defines an `inputClass` for a native `<select>` for exactly this reason. Copy that class string rather than importing it from a site component.

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import { updateDemoRequestStatus } from "@/app/[locale]/ops/tenants/actions";
import type { DemoRequestRow } from "@/lib/data/demo-requests";
import { useT, useLocale } from "@/components/locale-provider";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/** Matches `Input`, which has no `<select>` sibling in the design system. */
const inputClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand";

/**
 * The enquiries that have not become an agency yet.
 *
 * The status a row can be moved to is deliberately not the full enum.
 * `converted` is written only by `provisionTenantTx`, together with the
 * organisation it names, so the action refuses it — and an option that
 * is always refused is worse than no option at all. Converting is the
 * Provision button in the last column, which is the honest control for
 * it.
 */
const CHOOSABLE = ["new", "contacted", "scheduled", "declined"] as const;

const STATUS_VARIANT = {
  new: "brand" as const,
  contacted: "info" as const,
  scheduled: "warning" as const,
  converted: "success" as const,
  declined: "neutral" as const,
};

export function DemoRequestQueue({
  requests,
  className,
}: {
  requests: DemoRequestRow[];
  className?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function changeStatus(requestId: string, status: string) {
    const formData = new FormData();
    formData.set("request_id", requestId);
    formData.set("status", status);

    startTransition(async () => {
      const result = await updateDemoRequestStatus(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Panel className={className}>
      <PanelHeader
        label={t(OPS_TENANTS.demoPanel)}
        aside={
          <Badge variant="outline">
            <span className="num">{requests.length}</span>
          </Badge>
        }
      />
      {requests.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">{t(OPS_TENANTS.emptyDemoRequests)}</p>
        </PanelBody>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t(OPS_TENANTS.demoHead.who)}</TableHead>
              <TableHead>{t(OPS_TENANTS.demoHead.company)}</TableHead>
              <TableHead>{t(OPS_TENANTS.demoHead.preferred)}</TableHead>
              <TableHead>{t(OPS_TENANTS.demoHead.status)}</TableHead>
              <TableHead>{t(OPS_TENANTS.demoHead.action)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <span className="font-semibold">{r.fullName}</span>
                  <span className="t-muted block">{r.email}</span>
                </TableCell>
                <TableCell>
                  {r.companyName}
                  <span className="t-muted block">{r.jobTitle}</span>
                </TableCell>
                <TableCell className="t-muted">
                  {/* The zone is stored beside the instant precisely so
                      this reads "14:00 WAT" rather than a UTC number the
                      operator has to convert in their head. */}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: r.preferredTz,
                  }).format(r.preferredAt)}
                  <span className="block">{r.preferredTz}</span>
                </TableCell>
                <TableCell>
                  {r.status === "converted" ? (
                    <Badge variant={STATUS_VARIANT.converted}>
                      {t(OPS_TENANTS.demoStatus.converted)}
                    </Badge>
                  ) : (
                    <select
                      aria-label={t(OPS_TENANTS.demoHead.status)}
                      className={inputClass}
                      value={r.status}
                      disabled={pending}
                      onChange={(e) => changeStatus(r.id, e.currentTarget.value)}
                    >
                      {CHOOSABLE.map((s) => (
                        <option key={s} value={s}>
                          {t(OPS_TENANTS.demoStatus[s])}
                        </option>
                      ))}
                    </select>
                  )}
                </TableCell>
                <TableCell>
                  {r.convertedOrgId ? (
                    <Link
                      href={`/ops/tenants/${r.convertedOrgId}`}
                      className="font-semibold text-brand-text hover:underline"
                    >
                      {r.convertedOrgName}
                    </Link>
                  ) : (
                    <ProvisionTenant demoRequest={r} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
```

`useLocale` is already exported from `@/components/locale-provider:85` — no change needed there. `useT` returns a string from a dictionary and cannot format a date, which is why both hooks are used here.

- [ ] **Step 4: Write `tenant-controls.tsx`**

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  restoreTenant,
  suspendTenant,
  updateMemberRole,
  updateTenantBilling,
} from "@/app/[locale]/ops/tenants/actions";
import type { TenantDetail } from "@/lib/data/tenants";
import { useT } from "@/components/locale-provider";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/**
 * Everything ops can change about one agency.
 *
 * The confirmation for suspension is the sentence above the button, not
 * a second dialog — the stance `CorridorDecision` takes. What makes
 * suspension weighty is not that it is hard to undo (it is one click
 * back) but that it is immediate and total: every one of that agency's
 * people stops being able to open any case the moment it commits. That
 * is worth saying in words rather than behind an "Are you sure?".
 */
export function TenantControls({ tenant }: { tenant: TenantDetail }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  /** Every control here posts the same way; only the action differs. */
  function run(
    action: (fd: FormData) => Promise<{ ok: true } | { error: string }>,
    formData: FormData,
    success: string
  ) {
    startTransition(async () => {
      const result = await action(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(success);
      router.refresh();
    });
  }

  function changeRole(userId: string, role: "owner" | "reviewer") {
    const formData = new FormData();
    formData.set("org_id", tenant.id);
    formData.set("user_id", userId);
    formData.set("role", role);
    run(updateMemberRole, formData, t(OPS_TENANTS.toastRoleChanged));
  }

  function saveBilling(formData: FormData) {
    formData.set("org_id", tenant.id);
    run(updateTenantBilling, formData, t(OPS_TENANTS.toastBillingSaved));
  }

  function changeAccess(suspend: boolean) {
    const formData = new FormData();
    formData.set("org_id", tenant.id);
    run(
      suspend ? suspendTenant : restoreTenant,
      formData,
      suspend ? t(OPS_TENANTS.toastSuspended) : t(OPS_TENANTS.toastRestored)
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Panel>
        <PanelHeader
          label={t(OPS_TENANTS.rosterPanel)}
          aside={
            <Badge variant="outline">
              <span className="num">{tenant.members_.length}</span>
            </Badge>
          }
        />
        {tenant.members_.length === 0 ? (
          <PanelBody>
            {/* Not an error state. A freshly provisioned agency sits
                here until its first person accepts, and saying so stops
                an operator re-provisioning it. */}
            <p className="t-muted max-w-[62ch]">{t(OPS_TENANTS.awaitingFirstOwner)}</p>
          </PanelBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(OPS_TENANTS.rosterHead.person)}</TableHead>
                <TableHead>{t(OPS_TENANTS.rosterHead.role)}</TableHead>
                <TableHead>{t(OPS_TENANTS.rosterHead.joined)}</TableHead>
                <TableHead>{t(OPS_TENANTS.rosterHead.action)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.members_.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <span className="font-semibold">{m.fullName}</span>
                    <span className="t-muted block">{m.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.role === "owner" ? "brand" : "neutral"}>
                      {m.role === "owner"
                        ? t(OPS_TENANTS.roleOwner)
                        : t(OPS_TENANTS.roleReviewer)}
                    </Badge>
                  </TableCell>
                  <TableCell className="t-muted">
                    {m.joinedAt.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="tertiary"
                      disabled={pending}
                      onClick={() =>
                        changeRole(m.userId, m.role === "owner" ? "reviewer" : "owner")
                      }
                    >
                      {m.role === "owner"
                        ? t(OPS_TENANTS.demoteButton)
                        : t(OPS_TENANTS.promoteButton)}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel>
        <PanelHeader label={t(OPS_TENANTS.billingPanel)} />
        <PanelBody>
          <form action={saveBilling} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seats">{t(OPS_TENANTS.fieldSeats)}</Label>
              <Input
                id="seats"
                name="seats"
                type="number"
                min={0}
                defaultValue={tenant.seatsPurchased}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing_contact">{t(OPS_TENANTS.fieldBillingContact)}</Label>
              <Input
                id="billing_contact"
                name="billing_contact"
                type="email"
                defaultValue={tenant.billingContact ?? ""}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {t(OPS_TENANTS.saveBillingButton)}
            </Button>
          </form>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader label={t(OPS_TENANTS.dangerPanel)} />
        <PanelBody className="flex flex-col gap-4">
          <p className="t-muted max-w-[62ch]">
            {tenant.suspendedAt
              ? t(OPS_TENANTS.restoreNotice)
              : t(OPS_TENANTS.suspendNotice)}
          </p>
          {tenant.suspendedAt ? (
            <Button
              className="self-start"
              disabled={pending}
              onClick={() => changeAccess(false)}
            >
              <RotateCcw /> {t(OPS_TENANTS.restoreButton)}
            </Button>
          ) : (
            <Button
              variant="danger"
              className="self-start"
              disabled={pending}
              onClick={() => changeAccess(true)}
            >
              <Ban /> {t(OPS_TENANTS.suspendButton)}
            </Button>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
```

`Button`'s variants are `primary secondary tertiary neutral success warning danger ghost link` (`src/components/ui/button.tsx:15-29`) — `danger` and `tertiary` used above both exist. Do not add a variant to the design system for this screen.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors — this is the first point where the Task 8 page compiles.

- [ ] **Step 6: Commit the page and the components together**

```bash
git add "src/app/[locale]/ops/tenants/page.tsx" src/components/ops/provision-tenant.tsx src/components/ops/demo-request-queue.tsx src/components/ops/tenant-controls.tsx
git commit -m "Draw the agencies list and its controls

The provisioning dialog says in words that this is two steps: the
invitee joins as a reviewer and somebody makes them the owner
afterwards. An operator who does not know that thinks it failed halfway.

The invite link stays on screen after the dialog's work is done. The
email can fail silently, and this is the only other copy — no roster in
this product ever selects a token.

'Converted' is not in the status dropdown. It is written only by
provisioning, together with the organisation it names."
```

---

### Task 10: The tenant detail page

**Files:**
- Create: `src/app/[locale]/ops/tenants/[id]/page.tsx`

**Interfaces:**
- Consumes: `getTenant` (Task 3), `TenantControls` (Task 9), `OPS_TENANTS` (Task 7), `isUuid` from `@/lib/domain/uuid`.

- [ ] **Step 1: Write the page**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { TenantControls } from "@/components/ops/tenant-controls";
import { localizedOpsNav } from "@/components/ops/ops-nav";
import { Shell } from "@/components/shared/shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getTenant } from "@/lib/data/tenants";
import { isUuid } from "@/lib/domain/uuid";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { id } = await params;

  // Never throws for a bad id: metadata for a page that is about to 404
  // should be the section's own title, not an error.
  if (!isUuid(id) || !hasDatabaseEnv) return { title: OPS_TENANTS.heading[locale] };

  const tenant = await getTenant(id);
  return { title: tenant?.name ?? OPS_TENANTS.heading[locale] };
}

export default async function OpsTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const { id } = await params;

  /**
   * A malformed id must be indistinguishable from a missing one.
   * Postgres throws on a bad uuid before any row logic runs, so without
   * this a typed URL like /ops/tenants/1 is a 500 where a
   * wrong-but-well-formed id is a 404.
   */
  if (!isUuid(id)) notFound();

  const [tenant, notifications, unreadCount] = await Promise.all([
    getTenant(id),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  if (!tenant) notFound();

  const counters = [
    {
      label: OPS_TENANTS.tableHead.members[locale],
      value: `${tenant.members} ${OPS_TENANTS.seatsOf[locale]} ${tenant.seatsPurchased}`,
      sub: OPS_TENANTS.counters.seats.sub[locale],
      tone: "text-ink",
    },
    {
      label: OPS_TENANTS.tableHead.applications[locale],
      value: String(tenant.applicationsTotal),
      sub: OPS_TENANTS.counters.liveTenants.sub[locale],
      tone: "text-ink",
    },
    {
      label: OPS_COMMON.awaitingReview[locale],
      value: String(tenant.withReviewer),
      sub: OPS_TENANTS.counters.openEnquiries.sub[locale],
      tone: tenant.withReviewer ? "text-warning-ink" : "text-ink",
    },
    {
      label: OPS_COMMON.approved[locale],
      value: String(tenant.approved),
      sub: OPS_TENANTS.counters.liveTenants.sub[locale],
      tone: "text-success-ink",
    },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={localizedOpsNav(locale)}
        name={profile.fullName}
        email={profile.email}
        subtitle={`${OPS_COMMON.subtitlePrefix[locale]} · ${OPS_COMMON.staffRole[actor.staffRole ?? "reviewer"][locale]}`}
        notifications={
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/ops"
          />
        }
      />

      <div className="relative isolate">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px]"
        />

        <Shell className="pt-10">
          <Link
            href="/ops/tenants"
            className="t-muted inline-flex items-center gap-2 hover:underline"
          >
            <ArrowLeft className="size-4" /> {OPS_TENANTS.detailBackToList[locale]}
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="t-h2">{tenant.name}</h1>
            <Badge variant={tenant.suspendedAt ? "warning" : "success"}>
              {tenant.suspendedAt
                ? OPS_TENANTS.suspendedBadge[locale]
                : OPS_TENANTS.live[locale]}
            </Badge>
          </div>
          {tenant.domain && <p className="t-muted mt-2">{tenant.domain}</p>}

          {/* Counter row: copy the <dl> markup from
              `/ops/corridors/page.tsx` verbatim, mapping over `counters`.
              `value` is already a string. */}

          <Panel className="mt-8">
            <PanelHeader
              label={OPS_TENANTS.invitesPanel[locale]}
              aside={
                <Badge variant="outline">
                  <span className="num">{tenant.pendingInvites.length}</span>
                </Badge>
              }
            />
            {tenant.pendingInvites.length === 0 ? (
              <PanelBody>
                <p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyInvites[locale]}</p>
              </PanelBody>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{OPS_TENANTS.invitesHead.email[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.invitesHead.kind[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.invitesHead.sent[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.invitesHead.expires[locale]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.pendingInvites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        {i.email}
                        {i.fullName && <span className="t-muted block">{i.fullName}</span>}
                      </TableCell>
                      <TableCell>
                        {i.kind === "staff"
                          ? OPS_TENANTS.kindStaff[locale]
                          : OPS_TENANTS.kindClient[locale]}
                      </TableCell>
                      <TableCell className="t-muted">
                        {i.createdAt.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "t-muted",
                          i.expiresAt < new Date() && "text-danger-ink"
                        )}
                      >
                        {i.expiresAt.toISOString().slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>

          <div className="mt-8 mb-16">
            <TenantControls tenant={tenant} />
          </div>
        </Shell>
      </div>
    </div>
  );
}
```

Fill in the counter `<dl>` block by copying it from `/ops/corridors/page.tsx` lines 158-185, rendering `{c.value}` directly since it is already a string.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Verify the whole surface by hand**

```bash
npm run db:up
npm run dev
```

Walk it, signed in as a staff account with a second factor:

1. `/ops` redirects to `/ops/corridors`; the nav shows two pills and "Routes" is lit.
2. Click "Agencies" — the list renders, counters add up, a tenant with no applications shows zeroes rather than being missing.
3. Provision an agency from the walk-in button. The invite link appears. Check the agency is in the list with 0 members and 1 pending invitation.
4. Open the tenant. Suspend it; the badge flips and the list agrees. Restore it.
5. Set seats to 4 and a billing contact; reload and confirm both stuck.
6. Set a demo request to "Contacted"; reload and confirm it stuck. Confirm "Converted" is not in the dropdown.
7. Confirm there is no link anywhere on either page that reaches a case.

- [ ] **Step 4: Run everything**

```bash
npm run typecheck
npm run lint
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/ops/tenants/[id]/page.tsx"
git commit -m "Draw one agency

isUuid before the query, so a typed URL is a 404 rather than a 500 —
Postgres throws on a malformed uuid before any row logic runs, and a
malformed id must be indistinguishable from a missing one."
```

---

## Deviations from the spec, and why

Two, both deliberate, both worth a reviewer knowing:

**`listTenants` runs four queries, not one.** The spec says "one query: `organisations` LEFT JOIN aggregate subqueries". The house idiom in this directory — `listCorridors` in `src/lib/data/corridors.ts:131` — is a base query plus grouped counts plus a Map, because joining a one-to-many count onto a base row multiplies rows before aggregating them. The spec's actual requirement, no per-tenant follow-up query, holds either way. Following the neighbouring file wins.

**`getTenant` calls `listTenants`.** It re-runs the platform-wide counts to answer about one agency. At the scale this console operates on — tens of tenants, staff-only traffic, `force-dynamic` — that is cheaper than a second set of aggregate queries scoped to one org id, and it guarantees the detail page and the list page can never disagree about a number. If the tenant count reaches the hundreds, this is the first thing to narrow.
