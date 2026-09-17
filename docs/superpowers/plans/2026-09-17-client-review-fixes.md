# Client Review 17 Sep 2026 — Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every item in Peace's written review of staging (`Toplance Review 17_09_2026.pdf`, 7 pages, 10 screenshots), and verify each fix on **every table and instance** it applies to — the review says explicitly that most issues recur and asks for confirmation across all of them.

**Source:** `~/Downloads/Toplance Review 17_09_2026.pdf`. Screens reviewed: `staging.toplance.ca` home, `/ops/kyb`, `/ops/tenants`, `/ops/tenants/[id]`, `/ops/enquiries`, `/ops/dashboard`, `/ops/corridors`.

**Baseline:** every file:line below was read against **`98f12fd`** (`main`, PR #139). Re-check line numbers if `main` has moved.

**Blocker called out by the client:** the Create-agency modal cannot be completed, which *"prevented me from completing the end-to-end test across the 3 use cases. Let me know once you solve this."* Phase 0 ships on its own, first, so they can resume testing while the rest is in progress.

---

## Global Constraints

- **Ten locales per string** (`en, ha, yo, ig, fr, pt, sw, ar, tw, zu`). Records are exhaustive by type. Non-English values keep the `NEEDS NATIVE REVIEW` caveat.
- **Ops dashboard labels are hard-coded English** in `src/app/[locale]/ops/dashboard/page.tsx:123-153, 423-454` — not i18n. Renames there are edits to that file. Moving them into i18n is optional and out of scope unless it's free.
- **Destructive controls confirm** (`AGENTS.md`). Nothing here adds one. Moving "Create agency" into a kebab menu does not change that (it is additive).
- **Mobile responsiveness is required on the traveller-facing side only** (public site + `/app/*` + auth + invite + checkout). Ops and agency consoles need desktop only.
- **Gate for every task:** `npm run typecheck && npm run test && npm run lint`. Take a baseline first — `curated.test.ts` fails locally only.
- **Worktrees have no `node_modules`** — symlink it before running the gate.
- **Branching:** one branch + PR per phase. Never commit on `main`; `main` requires signed commits + PR.

---

## What the client flagged as a repeat — and why it came back

Say this plainly in the reply, so it does not happen a third time.

| Item | Why it came back |
|---|---|
| "State" → "Status" | Round 2 (item 15) renamed `ops-tenants.ts` and `ops-kyb.ts` only. `ops-corridors.ts:276-286` (`tableHead.state`) and `:350` (`Any state`) were never in scope. |
| "Past SLA" → "Overdue" | The only occurrence is hard-coded English at `ops/dashboard/page.tsx:434`, outside the i18n files the earlier grep covered. The "Overdue" dictionary that was written (`src/lib/i18n/ops-queue.ts:108-121`) is imported nowhere. |
| Table vs page scroll | Our own plans kept the inner scroll deliberately (round-2 plan l.315, demo-5 plan l.379). It was never actually removed. |
| Collapsed-rail logo | Demo-5 Task 7 planned it; commit `f12f337` never touched `admin-sidebar.tsx`. |
| Status select padding | Row selects (`enquiry-table.tsx:52`) and header selects (`table-toolbar.tsx:127-141`) are two separate class strings. |
| Nav bubbles | Never written into any spec — lived only in the call. |

**Process fix:** Phase 7 ends with a grep-based checklist (below) run against the whole repo, not a spot-check of the screen in the screenshot.

---

## Decisions needed before building

Recommended defaults are marked **(rec)**. Items marked 🟠 need Peace's word; the rest are ours.

| # | Question | Options | Blocks |
|---|---|---|---|
| D1 🟠 | **Agency lifecycle status.** Today ops shows only Live/Suspended, derived from `suspendedAt` alone. | Single derived status: **Suspended → Onboarding (KYB) → Awaiting payment → Live → Lapsed** **(rec)** | Task 4.1 |
| D2 | Staging agencies backfilled as "activated" by migration `0037` with a 0/6 KYB checklist | Treat as Onboarding by requiring KYB complete, **or** leave and reset staging data **(rec: reset — pre-launch)** | Task 4.1 |
| D3 🟠 | **Overdue has no definition.** `sla_due_at` is never written, so "Past SLA" is always 0. | **Open application waiting on the reviewer (submitted / under_review / awaiting_decision) for more than 5 days** **(rec — matches the orphaned `ops-queue.ts` copy)**; or write `sla_due_at` on submit | Task 4.3 |
| D4 🟠 | "Av. Timeline": client says *average*, from *submission* to *approved visa*. Code is **median**, over **approved + rejected**, from the **last** resubmission. | Follow client: **mean, approved only, from first submission** **(rec)**. Needs `first_submitted_at` or read it from audit/transitions. | Task 4.3 |
| D5 | "Open Applications / still in review" currently includes `collecting_documents` and `additional_documents` (traveller's turn) | **Drop those two so the subtext is true** **(rec)**, or keep and change subtext | Task 4.2 |
| D6 🟠 | Who may reassign a demo request? Client says "the Director". Today **any** staff member can. | **Any staff: Unassigned / Assign to me. Owner only: assign to someone else** **(rec)** | Task 5.1 |
| D7 | Font: dotted zero is IBM Plex Mono, applied by `.num` / `.tag`. The design guideline had mono on marketing only; `4baa1b3` moved it into the product. | **Keep Plex; product screens drop mono — numbers in Plex Sans with `tabular-nums`, eyebrow labels in the sans `special-caps` style** **(rec)** | Task 3.3 |
| D8 | Collapsed rail on the **agency** console: Toplance pin or agency's own logo? | **Agency's uploaded logo if present, else the Toplance pin** **(rec)**; ops always the pin | Task 3.2 |
| D9 | One date format "that takes the least space while staying intuitive" | **`10 Sep 2026`** for dates, **`10 Sep 2026, 14:28 GMT+4`** with time **(rec)**. ISO `2026-09-10` is 1 char shorter but less intuitive. | Task 2.5 |
| D10 | Travellers card per client = count of **approved** applications, subtext "across board" | Follow client **(rec)**. The current number (all traveller *accounts*) is not shown anywhere else — fine to drop. | Task 4.2 |

---

# Phase 0 — Unblock the client's end-to-end test (ship alone, today)

### Task 0.1: Dialogs fit the viewport

**Root cause:** `src/components/ui/dialog.tsx:35` centres with `top-1/2 -translate-y-1/2` and has **no max-height or overflow**. A form taller than the window spills off both ends; scroll-lock stops the page scrolling; the close ✕ (`:42-47`, positioned inside the box) is off-screen too. One primitive, so one fix covers both screenshots (site demo form, ops Create agency).

**Files:**
- Modify: `src/components/ui/dialog.tsx`
- Modify (remove now-redundant local patches): `src/components/agency/invite-attendance.tsx:97`, `src/components/agency/request-document.tsx:88`
- Adopt the new body/footer slots: `src/components/site/demo-dialog.tsx`, `src/components/ops/provision-tenant.tsx`, `src/components/ops/invite-staff.tsx`, `src/components/agency/invite-dialog.tsx`

- [ ] **Step 1:** `DialogContent` becomes `flex flex-col max-h-[calc(100dvh-2rem)]` (no `overflow` on the box). Header stays pinned at the top with the ✕ in it; add a `DialogBody` (`min-h-0 flex-1 overflow-y-auto`) and make `DialogFooter` pinned at the bottom. Result: title + ✕ + primary CTA always visible; only fields scroll.
- [ ] **Step 2:** Move each long dialog's fields into `DialogBody` and its submit (and Cancel) into `DialogFooter`. Demo dialog: submit + Cancel **side by side** (client rule on button pairs).
- [ ] **Step 3:** Verify every dialog at **1280×720**, **1920×950** (the client's viewport), and **375×667**: demo dialog, provision-tenant, invite-staff, invite-dialog (both form and sent views), invite-attendance, request-document, ask-about-case, upload-outcome-dialog, a `ConfirmDialog`. Also the site mobile menu (`site-nav.tsx:282`) in landscape phone.
- [ ] **Step 4:** Complete the Create agency flow end to end on the preview; screenshot for the reply.

**Done when:** on a 950px-tall window both screenshots' dialogs show title, ✕ and CTA without scrolling the page.

---

# Phase 1 — Copy and renames (low risk, high visibility)

### Task 1.1: "Console" → "Workspace", everywhere

Occurrences found in user-facing copy (English): `billing.ts` 9, `ops-staff.ts` 8, `agency.ts` 2 (incl. page title "Organisation console" `:164`), `invite.ts` 2, `admin-console.ts` 1 (`menuTitle` `:91`), `errors.ts` 1, `auth-pages.ts` 1, `ops-kyb.ts` 1 (the KYB intro in the screenshot, `:79`), `ops-tenants.ts` 1, `site-travelers.ts` 1. Hard-coded: `src/lib/notifications/templates.ts:482-531` (**email subjects/bodies**), `ops/error.tsx:45`, `components/ops/refusal.tsx:16,99`, `components/ops/kyb-checklist.tsx:278,309`.

- [ ] Replace in all ten locales. fr/pt/tw/ig use "console"/"consola" literally; ar and others use their own word — translate "workspace" rather than grep-replace.
- [ ] **Do not rename code identifiers** (`ADMIN_CONSOLE`, `agency/console.ts`, `requireAgencyConsole`, `cache/consoles`). No URL contains "console".
- [ ] Check: `grep -rniE "\bconsoles?\b" src/lib/i18n src/lib/notifications src/components src/app --include=*.ts --include=*.tsx | grep -v "console\.\(log\|error\|warn\)"` → only identifiers/comments remain.

### Task 1.2: "State" → "Status" on every table header and filter

- [ ] `src/lib/i18n/ops-corridors.ts:276-286` `tableHead.state` → Status wording from `ops-tenants.ts:391`, ten locales.
- [ ] `ops-corridors.ts:350` "Any state" → "Any status" (match `anyStatus` elsewhere).
- [ ] Check: `grep -rn 'en: "State"' src/lib/i18n` and `grep -rni "any state" src/lib/i18n` → no hits.

### Task 1.3: "Past SLA" → "Overdue"

- [ ] `ops/dashboard/page.tsx:434` label → "Overdue". (The counting fix is Task 4.3.)
- [ ] Check: `grep -rn "SLA" src --include=*.tsx --include=*.ts | grep -v slaDueAt` → no user-facing hits.

### Task 1.4: Ops dashboard card copy

`src/app/[locale]/ops/dashboard/page.tsx:123-153, 423-454` (hard-coded):
- [ ] Travellers subtext "0 came directly" → "across board" (value fix in Task 4.2).
- [ ] "Open cases" / "somebody still has work to do" → **"Open applications" / "still in review"** (it counts applications — `OPEN_STATUSES`, `kpis.ts:279-287` — not support tickets).
- [ ] "To decision" / "median, from submission" → **"Av. timeline" / "submission to decision"**.

### Task 1.5: Tables — titles and demo-request columns

- [ ] `ops-tenants.ts:238` `tenantsPanel` "Every agency" → "Agencies". Also the hard-coded "Every agency, busiest first" at `components/ops/clients-table.tsx:174` → "Agencies".
- [ ] `ops-enquiries.ts:125-136` `head.requested` "Requested" → "Logged"; `:137-148` `head.preferred` "Preferred time" → "Demo time". Sort URL keys stay `requested`/`preferred`.

### Task 1.6: Marketing site — dashboard section

`src/app/[locale]/(site)/page.tsx:562-629`, strings in `src/lib/i18n/site-home.ts`.

- [ ] `SITE_HOME.dashboardCardTitle` (`:277-288`) → *"We curate the files. You see the progress."*
- [ ] `SITE_HOME.dashboardCardBody` (`:289-300`) → *"Passports, bank statements, police certificates — each one checked the moment it lands, so problems are caught early, and your team reviews a clean, complete pack instead of chasing documents."*
- [ ] CTA `talkToUsAboutTravelers` (`:265-276`) → **"Request a demo"**, and make it open `DemoDialog` (it links to `/agency/sign-up` today). `DemoDialog` needs `label`/`variant` props — its trigger is hard-coded (`demo-dialog.tsx:165`).
- [ ] "Agency sign-in" beneath it: `variant="tertiary"` → `variant="secondary"` (outline), **same row**. It wraps today because the column is ~490px at `xl` and the pair is ~520px: shorten the label (done above) and/or `sm:flex-nowrap`.
- [ ] Mirror on `/travelers` (`travelers/page.tsx:247-257`): outline secondary, same row.
- [ ] Ask whether `SITE_TRAVELERS.orgsCardTitle/Body` should get the same new copy (probably yes — flag in reply).

---

# Phase 2 — The shared table system (one change, every table)

Every console table goes through `src/components/shared/data-table.tsx` + `src/components/ui/table.tsx`, so these land once and are then **verified on each table** in the sweep list at the bottom of this phase.

### Task 2.1: One scroll — the page's

**Root cause:** `ui/table.tsx:71-74` wraps every table in `max-h-[var(--table-max-h)] overflow-auto overscroll-contain` (`--table-max-h: clamp(320px,60vh,640px)`, `globals.css:306`). The page scrolls too (`admin-shell.tsx:130`). `overscroll-contain` traps the wheel at the table's end, and the sticky header sticks to the inner box, not the page.

- [ ] Remove the max-height and vertical overflow from the table wrapper. The page is the only vertical scroller.
- [ ] Header sticks to the page under the app bar: `sticky top-[var(--bar-h)]` on `thead`. Requires no `overflow-hidden` ancestor — `Panel` has `overflow-hidden` (`panel.tsx:25`); change to `overflow-clip` (clips corners without breaking sticky) or clip only the corners.
- [ ] Revisit the inward focus ring in `sort-head.tsx:81-113` (it existed to survive the scroll box) — mostly moot after Task 2.3.

### Task 2.2: No horizontal scroll

Causes: content-sized columns + sideways-scroll wrapper (`#138`, `table.tsx:22-25`), `min-w-[720px]` below `lg` (`table.tsx:78`), `whitespace-nowrap` badges, wide action buttons.

- [ ] Wrapper `overflow-x` stays only as a last-resort safety net; tables must **fit at 1280px** wide with the rail expanded.
- [ ] Let text columns wrap/truncate with `title` on hover; keep numeric/status/date columns tight.
- [ ] Per-table column diet where it still overflows — demo requests is Task 5.2; support table actions (394px) collapse to a kebab like 5.2.
- [ ] Verify each table at 1280 and 1440 wide, rail expanded and collapsed, and in `ar` (RTL, longest strings).

### Task 2.3: Headers are labels; sorting moves to a control

Client: arrows are unclear, and the sorted column's darker colour (`sort-head.tsx:114`) reads as a different style.

- [ ] Table headers render as plain text: one colour, one weight (`special-caps`, `--ink-3`). No arrows, not buttons.
- [ ] Add a **"Sort" select** in the toolbar (e.g. "Newest first", "Oldest first", "Agency A–Z", "Status") built from the table's existing sortable columns and URL `sort`/`dir` params — no data-layer changes.
- [ ] Filters stay as the existing toolbar selects.

### Task 2.4: One-row toolbar, Gmail-style pager

Today (`data-table.tsx:256-299`): row 1 title + filters + search; row 2 count + rows-per-page + "Page 1 of 5" pager (split deliberately in `b5a178c`).

- [ ] Single row: **title (left) · filters + sort · search (centred) · pager (right)**.
- [ ] Pager reads **`1–25 of 104  ‹ ›`** (start from `rowOffset`, `src/lib/domain/row-number.ts`). Clicking the range opens a small menu for rows-per-page (25/50/100) — replaces `PageSizeSelect` in the header.
- [ ] Drop the "23 agencies" count line (the `#` column does that).
- [ ] Below ~1024px the row wraps: search takes full width on its own line.
- [ ] `admin-console.ts:196` gets a range string; ten locales.

### Task 2.5: One date format

No shared helper today — ISO slice in ~13 places, `dateStyle: medium` in enquiries, `en-GB` long/short in corridors, colleagues, invitations (full list in the research notes; key sites: `kyb-table.tsx:112`, `tenants-table.tsx:103`, `support-table.tsx:140`, `enquiry-table.tsx:235,250`, `domain/freshness.ts:53-58`, `colleagues-table.tsx:12-18`, `invitation-table.tsx:19-25`, `invitation-roster.tsx:26-32`, `tenant-invites-table.tsx:60,67`, `tenant-controls.tsx:146`, `client-roster.tsx:241`, `agency/support/page.tsx:97`, `shared/support-thread.tsx:64`, `kyb-checklist.tsx:278,649`, `ops/kyb/[id]/page.tsx:159`).

- [ ] Add `src/lib/format/date.ts`: `formatDate(d, locale)` → `10 Sep 2026`; `formatDateTime(d, locale, tz?)` → `10 Sep 2026, 14:28 GMT+4` (`timeZoneName: "shortOffset"`, which is DST-correct for that date). Unit-test both, including a DST boundary and `ar`.
- [ ] Replace every call site above in **tables and table-like lists**. Freshness sentences ("checked 4 September 2026") may keep long form in prose — decide per site, but table cells use the helper.
- [ ] Check: `grep -rn "toISOString().slice(0, *10)" src/components src/app` → none in rendering code.

### Task 2.6: Status pills — equal width per column, centred

`ui/badge.tsx:27` is `w-fit`; cells are left-aligned.

- [ ] `DataColumn` gets `align: "center"` + a `pill` option; the column's pills get a shared width = its longest possible label (known from the label map), e.g. via a CSS var set on the column.
- [ ] One pill per status cell: KYB's extra "Suspended" pill and corridors' extra "Live" pill fold into a single status (Tasks 4.1, 4.4).
- [ ] Apply to: tenants, kyb, corridors, support, enquiries, invitations, client-roster, colleagues, tenant-controls People, rule-sets.

### Task 2.7: Row selects match header selects

Row: `h-[var(--row-h)] px-4`, native chevron (`enquiry-table.tsx:52`). Header: `h-9 appearance-none ps-3 pe-8 font-semibold` + `ChevronDown` (`table-toolbar.tsx:127-141`). `page-size-select.tsx:64` is a third variant.

- [ ] Extract one `Select` style (header's) into a shared component; use it for header filters, row status select, assignee select. Row height stays 44px, but padding, chevron and radius match.

### Sweep list — every table, every check

Run 2.1–2.7 on each and tick: page-only scroll · no horizontal scroll at 1280 · plain headers · one-row toolbar · one date format · equal pills.

- [ ] `/ops/tenants` (tenants-table) · [ ] `/ops/dashboard` Agencies tab (clients-table) · [ ] `/ops/kyb` · [ ] `/ops/corridors` · [ ] `/ops/enquiries` · [ ] `/ops/support` · [ ] `/ops/staff` (colleagues + invitation-table) · [ ] `/ops/tenants/[id]` (tenant-invites-table, People) · [ ] `/agency/clients` (client-roster) · [ ] `/agency` rule sets (rule-sets-table) · [ ] agency team/invitation rosters (not DataTable — dates + pills only)

---

# Phase 3 — Shell, brand, type

### Task 3.1: Inline count bubbles in the expanded nav

`admin-sidebar.tsx:151-155` renders a plain grey mono number; the collapsed rail (`:139-143`) already has the brand bubble. Mobile nav `admin-mobile-nav.tsx:73-77` same as expanded.

- [ ] Expanded + mobile: right-aligned pill using the same tokens as the collapsed bubble (`bg-brand text-on-brand rounded-full`, min-width so "3" and "44" look alike). Shared `NavCount` component for all three.
- [ ] Applies to both consoles (ops and agency both render `AdminSidebar`).

### Task 3.2: Toplance icon in the collapsed rail

`admin-sidebar.tsx:58-63` draws a grey square with `title.charAt(0)`. The pin exists only inside `Wordmark` (`shared/wordmark.tsx:143-171`); asset at `public/icon/toplance-icon.svg`.

- [ ] Extract `BrandMark` (the pin SVG, `fill="var(--brand)"`) from `Wordmark`; `Wordmark` renders it.
- [ ] `AdminSidebar` takes a `railMark` node for the collapsed state; ops passes `<BrandMark />`. Agency per D8.

### Task 3.3: No dotted zeros in the product

`.num` / `.tag` (`globals.css:855-868`) switch to `--data` = Plex Mono (`:622`), whose zero is dotted. Used in KPI values, counter labels, `#` column, nav counts, "0 / 6", tenants numbers, some badges.

- [ ] Per D7: on product screens `.num` = Plex Sans + `font-variant-numeric: tabular-nums` (keeps columns aligned, plain zero). Counter labels move from `.tag` to the sans caps label style.
- [ ] Marketing site may keep mono (it's the guideline's original split) — check with Peace's reply whether the site's dotted zeros bother them too.
- [ ] Check visually: `/ops/dashboard`, `/ops/tenants/[id]`, `/ops/kyb`, sidebar counts.

### Task 3.4: One typescale for overview cards

Two components: `CounterRow` (`shared/counter-row.tsx:80`, uppercase label — dashboard, tenant detail) and `KpiRow/KpiBody` (`shared/kpi-card.tsx:40`, `t-muted` sentence case with icon chip — `/ops/tenants`, `/ops/corridors`, `/agency`). Traveller requirements stats use a third style (`requirements/page.tsx:508`).

- [ ] Client asks for the **dashboard style** everywhere. Make `KpiBody`'s title use the same label class as `CounterRow` (after 3.3's font change), value the same size/weight. Keep icons only if they fit that hierarchy.
- [ ] Apply to `/ops/tenants`, `/ops/corridors`, `/agency` dashboard; check traveller requirements stats for consistency.

---

# Phase 4 — Numbers and states that are wrong, not just worded wrong

### Task 4.1: An agency can't be "Live" and "Unpaid"

Today ops shows `suspendedAt ? Suspended : Live` (`ops/tenants/[id]/page.tsx:212-216`, `tenants-table.tsx:88-97`, filter `domain/tenant-table.ts:39-40`) and ignores activation and payment. The agency-facing gate already combines all three (`decideAgencyBilling`, `src/lib/payments/gates.ts:22-40`). KYB table shows "Activated" at 0/6 because `activatedAt` wins (`domain/kyb.ts:148-158`) and migration `0037` backfilled it.

- [ ] Add `agencyStatus(org, subscription)` in `src/lib/domain/` → `suspended | onboarding | awaiting_payment | live | lapsed` (D1), reusing `activeSubscription` / `describePlanState`. TDD with a case per state and suspended-overrides-all.
- [ ] `TenantRow` (`data/tenants.ts:57-65`) loads `activatedAt` + latest subscription.
- [ ] Use it for: tenant detail header badge, tenants table status column + filter options, KYB table status (one pill, replaces Activated + Suspended pair).
- [ ] Staging data per D2.

### Task 4.2: Top dashboard cards count the right thing

`src/lib/data/dashboard.ts:236-246`.

- [ ] **Applications processed** = all applications regardless of status (`applicationRows.length`; today it excludes drafts — `:241`, comment `:100-110`). Subtext: drop "N started, drafts included" (now identical) → e.g. "all statuses".
- [ ] **Travellers** = applications with `status = 'approved'` (today: every `profiles.role='traveler'` account — `:184-187`, which includes invited clients who never started and removed staff). Invariant test: `travellers <= applicationsProcessed`.
- [ ] **Open applications** = `OPEN_STATUSES` minus traveller-turn statuses (D5). Keep `OPEN_STATUSES` itself unchanged for other callers — add a `REVIEW_STATUSES` set.

### Task 4.3: Overdue and Av. timeline actually compute

`operationsOf`, `src/lib/domain/kpis.ts:302-347`.

- [ ] **Overdue** (D3): replace `slaDueAt < now` (never written — always 0) with open-in-review for more than N days since submission. N as a named constant. Test with a fixed `now`.
- [ ] **Av. timeline** (D4): mean days, approved only, from first submission to `decided_at`. `submitted_at` is overwritten on resubmission (`submissions.ts:76`) — either add `first_submitted_at` (set once; migration + backfill from `submitted_at`) or derive it from the transition log. Display `Nd`; one decimal when under 10 days, so a fast desk doesn't read "0d".

### Task 4.4: Routes table — one status

`corridors-table.tsx:99-113` renders review state ("Approved") **and** "Live" as two pills.

- [ ] Fold into one: **Live** (approved + isLive) · **Superseded** (approved, not live) · **Awaiting review** · **Sent back**. Filter options match. Ten locales.

---

# Phase 5 — Assignment (demo requests, then agency cases)

### Task 5.1: One assignee dropdown

`enquiry-table.tsx:305-358`: 240px native select + separate "Assign to me" button. Agency side `case-handler-control.tsx`: "Handled by" text + Take + Release + director-only "Assign to…" menu.

- [ ] Shared `AssigneeSelect`: options **Unassigned · Assign to me · [every eligible person]**, current value shown as **"First L."** with the full name in `title` (split `profiles.fullName` on whitespace; fall back to the email local part — `fullName` is a single column, `schema.ts:439`). Narrow fixed width (~140px). Styled per Task 2.7.
- [ ] Permissions (D6): on ops, "Assign to me" / "Unassigned" for any staff; other names only for `isOwner` — enforce in `setDemoRequestAssignee` (`data/demo-requests.ts:195-206`), not only in the UI. Agency side keeps `canAssignCase` (`auth/policy.ts:243-247`); non-directors see only Unassigned / Assign to me.
- [ ] Replace the demo-request assignee cell and `CaseHandlerControl`'s take/release/assign cluster with it. `setCaseHandler` already covers claim/release/assign.
- [ ] Ops support table (`support-table.tsx:150-156, 184-201`) — same pattern, for consistency.

### Task 5.2: Demo requests row — converted shows who converted; no horizontal scroll

Nothing records the converter: `provisionTenantTx` (`data/tenants.ts:537-541`) writes only `status` + `convertedOrgId`, never `assigneeId`; conversion needs no assignee; `organisations` has no `created_by`.

- [ ] Migration: `demo_requests.converted_by` (FK profiles, `on delete set null`) + `converted_at`.
- [ ] `provisionTenantTx` sets `convertedBy = actorId`, `convertedAt = now()`, and **`assigneeId = actorId`** in the same update. Add `demoRequestId` to the `tenant.provisioned` audit metadata (`tenants/actions.ts:145`).
- [ ] Backfill existing converted rows: converter = earliest `invitations.invited_by` where `org_id = converted_org_id and kind='staff'` (written in the same transaction, `tenants.ts:519-528`). Set `assignee_id` where null.
- [ ] Cell: dropdown until converted; after, static "First L." (title = full name) of the last handler.
- [ ] Remove the action column (`enquiry-table.tsx:361-378`, header already blank). **Company** cell becomes the link to `/ops/tenants/{convertedOrgId}` when converted (copy `support-table.tsx:95-101`).
- [ ] Row kebab (`MoreVertical`, `ui/dropdown-menu.tsx`) with **Create agency** for non-converted rows. `ProvisionTenant` owns its trigger/open state (`provision-tenant.tsx:143-148`) — add controlled `open`/`onOpenChange`, and **mount the dialog outside the row's converted/not-converted switch**. The deferred refresh at `provision-tenant.tsx:93-106` exists so the one-time invitation link isn't lost when the row re-renders — keep that guarantee and test it.
- [ ] "Demo time" cell: `formatDateTime(preferredAt, locale, preferredTz)` → `11 Sep 2026, 12:31 GMT+5`, one line, drops the IANA name line.
- [ ] Verify: whole table fits at 1280 without horizontal scroll.

---

# Phase 6 — Marketing site behaviour

### Task 6.1: "Your dashboard" label sticks

**Root cause:** the section has `overflow-hidden` (`(site)/page.tsx:562-629`, to clip the `glow` blob). `overflow: hidden` makes the section the sticky container, so the label never sticks. Same on `/travelers` (`travelers/page.tsx:227-232`) — the only two `glow` sections.

- [ ] `overflow-hidden` → `overflow-clip` on both (clips the glow without breaking sticky). Verify in Safari; fallback is clipping the glow in its own absolutely-positioned wrapper.

### Task 6.2: Button pairs side by side on desktop

- [ ] Landing dashboard section and `/travelers` orgs section — Task 1.6.
- [ ] Auth code screens (`components/auth/auth-form.tsx:564-590, 633-660`): full-width primary with secondary text actions beneath. Put the secondary actions in a row with the primary at `sm+`, or confirm with Peace that text links under a form's single CTA are not a "pair". **(rec: ask — it's a sign-in form convention.)**
- [ ] Dialogs with a lone submit (demo, invite-dialog, invite-staff): add Cancel beside it (done in 0.1).

---

# Phase 7 — Traveller-side mobile, and the "everywhere" check

### Task 7.1: Traveller surfaces at phone width

Scope: site `/`, `/travelers`; `/app` (corridor, documents, requirements, companion, agent, messages, profile); sign-in/up; `invite/[token]`; checkout.

Known problems to fix:
- [ ] `app/document-row.tsx:164` `min-w-[280px]` overflows below ~370px.
- [ ] `app/travel-history.tsx:106` two date inputs `grid-cols-2` at every width → stack below `sm`.
- [ ] `app/notifications-menu.tsx:152` fixed `w-[340px]`; `account-menu.tsx:61` `w-[280px]` → `w-[min(340px,calc(100vw-2rem))]`.
- [ ] Landing/travelers roster card status tag fixed `w-[124px]` truncates names hard.
- [ ] `site/corridor-board.tsx:79,95` fixed 4-column grid, no mobile variant.
- [ ] Then walk every route above at **360×740, 375×812, 414×896** and 768 (tablet): no horizontal scroll, tap targets ≥ 44px, dialogs per 0.1. Screenshot each for the reply.

### Task 7.2: Repo-wide regression checklist (run before telling the client it's done)

- [ ] `grep` checks from 1.1, 1.2, 1.3, 2.5 return nothing.
- [ ] Sweep list in Phase 2 fully ticked.
- [ ] Every dialog in 0.1 Step 3 at 950px height.
- [ ] Both consoles: nav bubbles expanded + collapsed + mobile; collapsed mark.
- [ ] No dotted zeros on any `/ops` or `/agency` screen.
- [ ] Dashboard invariant: Travellers ≤ Applications processed on staging data.

---

## Answers to Peace's direct questions (for the reply)

- **"Table header labels are clickable — why? What do the arrows mean?"** They sort the table by that column (↕ = sortable, ↓/↑ = current sort). Agreed they're not obvious — sorting moves to a labelled Sort control and headers become plain (Task 2.3).
- **"Why is the Status column title a different colour?"** That was the column the table was sorted by. Goes away with the above.
- **"Zeros have dots — is that the specified font?"** They're from IBM Plex **Mono**, used for numbers; body text is Plex Sans. Numbers move to Plex Sans (Task 3.3).
- **"Open cases — applications or support tickets?"** Applications in progress. Renamed "Open applications / still in review" (Task 1.4, 4.2).
- **"To decision = average time from submission to approved visa, right?"** It was a **median** over approved **and** rejected cases. Changing it to what you describe (D4).
- **Travellers > Applications** — Travellers was counting every traveller *account*, including invited people who never started. Now counts approved applications (Task 4.2).
- **Live + Unpaid** — the badge only looked at suspension. New status covers onboarding, awaiting payment, live, lapsed, suspended (Task 4.1). Confirm the stages with Peace.
- **"Past SLA" came back** — it was hard-coded on the dashboard, outside the translated copy we renamed. Also, the underlying number was never being calculated; fixed together (Task 1.3, 4.3).

---

## Suggested PR order

| PR | Phase | Risk | Notes |
|---|---|---|---|
| 1 | 0 — dialogs | Low | **Ship first, tell Peace to resume the E2E test** |
| 2 | 1 — copy/renames | Low | Many locale edits; no behaviour change |
| 3 | 6 — site sticky + CTA | Low | Can merge with PR 2 |
| 4 | 2 — table system | **High** — touches every table | Needs full sweep list; screenshot each table |
| 5 | 3 — shell/type | Medium | Font change is global in consoles |
| 6 | 4 — KPIs + agency status | Medium | Needs D1, D3, D4 answered; migration if `first_submitted_at` |
| 7 | 5 — assignment | Medium | Migration + backfill; D6 |
| 8 | 7 — mobile + final check | Medium | Last, so it verifies everything above |
