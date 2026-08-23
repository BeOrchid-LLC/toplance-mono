# Visa Data Provider and First Analytics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put visa requirements behind a provider-agnostic interface, with the
existing curated embassy data as its first implementation, and emit the first
`toplance.object_action` analytics events.

**Architecture:** A `VisaDataProvider` returns a normalised `CorridorRuleSet`
for a nationality → destination → purpose query. Providers are tried in order
and the first non-null answer wins, so adding a vendor is appending to a list
rather than editing the requirements engine. The curated provider reads the
`corridors` and `corridor_requirements` tables that already hold the four live
rule sets, which means this phase changes where the data is *read from* without
changing what a traveller sees. Analytics follows the same shape: a `track()`
seam writing to Postgres, so adopting a vendor later is one implementation.

**Tech Stack:** TypeScript, Drizzle ORM 0.45 over PostgreSQL, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-08-23-platform-stack-migration-design.md`
(Phase 3)

## Global Constraints

- Analytics event names are `app.object_action`, all lowercase — exactly
  `toplance.document_uploaded`, `thrivo.meal_logged`. **No other format, for any
  app.** Nothing in this repo emits analytics yet, so the first event sets the
  precedent for the whole platform. (AGENTS.md, locked 2026-08-21.)
- Table names are lowercase, snake_case and **plural** — `toplance.food_logs`,
  not `FoodLog` or `food_log`. New tables must conform; the existing
  `audit_log` deviation is recorded and must not be copied.
- Do not migrate the recorded schema deviations (`public` schema, `organisations`
  spelling, `org_members`, `audit_log`) — that is BeOrchid Core work planned with
  the platform team.
- Every corridor rule set carries `source_name` and `source_url`. A checklist
  nobody can trace is a checklist nobody trusts; this is stated on the
  requirements screen and must survive the refactor.
- Reads of application-scoped data go through `@/lib/auth/guards`. Corridor data
  is reference data and is not application-scoped, but the *pages* that read it
  still sit behind a session.
- Do not modify anything under `src/components/ui/` or the design system.
- Drizzle's `pgTable` second-argument callback returns an **array**, not an
  object.
- Database-backed tests skip themselves without `DATABASE_URL` and are included
  by `npm run db:up`. Follow the existing pattern in
  `src/lib/auth/guards.test.ts`.

## Scope: what this plan does not build

The spec names an API provider — "Sherpa's free tier at 1,000 requests per
month, or Travel Buddy". **No vendor has been chosen**: the Sherpa quote came
back steep and a free tier is still being sought. The spec also flags that free
tiers commonly forbid the caching and redistribution the caching strategy
depends on.

Tasks 1, 2 and 4 are therefore executable now and deliver working software.
Tasks 3 and 5 are fully specified but **gated on the vendor decision**, because:

- The cache exists to serve an API provider. Curated data is already two indexed
  Postgres queries away; caching it would be dead code with a table behind it.
- Whether caching is *permitted at all* is a term of a contract nobody has
  signed.

Do not execute Tasks 3 or 5 until a provider and its terms are confirmed.

## Why the analytics half is not filler

`src/app/(app)/app/requirements/page.tsx` tells a traveller whose corridor is
not served:

> "your request has been counted towards it — corridors are prioritised by real
> demand, not guesswork."

Nothing counts it. That sentence is currently untrue on screen. Task 4's
`toplance.corridor_requested` event is what makes it true, and it is the reason
this task is worth doing before a vendor exists rather than after.

## File Structure

**Create:**
- `src/lib/visa/types.ts` — `CorridorQuery`, `RequirementSpec`, `CorridorRuleSet`,
  `VisaDataProvider`. Types only, no I/O, so the contract can be read on its own.
- `src/lib/visa/curated.ts` — the provider over `corridors` / `corridor_requirements`
- `src/lib/visa/index.ts` — the ordered provider list and `resolveRuleSet()`
- `src/lib/visa/curated.test.ts` — database-backed
- `src/lib/analytics/events.ts` — the event-name union and the format guard
- `src/lib/analytics/track.ts` — `track()`, writing to Postgres
- `src/lib/analytics/events.test.ts` — proves every name matches `app.object_action`

**Modify:**
- `src/lib/db/schema.ts` — add `analyticsEvents`
- `src/app/(app)/actions.ts` — resolve corridors through the provider; emit events
- `src/app/(app)/app/requirements/page.tsx` — read requirements through the provider
- `drizzle/` — one generated migration

---

### Task 1: The provider contract and the curated implementation

**Files:**
- Create: `src/lib/visa/types.ts`, `src/lib/visa/curated.ts`, `src/lib/visa/index.ts`
- Test: `src/lib/visa/curated.test.ts`

**Interfaces:**
- Consumes: `corridors`, `corridorRequirements` from `@/lib/db/schema`; `db` from
  `@/lib/db/client`
- Produces:
  - `type CorridorQuery = { nationalityIso: string; destinationIso: string; purpose: TravelPurpose }`
  - `type RequirementSpec = { docKey: string; name: string; description: string | null; category: string; isRequired: boolean; sortOrder: number }`
  - `type CorridorRuleSet = { corridorId: string | null; visaName: string; version: number; effectiveFrom: string; sourceName: string | null; sourceUrl: string | null; processingWeeksMin: number | null; processingWeeksMax: number | null; governmentFeeMinor: number | null; governmentFeeCurrency: string | null; requirements: RequirementSpec[] }`
  - `interface VisaDataProvider { readonly name: string; fetch(query: CorridorQuery): Promise<CorridorRuleSet | null> }`
  - `curatedProvider: VisaDataProvider`
  - `resolveRuleSet(query: CorridorQuery): Promise<CorridorRuleSet | null>` from `@/lib/visa`

- [ ] **Step 1: Write the types**

Create `src/lib/visa/types.ts`:

```ts
import type { travelPurpose } from "@/lib/db/schema";

export type TravelPurpose = (typeof travelPurpose.enumValues)[number];

/** One nationality → one destination → one purpose. */
export type CorridorQuery = {
  nationalityIso: string;
  destinationIso: string;
  purpose: TravelPurpose;
};

export type RequirementSpec = {
  docKey: string;
  name: string;
  description: string | null;
  category: string;
  isRequired: boolean;
  sortOrder: number;
};

/**
 * What every provider must return, whoever it is.
 *
 * `corridorId` is set only when the rule set came from a row in our own
 * `corridors` table — an application's `corridor_id` foreign key needs
 * something real to point at. An API provider returns null here, which
 * is why the checklist builder must cope with a rule set that has no
 * corridor row behind it.
 *
 * `sourceName` and `sourceUrl` are not decoration. The requirements
 * screen shows them, and a checklist nobody can trace is a checklist
 * nobody trusts.
 */
export type CorridorRuleSet = {
  corridorId: string | null;
  visaName: string;
  version: number;
  effectiveFrom: string;
  sourceName: string | null;
  sourceUrl: string | null;
  processingWeeksMin: number | null;
  processingWeeksMax: number | null;
  governmentFeeMinor: number | null;
  governmentFeeCurrency: string | null;
  requirements: RequirementSpec[];
};

/**
 * `name` is stable and is written to analytics and (later) cache rows,
 * so it must not change once a provider ships.
 *
 * `fetch` returns null for "I do not cover this corridor", which is a
 * normal answer, not a failure. It throws only when the provider itself
 * is broken — the resolver tells the two apart.
 */
export interface VisaDataProvider {
  readonly name: string;
  fetch(query: CorridorQuery): Promise<CorridorRuleSet | null>;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/visa/curated.test.ts`:

```ts
import { describe, expect, it } from "vitest";

/**
 * The curated provider over the seeded corridors. These are the four
 * rule sets `npm run db:seed` loads, so the test doubles as a check that
 * the seed still matches what the requirements engine expects.
 *
 * Skipped without a database. Run `npm run db:up && npm run db:seed`.
 */
describe.skipIf(!process.env.DATABASE_URL)("curatedProvider", async () => {
  const { curatedProvider } = await import("@/lib/visa/curated");
  const { resolveRuleSet } = await import("@/lib/visa");

  it("returns the UK skilled worker rule set with its source", async () => {
    const ruleSet = await curatedProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    });

    expect(ruleSet).not.toBeNull();
    expect(ruleSet!.visaName).toBe("Skilled Worker Visa");
    expect(ruleSet!.sourceName).toBe("UK Visas and Immigration");
    expect(ruleSet!.sourceUrl).toMatch(/^https:\/\//);
    expect(ruleSet!.corridorId).not.toBeNull();
  });

  it("carries the requirements in checklist order", async () => {
    const ruleSet = await curatedProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    });

    const orders = ruleSet!.requirements.map((r) => r.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(ruleSet!.requirements[0].docKey).toBe("passport");
    expect(ruleSet!.requirements.some((r) => !r.isRequired)).toBe(true);
  });

  it("returns null for a corridor nobody has curated", async () => {
    await expect(
      curatedProvider.fetch({
        nationalityIso: "ng",
        destinationIso: "jp",
        purpose: "tourism",
      })
    ).resolves.toBeNull();
  });

  it("resolves through the provider list", async () => {
    const ruleSet = await resolveRuleSet({
      nationalityIso: "ng",
      destinationIso: "ca",
      purpose: "study",
    });

    expect(ruleSet!.visaName).toBe("Study Permit");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/visa/curated.test.ts`
Expected: FAIL — cannot resolve `@/lib/visa/curated`.

- [ ] **Step 4: Implement the curated provider**

Create `src/lib/visa/curated.ts`:

```ts
import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { corridorRequirements, corridors } from "@/lib/db/schema";
import type { CorridorQuery, CorridorRuleSet, VisaDataProvider } from "@/lib/visa/types";

/**
 * Embassy-sourced rule sets, curated by hand and loaded by
 * `npm run db:seed`. This is the highest-trust provider and is tried
 * first: a figure someone checked against the mission beats a figure an
 * API inferred.
 *
 * Only `is_live` corridors are served, and the highest version wins —
 * rule sets are versioned so that when a mission changes what it wants,
 * everyone on that corridor sees the change with its effective date.
 */
export const curatedProvider: VisaDataProvider = {
  name: "curated",

  async fetch(query: CorridorQuery): Promise<CorridorRuleSet | null> {
    const [corridor] = await db
      .select()
      .from(corridors)
      .where(
        and(
          eq(corridors.nationalityIso, query.nationalityIso),
          eq(corridors.destinationIso, query.destinationIso),
          eq(corridors.purpose, query.purpose),
          eq(corridors.isLive, true)
        )
      )
      .orderBy(desc(corridors.version))
      .limit(1);

    if (!corridor) return null;

    const requirements = await db
      .select()
      .from(corridorRequirements)
      .where(eq(corridorRequirements.corridorId, corridor.id))
      .orderBy(corridorRequirements.sortOrder);

    return {
      corridorId: corridor.id,
      visaName: corridor.visaName,
      version: corridor.version,
      effectiveFrom: corridor.effectiveFrom,
      sourceName: corridor.sourceName,
      sourceUrl: corridor.sourceUrl,
      processingWeeksMin: corridor.processingWeeksMin,
      processingWeeksMax: corridor.processingWeeksMax,
      governmentFeeMinor: corridor.governmentFeeMinor,
      governmentFeeCurrency: corridor.governmentFeeCurrency,
      requirements: requirements.map((r) => ({
        docKey: r.docKey,
        name: r.name,
        description: r.description,
        category: r.category,
        isRequired: r.isRequired,
        sortOrder: r.sortOrder,
      })),
    };
  },
};
```

- [ ] **Step 5: Implement the resolver**

Create `src/lib/visa/index.ts`:

```ts
import "server-only";

import { curatedProvider } from "@/lib/visa/curated";
import type { CorridorQuery, CorridorRuleSet, VisaDataProvider } from "@/lib/visa/types";

export type {
  CorridorQuery,
  CorridorRuleSet,
  RequirementSpec,
  TravelPurpose,
  VisaDataProvider,
} from "@/lib/visa/types";

/**
 * Order is precedence. Curated embassy data first, because someone
 * checked it against the mission; an API provider would go after, to
 * widen coverage rather than to override what we already trust.
 */
const PROVIDERS: VisaDataProvider[] = [curatedProvider];

/**
 * The first provider with an answer wins. A provider that throws is
 * logged and skipped rather than allowed to take down the requirements
 * screen: one vendor being down must not stop a traveller seeing a
 * corridor another provider covers.
 */
export async function resolveRuleSet(
  query: CorridorQuery
): Promise<CorridorRuleSet | null> {
  for (const provider of PROVIDERS) {
    try {
      const ruleSet = await provider.fetch(query);
      if (ruleSet) return ruleSet;
    } catch (error) {
      console.error(
        `[visa] provider "${provider.name}" failed for ` +
          `${query.nationalityIso}→${query.destinationIso}/${query.purpose}`,
        error
      );
    }
  }

  return null;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/lib/visa/curated.test.ts`
Expected: 4 passing.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/lib/visa
git commit -m "Put visa rule sets behind a provider interface"
```

---

### Task 2: Route the requirements engine through the provider

Nothing a traveller sees changes. This replaces two hand-written corridor
queries with one call, so the vendor decision later touches no page.

**Files:**
- Modify: `src/app/(app)/actions.ts` (the `buildChecklist` corridor lookup)
- Modify: `src/app/(app)/app/requirements/page.tsx`
- Modify: `src/lib/data/applications.ts` (`getCorridorFor` keeps its signature)

**Interfaces:**
- Consumes: `resolveRuleSet(query)` from `@/lib/visa` (Task 1)
- Produces: no new exports

- [ ] **Step 1: Replace the corridor lookup in `buildChecklist`**

In `src/app/(app)/actions.ts`, replace the `db.select(...).from(corridors)` block
with:

```ts
  const ruleSet = await resolveRuleSet({
    nationalityIso: nationality,
    destinationIso: destination,
    purpose,
  });

  if (!ruleSet) {
    // A corridor we do not serve yet. The intake still completes; the
    // requirements screen explains that it is in the build queue.
    await db
      .update(applications)
      .set({
        intakeComplete: true,
        corridorId: null,
        status: "collecting_documents",
      })
      .where(eq(applications.id, applicationId));
    return;
  }
```

Then build the checklist from `ruleSet.requirements` rather than a second query,
and set `corridorId: ruleSet.corridorId`:

```ts
  const existing = await db
    .select({ docKey: documents.docKey, state: documents.state })
    .from(documents)
    .where(eq(documents.applicationId, applicationId));

  const keep = new Set(existing.map((d) => d.docKey));

  const rows = ruleSet.requirements
    .filter((r) => !keep.has(r.docKey))
    .map((r) => ({
      applicationId,
      docKey: r.docKey,
      name: r.name,
      isRequired: r.isRequired,
      sortOrder: r.sortOrder,
    }));

  if (rows.length) await db.insert(documents).values(rows);

  const wanted = new Set(ruleSet.requirements.map((r) => r.docKey));
  const stale = existing
    .filter((d) => !wanted.has(d.docKey) && d.state === "not_started")
    .map((d) => d.docKey);

  if (stale.length) {
    await db
      .delete(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          inArray(documents.docKey, stale)
        )
      );
  }

  await db
    .update(applications)
    .set({
      intakeComplete: true,
      corridorId: ruleSet.corridorId,
      status: "collecting_documents",
    })
    .where(eq(applications.id, applicationId));
```

Remove the now-unused `corridors` and `corridorRequirements` imports if nothing
else in the file uses them.

- [ ] **Step 2: Read the requirements page through the provider**

`src/app/(app)/app/requirements/page.tsx` currently calls `getCorridorFor()` and
then queries `corridor_requirements` directly. Both become one resolver call.
Replace the data-fetching block with:

```ts
  const [application, answers] = await Promise.all([
    getOrCreateApplication(),
    // answers are needed for the "corridor not covered" copy
  ]);
```

then, after the existing null checks:

```ts
  const ruleSet = application.corridorId
    ? await resolveRuleSet({
        nationalityIso: NATIONALITY_ISO[answers.nationality] ?? "ng",
        destinationIso: DESTINATION_ISO[answers.destination] ?? "",
        purpose: PURPOSE_ISO[answers.purpose] ?? "work",
      })
    : null;
```

**Do not duplicate the label→code maps.** They currently live as private consts
in `src/app/(app)/actions.ts`. Move `PURPOSE_MAP`, `DESTINATION_MAP` and
`NATIONALITY_MAP` into `src/lib/domain/corridors.ts` as exported
`PURPOSE_ISO`, `DESTINATION_ISO` and `NATIONALITY_ISO`, and import them in both
places. That file is the existing home for corridor vocabulary.

Then replace every `corridor.` reference in the JSX with `ruleSet.`:
`corridor.visaName` → `ruleSet.visaName`, `corridor.processingWeeksMin` →
`ruleSet.processingWeeksMin`, `corridor.governmentFeeMinor` →
`ruleSet.governmentFeeMinor`, `corridor.version` → `ruleSet.version`,
`corridor.effectiveFrom` → `ruleSet.effectiveFrom`, `corridor.sourceUrl` →
`ruleSet.sourceUrl`, `corridor.sourceName` → `ruleSet.sourceName`. The
`required` / `optional` split reads `ruleSet.requirements` instead of a query
result.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no output. Errors here are usually a missed `corridor.` → `ruleSet.`
rename in the JSX.

- [ ] **Step 4: Confirm the checklist still builds**

Run: `npm test`
Expected: all tests pass, including Task 1's four.

Then, against the running app, confirm a Nigeria → United Kingdom → Work intake
still produces the eight-item UK checklist. If Clerk sign-in is still blocked,
assert it directly instead:

```bash
docker exec toplance_postgres psql -U toplance -d toplance -tAc \
  "select count(*) from corridor_requirements r
     join corridors c on c.id = r.corridor_id
    where c.destination_iso = 'gb' and c.purpose = 'work'"
```

Expected: the same count the requirements page renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Resolve corridors through the visa data provider"
```

---

### Task 3: Cache provider responses — **GATED on the vendor decision**

Do not execute until a provider and its terms are confirmed. The cache has no
consumer without an API provider, and free tiers commonly forbid caching.

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `src/lib/visa/cache.ts`, `src/lib/visa/cache.test.ts`
- Create: `drizzle/` migration (generated)

**Interfaces:**
- Consumes: `VisaDataProvider`, `CorridorQuery`, `CorridorRuleSet` (Task 1)
- Produces: `cached(provider: VisaDataProvider, ttlHours?: number): VisaDataProvider`

- [ ] **Step 1: Add the table**

In `src/lib/db/schema.ts`, after `auditLog`:

```ts
/**
 * Normalised rule sets from API providers, kept to respect free-tier
 * request limits and to keep the requirements screen fast.
 *
 * Stores our own `CorridorRuleSet`, not the vendor's payload: the cache
 * then survives a provider changing its response shape, and holds no
 * vendor-proprietary structure. Confirm the vendor's terms permit
 * caching before switching this on — free tiers commonly forbid it.
 */
export const cachedRuleSets = pgTable(
  "cached_rule_sets",
  {
    id: uuid().primaryKey().defaultRandom(),
    provider: text().notNull(),
    nationalityIso: text().notNull(),
    destinationIso: text().notNull(),
    purpose: travelPurpose().notNull(),
    payload: jsonb().notNull(),
    fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    unique("cached_rule_sets_corridor").on(
      t.provider,
      t.nationalityIso,
      t.destinationIso,
      t.purpose
    ),
    index("cached_rule_sets_expiry_idx").on(t.expiresAt),
  ]
);
```

Name note: `cached_rule_sets` is plural per the platform convention. Do not copy
the `audit_log` singular, which AGENTS.md records as a deviation to be fixed.

- [ ] **Step 2: Generate and apply the migration**

```bash
npm run db:generate
npm run db:migrate
docker exec toplance_postgres psql -U toplance -d toplance -c "\d cached_rule_sets"
```

Expected: one new table with the unique constraint on
`(provider, nationality_iso, destination_iso, purpose)`.

- [ ] **Step 3: Write the failing test**

Create `src/lib/visa/cache.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

describe.skipIf(!process.env.DATABASE_URL)("cached", async () => {
  const { db } = await import("@/lib/db/client");
  const { cachedRuleSets } = await import("@/lib/db/schema");
  const { cached } = await import("@/lib/visa/cache");
  const { CorridorRuleSet, VisaDataProvider } = await import("@/lib/visa/types");

  const query = {
    nationalityIso: "ng",
    destinationIso: "zz",
    purpose: "work" as const,
  };

  const ruleSet = {
    corridorId: null,
    visaName: "Test Visa",
    version: 1,
    effectiveFrom: "2026-01-01",
    sourceName: "Test",
    sourceUrl: "https://example.invalid",
    processingWeeksMin: 1,
    processingWeeksMax: 2,
    governmentFeeMinor: 1000,
    governmentFeeCurrency: "NGN",
    requirements: [],
  };

  function counting(): { provider: VisaDataProvider; calls: () => number } {
    let calls = 0;
    return {
      provider: {
        name: "test",
        async fetch() {
          calls += 1;
          return ruleSet;
        },
      },
      calls: () => calls,
    };
  }

  afterEach(async () => {
    await db.delete(cachedRuleSets).where(eq(cachedRuleSets.provider, "test"));
  });

  it("calls the provider once and serves the second read from cache", async () => {
    const { provider, calls } = counting();
    const wrapped = cached(provider);

    await expect(wrapped.fetch(query)).resolves.toEqual(ruleSet);
    await expect(wrapped.fetch(query)).resolves.toEqual(ruleSet);

    expect(calls()).toBe(1);
  });

  it("refetches once the entry has expired", async () => {
    const { provider, calls } = counting();
    const wrapped = cached(provider, 0);

    await wrapped.fetch(query);
    await wrapped.fetch(query);

    expect(calls()).toBe(2);
  });

  it("keeps the provider's name, so callers cannot tell it is wrapped", () => {
    expect(cached(counting().provider).name).toBe("test");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/lib/visa/cache.test.ts`
Expected: FAIL — cannot resolve `@/lib/visa/cache`.

- [ ] **Step 5: Implement the wrapper**

Create `src/lib/visa/cache.ts`:

```ts
import "server-only";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cachedRuleSets } from "@/lib/db/schema";
import type { CorridorQuery, CorridorRuleSet, VisaDataProvider } from "@/lib/visa/types";

/**
 * Wraps a provider so identical corridor queries hit the database
 * instead of the vendor. A decorator rather than a change to the
 * resolver, so the curated provider — which is already local — is not
 * pointlessly cached, and so a provider whose terms forbid caching is
 * simply not wrapped.
 *
 * A cache write that fails must not fail the request: the answer is
 * already in hand, and serving it uncached is strictly better than an
 * error screen.
 */
export function cached(
  provider: VisaDataProvider,
  ttlHours = 24
): VisaDataProvider {
  return {
    name: provider.name,

    async fetch(query: CorridorQuery): Promise<CorridorRuleSet | null> {
      const [hit] = await db
        .select({ payload: cachedRuleSets.payload })
        .from(cachedRuleSets)
        .where(
          and(
            eq(cachedRuleSets.provider, provider.name),
            eq(cachedRuleSets.nationalityIso, query.nationalityIso),
            eq(cachedRuleSets.destinationIso, query.destinationIso),
            eq(cachedRuleSets.purpose, query.purpose),
            gt(cachedRuleSets.expiresAt, new Date())
          )
        )
        .limit(1);

      if (hit) return hit.payload as CorridorRuleSet;

      const fresh = await provider.fetch(query);
      // "Not covered" is not cached: a corridor a vendor adds next week
      // should appear next week, not after the TTL of a negative answer.
      if (!fresh) return null;

      const expiresAt = new Date(Date.now() + ttlHours * 3_600_000);

      try {
        await db
          .insert(cachedRuleSets)
          .values({
            provider: provider.name,
            nationalityIso: query.nationalityIso,
            destinationIso: query.destinationIso,
            purpose: query.purpose,
            payload: fresh,
            fetchedAt: new Date(),
            expiresAt,
          })
          .onConflictDoUpdate({
            target: [
              cachedRuleSets.provider,
              cachedRuleSets.nationalityIso,
              cachedRuleSets.destinationIso,
              cachedRuleSets.purpose,
            ],
            set: { payload: fresh, fetchedAt: new Date(), expiresAt },
          });
      } catch (error) {
        console.error(`[visa] could not cache "${provider.name}" response`, error);
      }

      return fresh;
    },
  };
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/lib/visa/cache.test.ts`
Expected: 3 passing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Cache API provider rule sets in Postgres"
```

---

### Task 4: The first analytics events

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `src/lib/analytics/events.ts`, `src/lib/analytics/track.ts`,
  `src/lib/analytics/events.test.ts`
- Modify: `src/app/(app)/actions.ts`
- Create: `drizzle/` migration (generated)

**Interfaces:**
- Consumes: `db` from `@/lib/db/client`
- Produces:
  - `type AnalyticsEvent` — the union of permitted names
  - `EVENT_NAMES: readonly AnalyticsEvent[]`
  - `track(event: AnalyticsEvent, props?: Record<string, unknown>, userId?: string | null): Promise<void>`

- [ ] **Step 1: Add the table**

In `src/lib/db/schema.ts`, after `auditLog`:

```ts
/**
 * Product analytics. Separate from `audit_log`, which answers "who
 * touched this application" for compliance and is read by staff; this
 * answers "how many people asked for a corridor we do not serve" and is
 * read by whoever prioritises the roadmap.
 *
 * Written to Postgres behind `track()` rather than to a vendor, because
 * no analytics vendor has been chosen. Adopting one later is a second
 * implementation behind the same function, not a change at every call
 * site.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    name: text().notNull(),
    userId: text().references(() => profiles.id, { onDelete: "set null" }),
    props: jsonb().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_events_name_idx").on(t.name, t.createdAt)]
);
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npm run db:generate
npm run db:migrate
docker exec toplance_postgres psql -U toplance -d toplance -c "\d analytics_events"
```

Expected: the table, with the `(name, created_at)` index.

- [ ] **Step 3: Write the failing test**

Create `src/lib/analytics/events.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { EVENT_NAMES } from "@/lib/analytics/events";

/**
 * AGENTS.md, locked 2026-08-21: analytics events are
 * `app.object_action`, all lowercase, for every BeOrchid app. Nothing in
 * this repo emitted analytics before these, so the first event sets the
 * precedent — which is why the format is a test and not a convention
 * someone has to remember.
 */
describe("event names", () => {
  it("all match app.object_action, lowercase", () => {
    for (const name of EVENT_NAMES) {
      expect(name).toMatch(/^toplance\.[a-z0-9]+(?:_[a-z0-9]+)+$/);
    }
  });

  it("all belong to this app", () => {
    for (const name of EVENT_NAMES) {
      expect(name.startsWith("toplance.")).toBe(true);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/lib/analytics/events.test.ts`
Expected: FAIL — cannot resolve `@/lib/analytics/events`.

- [ ] **Step 5: Write the event list**

Create `src/lib/analytics/events.ts`:

```ts
/**
 * Every analytics event Toplance emits.
 *
 * The shape is `app.object_action`, all lowercase — a BeOrchid platform
 * convention locked on 2026-08-21 and shared across every product.
 * Nothing in this repo emitted analytics before this list, so it sets
 * the precedent; `events.test.ts` enforces the format.
 *
 * A union rather than a free `string`, so a typo is a compile error
 * instead of an event nobody notices is missing from the dashboard.
 */
export const EVENT_NAMES = [
  "toplance.intake_completed",
  /** A corridor was resolved to a rule set the traveller can act on. */
  "toplance.corridor_resolved",
  /**
   * A corridor nobody serves yet. The requirements screen tells the
   * traveller "your request has been counted towards it — corridors are
   * prioritised by real demand, not guesswork". This event is what makes
   * that sentence true.
   */
  "toplance.corridor_requested",
  "toplance.document_uploaded",
  "toplance.document_removed",
  "toplance.application_submitted",
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/lib/analytics/events.test.ts`
Expected: 3 passing.

- [ ] **Step 7: Write `track()`**

Create `src/lib/analytics/track.ts`:

```ts
import "server-only";

import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";
import type { AnalyticsEvent } from "@/lib/analytics/events";

/**
 * Record one product event.
 *
 * Never throws. An analytics write is not worth failing a document
 * upload for, and a traveller on a bad connection in Lagos should not
 * lose a passport scan because a metrics insert timed out — so the
 * failure is logged and swallowed.
 *
 * Not awaited by most callers for the same reason; see the call sites.
 */
export async function track(
  event: AnalyticsEvent,
  props: Record<string, unknown> = {},
  userId: string | null = null
): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({ name: event, userId, props });
  } catch (error) {
    console.error(`[analytics] could not record "${event}"`, error);
  }
}
```

- [ ] **Step 8: Emit the events**

In `src/app/(app)/actions.ts`:

In `answerQuestion`, after `if (complete) { await buildChecklist(...) }`, and
inside that branch:

```ts
    if (complete) {
      await buildChecklist(applicationId, map);
      await track("toplance.intake_completed", { applicationId }, actor.userId);
    }
```

This needs the actor, so capture it from the guard, which already returns one:

```ts
    const { actor } = await requireApplicationAccess(
      applicationId,
      canWriteIntakeAnswers
    );
```

In `buildChecklist`, at the two exit points:

```ts
  // corridor not served
  await track("toplance.corridor_requested", {
    nationalityIso: nationality,
    destinationIso: destination ?? answers.destination,
    purpose: purpose ?? answers.purpose,
  });

  // corridor served
  await track("toplance.corridor_resolved", {
    corridorId: ruleSet.corridorId,
    provider: "curated",
    destinationIso: destination,
    purpose,
  });
```

`buildChecklist` has no actor in scope and must not grow a session dependency —
pass `actor.userId` in as a parameter from `answerQuestion`.

In `uploadDocument`, after the successful row update:

```ts
  await track("toplance.document_uploaded", { applicationId, docKey }, actor.userId);
```

In `removeDocument`, after the row update:

```ts
  await track("toplance.document_removed", { applicationId, docKey }, actor.userId);
```

In `submitApplication`, after `submitApplicationTx` returns `ok`:

```ts
    if ("ok" in result) {
      await track("toplance.application_submitted", { applicationId }, actor.userId);
      revalidatePath("/app", "layout");
    }
```

Each of these needs `const { actor } = await requireApplicationAccess(...)`
rather than discarding the return value.

- [ ] **Step 9: Verify the events land**

```bash
npm run typecheck && npm test
```

Then, with the app running, complete an intake for a corridor that is not served
(Nigeria → United States → Tourism is seeded as unavailable) and check:

```bash
docker exec toplance_postgres psql -U toplance -d toplance -c \
  "select name, props, created_at from analytics_events order by created_at desc limit 5"
```

Expected: a `toplance.corridor_requested` row carrying the destination, and a
`toplance.intake_completed` row.

If Clerk sign-in is still blocked, assert `track()` directly instead:

```bash
node --env-file-if-exists=.env.local --experimental-strip-types -e "
  const { track } = await import('./src/lib/analytics/track.ts');
  await track('toplance.corridor_requested', { destinationIso: 'us' });
"
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Emit the first toplance.object_action analytics events"
```

---

### Task 5: An API visa data provider — **GATED on the vendor decision**

Do not execute until a vendor is chosen, its free-tier limits are known, and its
terms are confirmed to permit caching and display.

**Files:**
- Create: `src/lib/visa/<vendor>.ts`, `src/lib/visa/<vendor>.test.ts`
- Modify: `src/lib/visa/index.ts` (append to `PROVIDERS`)
- Modify: `.env.local.example` (the vendor key)

**Interfaces:**
- Consumes: `VisaDataProvider`, `CorridorRuleSet` (Task 1); `cached()` (Task 3)
- Produces: one more entry in `PROVIDERS`

What the implementer must settle before writing code:

1. **Terms.** Does the free tier permit storing responses (Task 3) and showing
   them to end users? The spec flags this as a live risk. If caching is
   forbidden, do not wrap the provider in `cached()` and expect the request
   budget to be the binding constraint.
2. **Budget.** Sherpa's free tier is 1,000 requests per month. With the cache,
   one request covers one corridor for a TTL; without it, every requirements
   page view spends one. That difference decides whether the tier is viable.
3. **Attribution.** `sourceName` and `sourceUrl` are shown on the requirements
   screen and are not optional. A provider that returns requirements without a
   citable source cannot be shown as-is.
4. **Coverage.** The provider goes *after* `curatedProvider` in `PROVIDERS`, so
   it widens coverage and never overrides embassy data someone verified.

The implementation is otherwise the same shape as `curated.ts`: map the vendor's
response onto `CorridorRuleSet`, return `null` for an uncovered corridor, throw
only when the vendor itself fails. `corridorId` is `null` — an API rule set has
no row in our `corridors` table, so `buildChecklist` will set
`applications.corridor_id` to null for it. **Confirm before shipping that the
requirements page renders correctly for an application whose `corridor_id` is
null but whose rule set is non-null**, since Task 2's page keys its fetch on
`application.corridorId`.

---

## Self-review notes

Checked against the spec's Phase 3 bullets:

- "Define `VisaDataProvider` with two first-class implementations: curated
  embassy-sourced data … and an API provider" — Task 1 (curated), Task 5 (API,
  gated).
- "Cache provider responses in Postgres … Confirm each vendor's terms permit
  caching and display before relying on it" — Task 3, gated, with the terms
  check written into Task 5's preconditions.
- "Emit the first analytics events using `toplance.object_action` from the first
  event" — Task 4, with the format enforced by a test rather than a convention.
- **Exit: "requirements pages serve real provider and curated data"** — only
  half reachable now. Curated data flows through the provider from Task 2; the
  API half waits on the vendor.

Three things a reviewer should watch:

**Task 2 moves the label→code maps.** `PURPOSE_MAP`, `DESTINATION_MAP` and
`NATIONALITY_MAP` are private to `actions.ts` today and are needed in two places
after this. They move to `src/lib/domain/corridors.ts` and get exported. If the
implementer copies them instead, the two copies will drift and a traveller will
see a corridor resolve on one screen and not the other.

**Task 4 changes guard call sites.** Five `await requireApplicationAccess(...)`
calls currently discard the return value and now need `const { actor } =`. It is
easy to add the `track()` call and forget the destructure, which typechecks only
because `actor` would then be undefined at runtime — pass `actor.userId`
explicitly and let the compiler catch it.

**`corridorId` is nullable for a reason.** An API rule set has no row in our
`corridors` table. Task 2's requirements page currently keys its fetch on
`application.corridorId`, which is correct today because the only provider is
curated. Task 5 must revisit it; the note is in Task 5 rather than left for
someone to discover.
