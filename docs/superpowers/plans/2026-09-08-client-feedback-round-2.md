# Client Feedback Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land every change Peace Adejoh asked for in the 8 September 2026 review, in time for the 9 September demo.

**Architecture:** Most of the list is one component deep. `DataTable` is the single
choke point for row numbering and pager placement, so two tasks there satisfy nine
requests across both consoles. The copy changes are dictionary edits in
`src/lib/i18n/*`, ten locales per string. Only two items are new behaviour, and both
sit on plumbing that already exists: `notify()`/`notifyAgency()` for the biometric
invite, and the `messages` thread model for support.

**Tech Stack:** Next.js (App Router, RSC), Drizzle + Postgres, Clerk, Vitest,
Playwright, Tailwind, the in-repo i18n dictionaries.

**Spec:** `docs/client-brief.md` (intent),
`docs/superpowers/specs/2026-08-26-toplance-prd-build-design.md` (scope), and the
8 September review write-up at
<https://claude.ai/code/artifact/be37b0af-528a-4a13-9b26-dc24033774ad>.

## Global Constraints

- **Ten locales, always.** `LOCALES` in `src/lib/i18n/locales.ts` is `en ha yo ig fr
  pt sw ar tw zu`. Every dictionary entry is a complete `L`; a missing locale is a
  type error. Copy tasks below give the English string only — translate the rest.
- **Destructive controls confirm first**, through
  `src/components/shared/confirm-dialog.tsx`. Per `AGENTS.md`, sending a message,
  publishing and saving are *not* destructive and must not gain a dialog.
- **Analytics events are `app.object_action`**, lowercase, added to the union in
  `src/lib/analytics/events.ts` — never a bare string at the call site.
- **No schema-convention migrations.** The deviations in `AGENTS.md` (tables in
  `public`, `organisations`, `org_members`, singular `audit_log`) stay as they are.
  New tables in this plan follow the *existing* local style, not the BeOrchid target.
- **The 16px floor** on anything a traveller or admin reads, from the first-demo
  design system.
- Model-authored chat text renders through
  `src/components/app/chat-markdown.tsx`; human-authored text stays plain.

---

## Where things actually stand

Audited against `main` at 5f9e3b6 on 2026-09-08.

| # | Asked for | State | Where |
|---|---|---|---|
| 01 | Serial numbers on every table row | **Not built** | `shared/data-table.tsx` has no ordinal column |
| 02 | Pagination at the top of tables | **Not built** | `data-table.tsx:233` renders `<Pagination>` after the rows |
| 03 | Search + filters on the admin tables | **Partly** | `corridors`, `enquiries`, `invitation-table`, `client-roster` have a toolbar; `tenants`, `clients`, `colleagues`, `tenant-invites` do not |
| 04 | Stop headers wrapping so narrowly | **Not built** | page headers carry no width cap of their own |
| 05 | Invite for biometrics / interview | **Not built** | but `notify()`, `notifyAgency()`, templates and the bell all exist |
| 06 | Contact Support (agency → top admin) | **Not built** | no support surface anywhere in `src` |
| 07 | Dark-mode illustration | **Not built** | lowest priority, her words |
| 08 | Clients as parent, applications under it | **Done** | `admin-nav.ts:217-227` |
| 09 | Say the agency overview is agency-wide | **Not built** | |
| 10 | Billing history under the plan | **Done** | `agency/billing/page.tsx:223` |
| 11 | Dashboard first in the admin nav | **Done** | `ops-nav.ts:49` |
| 12 | Agencies list as a real table | **Partly** | `tenants-table.tsx` uses `DataTable` but passes no toolbar and no pagination |
| 13 | Seats → total applications processed | **Not built** | `ops/dashboard/page.tsx:133` reads `Seats bought` off `totals.seatsPurchased` |
| 14 | Clients → Agencies in the admin overview | **Partly** | nav says Agencies (`ops-nav.ts:50`); the dashboard page still says Clients (`:128`, `:156`) |
| 15 | State → Status column | **Not built** | `ops-tenants.ts:303`, `tenants-table.tsx:71` |
| 16 | Already judged → Already reviewed | **Not built** | `case-review.ts:154` |
| 17 | Inquiries → Demo requests | **Partly** | the panel already says "Demo requests" (`ops-enquiries.ts:68`); the nav and heading still say "Enquiries" |
| 18 | Name the document that is still needed | **Not built** | |
| 19 | Bulk document download | In flight | pre-existing work, not re-planned here |
| 20 | Peace can sign in / is an ops admin | **Blocked** | see Task 1 |
| 21 | Director-only visa-rule change | **Needs her decision** | see Stage 6 |
| 22 | Role-based dashboards | Deferred | she agreed |
| 23 | In-product support inquiries | Deferred | email for now; distinct from 06 |
| 24 | Organisation IDs in tables | Deferred | names are enough for the MVP |

Two findings worth carrying into the demo:

1. **The visa rules engine was never lost.** First-demo screen 16 is now
   `ops/corridors` — `corridors` (versioned, `effective_from`, review state,
   last-verified), `corridor_requirements`, `requirement-condition.tsx`, and
   `applications.corridor_id` as the version snapshot. She has never seen it because
   she has no ops account.
2. **`org_role` is already `reviewer | owner`** (`schema.ts:58`) — the director/staff
   split the first-demo sketch left as an open question. The data model is there; the
   agency-side UI that uses it is not.

---

## Stage 1 — Unblock the client

### Task 1: Give Peace a working way in

**Files:**
- Modify: `src/lib/auth/policy.ts` (only if the invite path needs a role allowance)
- Test: manual, plus `npm run test -- src/lib/data/tenants.test.ts`

This is first because it is worth more than any other task on the list: several
"missing" features are screens she has never been able to reach.

- [ ] **Step 1: Reproduce her failure**

Sign in at the staging URL with a plain address (no `+clerk_test`). Confirm no code
arrives. This is the known staging issue — see the `staging-clerk-500-handshake`
note: staging runs Clerk **test** keys, which never deliver real email.

- [ ] **Step 2: Decide the fix, and write it down**

Either point staging at Clerk live keys, or accept test keys and tell her the
`+clerk_test` / `424242` convention in writing before the demo. A workaround given
verbally on a call is not a fix — she tried on her phone and gave up.

- [ ] **Step 3: Invite her to the ops console**

Use `/ops/staff` → invite, with the work email she gave. Role `reviewer` unless she
needs user management, in which case `owner`.

- [ ] **Step 4: Verify from her side**

Open the invitation link in a clean profile; confirm `/ops/dashboard`,
`/ops/tenants` and `/ops/corridors` all render for that account.

- [ ] **Step 5: Commit any config change**

```bash
git add -A && git commit -m "fix: staging auth path for client review access"
```

---

## Stage 2 — Shared table mechanics

Both tasks land in one file and are inherited by every table in both consoles.

### Task 2: Serial numbers on every row

**Files:**
- Create: `src/lib/domain/row-number.ts`
- Create: `src/lib/domain/row-number.test.ts`
- Modify: `src/components/shared/data-table.tsx`
- Modify: `src/lib/i18n/admin-console.ts`

**Interfaces:**
- Produces: `rowOffset(pagination?: { page: number; size: number }): number`
- Produces: `DataTable` prop `numbered?: boolean`

- [ ] **Step 1: Write the failing test**

`src/lib/domain/row-number.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { rowOffset } from "./row-number";

describe("rowOffset", () => {
  it("starts at zero when the table does not page", () => {
    expect(rowOffset(undefined)).toBe(0);
  });

  it("starts at zero on the first page", () => {
    expect(rowOffset({ page: 1, size: 25 })).toBe(0);
  });

  it("continues the count across pages", () => {
    expect(rowOffset({ page: 3, size: 25 })).toBe(50);
  });

  it("refuses to go negative on a nonsense page number", () => {
    expect(rowOffset({ page: 0, size: 25 })).toBe(0);
    expect(rowOffset({ page: -4, size: 25 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test -- src/lib/domain/row-number.test.ts
```

Expected: FAIL — cannot resolve `./row-number`.

- [ ] **Step 3: Write the helper**

`src/lib/domain/row-number.ts`:

```ts
/**
 * Where a page's row numbering starts.
 *
 * Row 1 of page 3 is row 51, not row 1. A reader counting rows is
 * counting the whole table, so the ordinal has to survive paging — a
 * column that restarts at 1 on every page is worse than no column,
 * because it looks like a count and is not one.
 *
 * A page number out of the URL can be anything, so a nonsense value
 * falls back to the start rather than producing negative ordinals.
 */
export function rowOffset(pagination?: { page: number; size: number }): number {
  if (!pagination) return 0;
  return Math.max(0, (pagination.page - 1) * pagination.size);
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm run test -- src/lib/domain/row-number.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Add the column heading to the dictionary**

In `src/lib/i18n/admin-console.ts`, add to the type block and the object:

```ts
  /** The ordinal column's heading. A bare "#" in every locale — it is a
   *  symbol, not a word, and translating it would only make it strange. */
  ordinalHeading: L;
```

```ts
  ordinalHeading: {
    en: "#", ha: "#", yo: "#", ig: "#", fr: "#",
    pt: "#", sw: "#", ar: "#", tw: "#", zu: "#",
  },
```

- [ ] **Step 6: Render the column in `DataTable`**

Add `numbered` to the props (default `false`, so no existing caller changes
behaviour until it opts in), import `rowOffset`, then:

```tsx
  const offset = rowOffset(pagination);
```

In `<TableHeader>`, before `columns.map`:

```tsx
              {numbered && (
                <TableHead className="w-12 text-end">
                  {ADMIN_CONSOLE.ordinalHeading[locale]}
                </TableHead>
              )}
```

In the body, change `rows.map((row) =>` to `rows.map((row, i) =>` and add, before
`columns.map`:

```tsx
                {numbered && (
                  <TableCell className="num t-muted text-end">{offset + i + 1}</TableCell>
                )}
```

- [ ] **Step 7: Turn it on everywhere**

Pass `numbered` from every `DataTable` caller:
`components/ops/tenants-table.tsx`, `clients-table.tsx`, `colleagues-table.tsx`,
`corridors-table.tsx`, `enquiry-table.tsx`, `tenant-invites-table.tsx`,
`components/agency/client-roster.tsx`, `components/shared/invitation-table.tsx`.

The two bespoke tables — `components/agency/team-roster.tsx` and
`components/shared/invitation-roster.tsx` — do not use `DataTable`. She said
"everywhere there's a table", so add a plain `#` column to each by hand.

- [ ] **Step 8: Verify in the browser**

```bash
npm run dev
```

Open `/ops/tenants` and `/ops/corridors`. Confirm the first column counts 1, 2, 3…
and that page 2 of corridors starts at 26, not 1.

- [ ] **Step 9: Commit**

```bash
git add src/lib/domain/row-number.ts src/lib/domain/row-number.test.ts \
  src/components src/lib/i18n/admin-console.ts
git commit -m "feat: number the rows in every table"
```

### Task 3: Move the pager above the rows

**Files:**
- Modify: `src/components/shared/data-table.tsx:225-245`

Her reason: the pager sits below a long page header and a long table, so nobody
finds it. Scrolling inside the table body stays as it is.

- [ ] **Step 1: Move the block**

Cut the `{pagination && …}` block from the end of the `<Panel>` and paste it
immediately after the `{toolbar && …}` block, so the order reads header → toolbar →
pager → table → footer. Change the pager's className from `border-t` to `border-b`:

```tsx
      {pagination && !isEmpty && !isNoMatch && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={total}
          size={pagination.size}
          basePath={basePath}
          params={params}
          locale={locale}
          className="border-b border-border px-5 py-4 sm:px-6"
        />
      )}
```

- [ ] **Step 2: Correct the `footer` prop's doc comment**

It currently says "the pager is already the row below this one", which stops being
true. Replace that sentence with: "Not a place for controls: the pager is the row
above the table, not below this one."

- [ ] **Step 3: Verify**

Open `/ops/corridors`. The pager sits under the search row, above the column
headings; paging still works; the footer note on `/ops/dashboard` still renders
under its table.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/data-table.tsx
git commit -m "feat: put the pager above the rows it pages"
```

---

## Stage 3 — Search and paging for the bare tables

### Task 4: Give the agencies table a toolbar and a pager

**Files:**
- Create: `src/lib/domain/tenant-table.ts`
- Create: `src/lib/domain/tenant-table.test.ts`
- Modify: `src/app/[locale]/ops/tenants/page.tsx`
- Modify: `src/components/ops/tenants-table.tsx`
- Modify: `src/lib/i18n/ops-tenants.ts`

**Interfaces:**
- Consumes: `readSort`, `readDir`, `resolvePage`, `sortRows` from
  `src/lib/domain/sorting.ts`; `TenantRow` from `src/lib/data/tenants.ts`
- Produces: `TENANT_SORTS`, `tenantMatches(row, q, state)`, `tenantSortKey(row, sort)`

Follow `src/lib/domain/corridor-table.ts` and
`src/app/[locale]/ops/corridors/page.tsx` exactly — that page is the worked example
for this shape, down to the `searchParams` type.

- [ ] **Step 1: Write the failing test**

`src/lib/domain/tenant-table.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { tenantMatches } from "./tenant-table";

const row = { name: "Sahara Travel", domain: "sahara.ng", state: "live" };

describe("tenantMatches", () => {
  it("keeps every row when nothing is typed", () => {
    expect(tenantMatches(row, "", "")).toBe(true);
  });

  it("matches on the agency name, case-insensitively", () => {
    expect(tenantMatches(row, "sahara", "")).toBe(true);
    expect(tenantMatches(row, "SAHARA", "")).toBe(true);
  });

  it("matches on the domain, because that is what an operator remembers", () => {
    expect(tenantMatches(row, "sahara.ng", "")).toBe(true);
  });

  it("rejects a row the search does not name", () => {
    expect(tenantMatches(row, "kano", "")).toBe(false);
  });

  it("narrows by state when one is set", () => {
    expect(tenantMatches(row, "", "live")).toBe(true);
    expect(tenantMatches(row, "", "suspended")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test -- src/lib/domain/tenant-table.test.ts
```

Expected: FAIL — cannot resolve `./tenant-table`.

- [ ] **Step 3: Write the module**

`src/lib/domain/tenant-table.ts`:

```ts
import type { SortDir } from "./sorting";

export const TENANT_SORTS = ["agency", "state", "members", "applications"] as const;
export type TenantSort = (typeof TENANT_SORTS)[number];

type Searchable = { name: string; domain: string | null; state: string };

/**
 * Whether one agency survives the toolbar.
 *
 * Name *and* domain, because an operator arriving from an email
 * remembers the domain and not always the trading name. An empty query
 * or an empty state is "no opinion" rather than "match nothing" — the
 * toolbar's default has to show the whole table.
 */
export function tenantMatches(row: Searchable, q: string, state: string): boolean {
  const needle = q.trim().toLowerCase();
  const hay = `${row.name} ${row.domain ?? ""}`.toLowerCase();
  if (needle && !hay.includes(needle)) return false;
  if (state && row.state !== state) return false;
  return true;
}

export function tenantSortKey(
  row: { name: string; state: string; members: number; applications: number },
  sort: TenantSort
): string | number {
  switch (sort) {
    case "state":
      return row.state;
    case "members":
      return row.members;
    case "applications":
      return row.applications;
    default:
      return row.name;
  }
}

export const TENANT_SORT_DEFAULT: TenantSort = "agency";
export const TENANT_DIR_DEFAULT: SortDir = "asc";
```

If `TenantRow`'s field names differ from `members` / `applications`, rename to match
the row rather than adapting the row — `src/lib/data/tenants.ts` is the source of
truth for that shape.

- [ ] **Step 4: Run it and watch it pass**

```bash
npm run test -- src/lib/domain/tenant-table.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Read the query string on the page**

In `src/app/[locale]/ops/tenants/page.tsx`, add the `searchParams` prop with
`q`, `state`, `sort`, `dir`, `page`, `size` (copy the type from the corridors page),
then filter → sort → slice with `tenantMatches`, `sortRows` and `resolvePage`,
and pass `rows`, `sort`, `dir`, `params`, `total`, `unfilteredTotal` and
`pagination` down to `<TenantsTable>`.

- [ ] **Step 6: Accept the new props in the table**

Widen `TenantsTable`'s props to take `sort`, `dir`, `params`, `total`,
`unfilteredTotal`, `pagination`, and pass them through to `DataTable` alongside a
`toolbar` with a search placeholder and a state filter (`live`, `suspended`).
Add `searchPlaceholder` and `anyState` to `OPS_TENANTS`, ten locales each.

- [ ] **Step 7: Verify**

`/ops/tenants?q=sah` narrows the table; `?state=suspended` narrows it; the pager
appears above the rows; the row numbers keep counting across pages.

- [ ] **Step 8: Commit**

```bash
git add src/lib/domain/tenant-table.ts src/lib/domain/tenant-table.test.ts \
  "src/app/[locale]/ops/tenants/page.tsx" src/components/ops/tenants-table.tsx \
  src/lib/i18n/ops-tenants.ts
git commit -m "feat: search, sort and page the agencies table"
```

### Task 5: The same for the three remaining bare tables

**Files:**
- Modify: `src/components/ops/clients-table.tsx` + `src/app/[locale]/ops/dashboard/page.tsx`
- Modify: `src/components/ops/colleagues-table.tsx` + `src/app/[locale]/ops/staff/page.tsx`
- Modify: `src/components/ops/tenant-invites-table.tsx` + its page
- Modify: `src/components/agency/client-roster.tsx` (has a toolbar, needs a pager)

- [ ] **Step 1: `clients-table.tsx` — the ops dashboard's agencies panel**

Create `src/lib/domain/ops-client-table.ts` with
`opsClientMatches(row: { name: string; invited: number; applicants: number }, q: string): boolean`
— trimmed, lower-cased substring match on `name`, `true` on an empty query — and a
test file asserting those three cases. Thread `q`, `sort`, `dir`, `page` and `size`
through `src/app/[locale]/ops/dashboard/page.tsx:293-320` and pass `toolbar` and
`pagination` to `DataTable`. Note this panel already computes `dormant` for its
`footer`; that count is of *all* clients and must not change when a search narrows
the rows, or the footer starts contradicting the table.

- [ ] **Step 2: `colleagues-table.tsx` — ops staff**

Create `src/lib/domain/colleague-table.ts` with
`colleagueMatches(row: { name: string; email: string; role: string }, q: string, role: string): boolean`
— name or email substring, plus an exact `role` filter with `""` meaning any — and
its test. Wire `src/app/[locale]/ops/staff/page.tsx` the same way. The filter's
options are the two `staff_role` values, `reviewer` and `owner`, labelled from
`OPS_COMMON` (which already carries "reviewer" and "director").

- [ ] **Step 3: `tenant-invites-table.tsx` — invitations to an agency**

```bash
grep -rn "TenantInvitesTable" src/app
```

Wire whichever page that names, with
`src/lib/domain/tenant-invite-table.ts` exporting
`tenantInviteMatches(row: { email: string; status: string }, q: string, status: string): boolean`
— email substring plus an exact status filter — and its test.

- [ ] **Step 4: `client-roster.tsx` — the agency's own clients**

This one already has a toolbar; it needs only a pager. In
`src/app/[locale]/agency/clients/page.tsx`, read `page` and `size` with
`resolvePage`, slice the rows, and pass `pagination` down. No new domain module.

- [ ] **Step 5: Run the whole domain suite**

```bash
npm run test -- src/lib/domain
```

Expected: PASS.

- [ ] **Step 6: Commit each table separately**

One commit per table, so a reviewer can reject one without the others.

---

## Stage 4 — Copy and naming

### Task 6: The rename pass

**Files:**
- Modify: `src/lib/i18n/case-review.ts:153-155`
- Modify: `src/lib/i18n/agency.ts:555-557`
- Modify: `src/lib/i18n/ops-tenants.ts:303`
- Modify: `src/lib/i18n/ops-common.ts` (`nav.enquiries`, `nav.staff`)
- Modify: `src/lib/i18n/ops-enquiries.ts:43-45`
- Modify: `src/app/[locale]/ops/dashboard/page.tsx:115,128,133,156`
- Modify: `src/lib/data/dashboard.ts:84-91,208-215`

Ten locales per string. English below; translate the rest.

- [ ] **Step 1: The pure label changes**

| File | Key | From | To |
|---|---|---|---|
| `case-review.ts` | `docSets.alreadyJudged` | Already judged | Already reviewed |
| `agency.ts` | `invitationsLabel` | Invitations | Client invitations |
| `ops-tenants.ts` | `tableHead.state` | State | Status |
| `ops-common.ts` | `nav.enquiries` | Enquiries | Demo requests |
| `ops-common.ts` | `nav.staff` | Colleagues | Team |
| `ops-enquiries.ts` | `heading` | Enquiries | Demo requests |

Rename the `alreadyJudged` *key* to `alreadyReviewed` as well — leaving the old name
on the new string is how the next reader learns the wrong word. Update
`src/app/[locale]/agency/clients/[id]/page.tsx:104` and the type block in
`case-review.ts:22` with it.

- [ ] **Step 2: Add the metric she actually asked for**

"Seats bought" cannot simply be relabelled "applications processed" — it reads
`totals.seatsPurchased`, which is a different number. Add a real one in
`src/lib/data/dashboard.ts`: in the `totals` type block (line 84) add
`applicationsProcessed: number;`, and in the returned object (line 208):

```ts
      applicationsProcessed: applicationRows.filter((a) => a.status !== "draft").length,
```

A draft is a file somebody started and never sent; counting it as processed work
would overstate the platform's throughput to the person deciding whether it is
working.

- [ ] **Step 3: Relabel the dashboard**

In `src/app/[locale]/ops/dashboard/page.tsx`:

- line 115 `lead`: "clients" → "agencies"
- line 128 `label: "Clients"` → `label: "Agencies"`
- line 133 `label: "Seats bought", value: data.totals.seatsPurchased` →
  `label: "Applications processed", value: data.totals.applicationsProcessed`
- line 156 tab `label: "Clients"` → `label: "Agencies"`

Leave the per-agency seats column alone: she explicitly kept it. *"Seats can stay
on this table because it makes sense to be able to track how many team members are
active per organization."*

- [ ] **Step 4: Kill the seats/members double-naming**

In the agency detail view, `members` and `seats` name the same quantity in adjacent
columns. Keep **seats** (the capped figure, "14 of 25") and drop the second column,
or keep **members** and drop seats — one word per concept. This one is worth
confirming with her on Wednesday before deleting a column.

- [ ] **Step 5: Say that the agency overview is agency-wide**

Role-based dashboards are deferred, so the current numbers must not read as
personal. Add to `AGENCY` and render under the overview heading:

```ts
  overviewScope: {
    en: "These figures cover the whole agency, not your own cases.",
    // …nine more locales
  },
```

- [ ] **Step 6: Typecheck, test, verify**

```bash
npm run typecheck && npm run test
```

Then open `/ops/dashboard`, `/agency`, `/agency/clients/[id]` and confirm each new
string renders in English and in one RTL locale (`/ar/ops/dashboard`).

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n src/lib/data/dashboard.ts "src/app/[locale]"
git commit -m "feat: rename the labels the client read back to us"
```

### Task 7: Stop the headers wrapping into a column

**Files:**
- Modify: `src/components/shared/admin-shell.tsx` (or wherever page headers set their width)
- Modify: `src/components/shared/setup-notice.tsx` and the agency overview notice strips

Her complaint was mechanical: a heading and its blurb wrap into a narrow column, so
the page grows downward and the table starts below the fold.

- [ ] **Step 1: Find every width cap on a heading block**

```bash
grep -rn "max-w-\[6[0-9]ch\]\|max-w-prose\|max-w-2xl" src/components src/app | grep -v "t-muted max-w-\[62ch\]"
```

- [ ] **Step 2: Raise the cap on headings and their leads**

Page headings and their one-line leads go to the container width. Leave the 62ch
measure on *body* paragraphs — that limit is a reading rule, and removing it makes
long prose worse, which is not what she asked for.

- [ ] **Step 3: Make the notice strips collapsible**

She asked for both: full width *and* collapsible. Use a `<details>` element with the
summary as the strip's one-line version so it works without JavaScript.

- [ ] **Step 4: Verify at three widths**

1280px, 1024px and 375px. The heading fills its container at desktop widths and the
table's first rows are visible without scrolling on a 900px-tall viewport.

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "fix: let page headers use the width they have"
```

---

## Stage 5 — The two new features

### Task 8: Invite a traveller for biometrics or an interview

**Files:**
- Modify: `src/lib/db/schema.ts` (add two `notification_kind` values)
- Create: migration via `npm run db:generate`
- Modify: `src/lib/notifications/templates.ts`
- Modify: `src/lib/analytics/events.ts`
- Create: `src/components/agency/invite-attendance.tsx`
- Modify: `src/app/[locale]/agency/actions.ts`
- Modify: `src/app/[locale]/agency/clients/[id]/page.tsx`
- Modify: the traveller case view, to show the standing notice
- Create: `src/lib/domain/attendance.test.ts`

**Interfaces:**
- Consumes: `notify()` from `src/lib/notifications/notify.ts`
- Produces: server action `inviteToAttend(applicationId, kind, when, place, note)`

Her reasoning, kept here because it is the whole justification: biometric capture
happens on the government portal, which has no API. The product cannot collect the
biometrics — it has to carry the *summons*.

This is **not** a destructive control. It adds an appointment; it takes nothing away.
Per `AGENTS.md` it gets no confirm dialog.

- [ ] **Step 1: Add the notification kinds**

In `src/lib/db/schema.ts`, inside `notificationKind`:

```ts
  /**
   * → traveller: the agency needs them in person. Biometrics are captured
   * on the government's own portal and interviews happen at a consulate,
   * so neither can be done here — this is the product carrying the
   * summons, which is the only part of that step it can own.
   */
  "attendance_requested",
```

- [ ] **Step 2: Generate and run the migration**

```bash
npm run db:generate && npm run db:migrate
```

- [ ] **Step 3: Write the failing test for the message body**

`src/lib/domain/attendance.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { attendanceSummary } from "./attendance";

describe("attendanceSummary", () => {
  it("names the reason, the place and the time", () => {
    expect(
      attendanceSummary({
        kind: "biometrics",
        when: "2026-09-15T09:30:00.000Z",
        place: "Sahara Travel, 4 Awolowo Road, Lagos",
        locale: "en",
      })
    ).toContain("biometrics");
  });

  it("still reads as a sentence when no time is set", () => {
    const text = attendanceSummary({
      kind: "interview",
      when: null,
      place: "Sahara Travel, Lagos",
      locale: "en",
    });
    expect(text).not.toContain("null");
    expect(text).toContain("Sahara Travel");
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

```bash
npm run test -- src/lib/domain/attendance.test.ts
```

Expected: FAIL — cannot resolve `./attendance`.

- [ ] **Step 5: Write the helper**

`src/lib/domain/attendance.ts` exporting
`attendanceSummary({ kind, when, place, locale })`, where `kind` is
`"biometrics" | "interview"`. A null `when` means "we will confirm the time" rather
than an empty slot in the sentence — an agency often knows the place before the
appointment is booked.

- [ ] **Step 6: Run it and watch it pass**

```bash
npm run test -- src/lib/domain/attendance.test.ts
```

- [ ] **Step 7: Add the analytics event**

In `src/lib/analytics/events.ts`, add `"toplance.attendance_requested"` to the union.

- [ ] **Step 8: Write the server action**

In `src/app/[locale]/agency/actions.ts`, add `inviteToAttend`. It must: check the
caller is a member of the agency that owns the application; write a row recording
kind, time, place and who sent it; call `notify()` with `attendance_requested`; and
`track("toplance.attendance_requested")`. `track()` never throws — do not await it in
a way that can fail the action.

- [ ] **Step 9: Add the control to the case view**

`src/components/agency/invite-attendance.tsx` — a button beside the existing status
controls opening a small form: kind (biometrics / interview), date and time
(optional), place, and a note. The button says what happens: **Ask them to come in**.

- [ ] **Step 10: Show it on the traveller's side**

Two surfaces, both of which she asked for by name: a standing notice on the
application view stating what is being asked, where and when; and the bell entry
that `notify()` already produces. The email comes from the same `notify()` call —
add the template to `src/lib/notifications/templates.ts`.

- [ ] **Step 11: Verify end to end**

```bash
npm run dev
```

As an agency reviewer, send the request on a seeded case. As that traveller, confirm
the notice on the application, the bell entry, and the queued email in the buffer.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "feat: ask a traveller to come in for biometrics or an interview"
```

### Task 9: Contact Support — agency to top admin

**Files:**
- Modify: `src/lib/db/schema.ts` (`support_requests`)
- Create: `src/app/[locale]/agency/support/page.tsx`
- Create: `src/app/[locale]/ops/support/page.tsx`
- Create: `src/components/ops/support-table.tsx`
- Modify: `src/components/shared/admin-nav.ts`, `src/components/ops/ops-nav.ts`
- Modify: `src/lib/analytics/events.ts`
- Create: `src/lib/i18n/support.ts`

The shape agreed on the call: a tab in the agency console that sends a message; it
lands in the ops console as a queue that can be claimed and resolved.

- [ ] **Step 1: Add the table**

In `src/lib/db/schema.ts`, following the *local* conventions (plural, snake_case,
`public` schema, Clerk user ids as text):

```ts
export const supportState = pgEnum("support_state", ["open", "claimed", "resolved"]);

export const supportRequests = pgTable("support_requests", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid().notNull().references(() => organisations.id, { onDelete: "cascade" }),
  raisedBy: text().notNull(),
  subject: text().notNull(),
  body: text().notNull(),
  state: supportState().notNull().default("open"),
  claimedBy: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp({ withTimezone: true }),
});
```

- [ ] **Step 2: Generate and run the migration**

```bash
npm run db:generate && npm run db:migrate
```

- [ ] **Step 3: Build the agency side**

`/agency/support` — subject, body, send. Sending is not destructive: no confirm
dialog. On success, `notifyStaff()` and a toast that says **Sent**. Below the form,
the agency's own past requests with their state, so nobody sends the same thing
twice.

- [ ] **Step 4: Build the ops side**

`/ops/support` — a `DataTable` with `numbered`, a toolbar filtering by state, and
per-row **Claim** and **Mark resolved**. Neither is destructive; both commit on the
click.

- [ ] **Step 5: Add both nav entries**

Agency: under the team group. Ops: beside Demo requests.

- [ ] **Step 6: Add the analytics events**

`"toplance.support_requested"`, `"toplance.support_claimed"`,
`"toplance.support_resolved"`.

- [ ] **Step 7: Verify**

As an agency owner, send a request; as ops, see it, claim it, resolve it; as the
agency, see the state change.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: let an agency reach the top admin"
```

---

## Stage 6 — Needs her answer before it is built

### Task 10: Name the document that is still needed

**Files:**
- Modify: the traveller application view
- Modify: `src/lib/i18n/documents.ts`

The portal says "additional document needed" beside a 100% progress figure. She
called the contradiction out; the fix is to name the document.

- [ ] **Step 1: Read the flagged rows**

The reason model already exists (`flag_reason`, `flag-reason.ts`). Render the
flagged document's name and its reason where the bare status is shown now.

- [ ] **Step 2: Make the percentage honest**

A checklist with an outstanding request is not at 100%. Either exclude flagged
documents from the numerator or show "1 item needs attention" instead of a
percentage while any flag is open.

- [ ] **Step 3: Verify, then commit**

```bash
git add -A && git commit -m "fix: name the document that is holding a case up"
```

### Task 11: Director-only visa-rule change — write the spec, do not build yet

**Files:**
- Create: `docs/superpowers/specs/2026-09-09-case-level-rule-override.md`

**Do not implement this before Wednesday.** Her request and the system's shape
disagree, and the disagreement is worth ten minutes of her time rather than a week
of yours.

She asked that a director be able to update a visa rule manually when the fee or the
required documents change. The corridors engine is deliberately the opposite:
central reference data, versioned, immutable once published, snapshotted per
application, so a mid-flight change cannot silently invalidate someone's checklist.
An agency editing a published corridor would change it for every other agency using
it.

- [ ] **Step 1: Write the spec for a case-level override**

The application keeps its corridor version. A director — `org_role = 'owner'` —
amends the fee or adds/removes a required document **for that case only**. The
traveller sees the change and why. `audit_log` records who did it. Nothing about
the shared corridor moves.

- [ ] **Step 2: Put both options to her on Wednesday**

Case-level override (recommended, above) versus agency-local corridor forks
(more faithful to what she described, much more to maintain, and it splits the
reference data the product's accuracy depends on).

- [ ] **Step 3: Plan the build after she chooses**

---

## Stage 7 — Last

### Task 12: Dark-mode illustration

**Files:**
- Modify: the hero illustration component and its asset

Her words: *"that's like the least priority right now."* It is here, at the end,
because she raised it and it should not be silently dropped — not because it should
be done early.

- [ ] **Step 1: Give the illustration a dark variant**

Not a transparent background — she rejected that explicitly. A dark-mode
background that belongs to the dark theme.

- [ ] **Step 2: Verify in both themes, then commit**

```bash
git add -A && git commit -m "feat: give the hero illustration a dark-mode ground"
```

---

## Before the demo

- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Walk both consoles and the traveller portal in `en` and `ar`
- [ ] Confirm Peace can sign in, and is an admin on the ops console
- [ ] Open `/ops/corridors` with her — it is the visa rules engine she has been
      asking after, and she has never seen it

## Explicitly out of scope

Deferred with her agreement on 8 September: role-based dashboards (director
agency-wide vs staff own-account), in-product customer-support inquiries,
organisation IDs surfaced in tables. Bulk document download is pre-existing
in-flight work and is not re-planned here.
