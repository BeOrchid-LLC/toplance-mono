# Console review feedback — design

**Source:** client review call, 2026-09-07. Transcript and the client's own
action-point summary:
<https://docs.google.com/document/d/1o6GR4tR9HzoX5dKq7G7qG-cPzYMzOCCuAnBv4jv4ooI/edit>

**Decisions taken:** 2026-09-08, with the user, before any code was written.
Three of them (§0) change what gets built rather than how, so they are stated
first.

**Plans implementing this spec:**

- `docs/superpowers/plans/2026-09-08-console-navigation-and-tables.md`
- `docs/superpowers/plans/2026-09-08-case-lifecycle-export-and-statuses.md`
- `docs/superpowers/plans/2026-09-08-traveller-surface-fixes.md`

---

## 0. Decisions

### 0.1 The sidebar goes on both consoles

The client asked for the agency console's top tabs to move into the left
vertical navigation "that existed before", so the information architecture is
"much easier to understand". **Both `/agency` and `/ops` get the sidebar.**

The consequence for the other request in the same call — "can demo requests
also have a tab at the top?" — is that Demo requests becomes a *sidebar* entry
on `/ops` rather than a top tab. It is still a first-class destination of its
own, which is what the request was actually about: today the demo queue is a
panel buried at the bottom of `/ops/tenants` with no way to link to it.

The traveller product (`/app`) keeps its top bar. Its nav is a journey —
Dashboard → Requirements → Documents → Messages → After you land — and a
horizontal run of steps reads as a sequence in a way a vertical list does not.
Nothing in the client's feedback concerned the traveller's chrome.

### 0.2 `processing` becomes a real status, set by Export

> "once the admin exports the file, the zip file containing the client's
> documents, then the status of the client application changes to processing."

Today the enum has no such value, and there is no export at all. Both are
built:

```
submitted
  └─> under_review
        ├─> processing            ← written by Export, not by a button
        │     ├─> approved
        │     ├─> rejected
        │     └─> additional_documents
        ├─> approved
        ├─> rejected
        └─> additional_documents
```

`processing` means *the file has left this product and is with the mission*.
That is genuinely different from `under_review` ("a named case handler has your
file open"), which is why it is a new value rather than a relabelling: a desk
that cannot tell "I am reading it" from "it is at the embassy" cannot answer
the only question a traveller asks in that fortnight.

It is written by the export, not offered as a button, because the export is the
event. A handler who has downloaded the ZIP has, in the client's own account of
the workflow, submitted it; a second click to say so is a click that gets
forgotten and leaves the traveller's screen lying.

`processing` is not terminal. `approved`, `rejected` and `additional_documents`
all remain reachable from it — that is the "come back from the embassy and
update it" leg the client described.

### 0.3 The "hidden admin functions" are rebuilt inside the agency console

> "We had stuff like rules setting, request for it to be reviewed, application
> statuses… Oh, they're definitely needed."

The screens the client remembers were platform-side (`/ops`) and were deleted
in the v1.3 tenancy work. `src/components/ops/ops-nav.ts` records why, and it
is not tidiness:

> the case queue and case detail screens … read documents directly, without
> passing through `requireApplicationAccess`, so they were the enforcement gap
> rather than merely a surface nobody should visit.

Rebuilding them at `/ops` would reopen that gap and contradict the sentence
every agency's terms carry — that nobody at BeOrchid can open their clients'
documents. So the three functions are rebuilt **inside the agency console**,
where the agency is already entitled to the data:

| Client's words | Where it lands |
|---|---|
| "rule sets" | `/agency/rule-sets` — read-only view of the corridor rule sets that built this agency's checklists |
| "application statuses" | status + date filters on the `/agency/clients` table (§2) |
| "request for it to be reviewed" | the unassigned pool, already on the reviewer's dashboard, promoted to a KPI quick link (§1.3) |

Nothing on the BeOrchid side gains document access.

---

## 1. Navigation and layout

### 1.1 One sidebar shell, two consoles

A new `ConsoleShell` renders a fixed left rail plus the page body. It takes the
same `NavItem[]` the `AppBar` takes today, so `agencyNav` and `localizedOpsNav`
keep their shape and their tests.

- Rail is `240px`, sticky, full height, on `lg` and up.
- Below `lg` there is no rail: the existing `AppNavMenu` hamburger carries the
  same items, as it does today.
- The top bar does not disappear. It keeps the wordmark, the notifications
  bell, the settings cluster and the account menu — everything that is about
  *the account* rather than *the section*. Only the nav items move down into
  the rail.
- The active-item mark moves from a bottom edge to a leading edge (a 2px brand
  bar on the inline-start side), because the rail has no bottom rule to mark.
  `isActive` is unchanged.

### 1.2 `/ops` gains a Demo requests entry

`opsNav` becomes four entries: Routes, Agencies, Demo requests, Colleagues.
`/ops/demo-requests` is a new page holding `DemoRequestQueue`, which moves off
the bottom of `/ops/tenants`. The "open enquiries" counter stays on
`/ops/tenants` and becomes a link to the new page.

### 1.3 The agency dashboard gains KPI quick links

> "we can add some KPIs here… unassigned applications, sort of like quick
> actions… so that they can be clickable"

A `KpiRow` of four cards above the existing content, each one a link:

| KPI | Value | Links to |
|---|---|---|
| Unassigned | cases with no `assignee_id` | `/agency/clients?assignee=unclaimed` |
| With the embassy | cases in `processing` | `/agency/clients?status=processing` |
| Awaiting your review | cases in `submitted` or `under_review` | `/agency/clients?status=under_review` |
| Needs documents | cases in `additional_documents` | `/agency/clients?status=additional_documents` |

Shown to directors and reviewers alike, counted over what each may see —
`listOrgRoster` already scopes that, and a reviewer must not be given a count
of cases they cannot open.

### 1.4 `/agency/rule-sets`

Read-only. Lists every corridor that any of this agency's applications resolved
to: route, visa name, purpose, version, requirement count, effective-from date,
source link. It is the agency's answer to "what is this checklist built from",
and it is the client's "rule sets" item.

No write controls. Curating corridors is BeOrchid's job and stays on
`/ops/corridors`.

---

## 2. Tables, search and filters

> "imagine when they have 100 clients… we want to give them the best user
> experience to handle that… they should be able to search through and they
> should be able to filter by date, filter by application status"

Four lists become searchable tables. One shared client component,
`FilterableTable`, does the work in all four:

- A search input filtering on the row's declared searchable text.
- Zero or more select filters, declared per table.
- A "N of M" count and a clear-filters control when anything is applied.
- Filtering happens in the browser over rows the server already sent. The
  server queries are unchanged, so no security reasoning moves: `listOrgRoster`
  in particular carries the `handlesCase` scoping this product's privacy
  boundary rests on, and a filter is not allowed to become a second way to
  ask it.

| Table | Search on | Filters |
|---|---|---|
| `/agency/clients` | name, case ref, destination, visa | status, handler (mine / unassigned / anyone) |
| `/agency/team` | name, email | role |
| `/ops/tenants` | agency name, domain | state (live / suspended) |
| `/ops/corridors` | route, visa name | review state, purpose, freshness |

`/agency/clients` also gains the columns the client asked for — submitted date
and the handler's name — and reads its initial filter from the URL, so the KPI
quick links of §1.3 land on a pre-filtered table.

The traveller's `ClientRoster` ruled-row layout is kept for the two small
dashboard slices ("assigned to you", "unclaimed"); the full roster page is the
one that becomes a table.

---

## 3. Case lifecycle

### 3.1 Export

A handler on `/agency/clients/[id]` gets **Export case (.zip)**. It streams a
ZIP containing every uploaded document, named
`<sortOrder>-<docKey>.<ext>`, plus a `manifest.txt` naming the case, the
traveller, the corridor, and each file's state and upload date.

- Guarded by `canReadDocuments` through `requireApplicationAccess` — the same
  door the case screen itself uses. There is no new read path to a document.
- No new dependency. Documents are already-compressed JPEG/PNG/PDF, so the
  archive is written **stored (method 0)**, which is a well-specified format
  that fits in one pure, testable module.
- Exporting moves `under_review → processing` and writes a `status_events` row
  the traveller sees, with a fixed message. Exporting from any other status
  exports without moving anything.
- Audited (`application.exported`) and tracked
  (`toplance.case_exported`).

### 3.2 Status synchronisation

Already true and staying: `changeStatusTx` writes `status_events`, and the
traveller's dashboard, documents page and profile all read `applications.status`
and the event list. Adding `processing` means:

- `STATUS.processing` — label "With the embassy", short "At embassy",
  variant `info`, blurb naming what is happening and that we will report back.
- `STAFF_TRANSITIONS` gains the edges in §0.2.
- `RESUBMITTABLE` is unchanged: a traveller cannot resubmit over a case that is
  with the mission.

### 3.3 "Owner" becomes "Director"

`AGENCY.roleLabel.owner` and `AGENCY.roleReason.owner` change wording in all
ten locales. The database enum value stays `owner` — this is a label, and
renaming a `pg_enum` member touches every policy function to buy nothing.

`OPS_TENANTS.roleOwner` changes with it, so the platform console and the agency
console call the same rank the same thing.

### 3.4 Assignment logic

> "the admin can assign to themselves and only the director… can assign to
> other team members but every admin can assign to themselves."

**Already correct.** `canAssignCase` in `src/lib/auth/policy.ts` permits a
claim of an unheld case by any member, a release by the holder, and a hand-off
to a colleague only by the director. `CaseHandlerControl` draws exactly that.
No change beyond the rename in §3.3, which is what made it *look* wrong.

---

## 4. Ops tenant administration

### 4.1 Suspension confirmation

> "Let there be a confirmation so we don't go mistakenly delete someone's
> subscription."

`TenantControls` currently states the consequence in a sentence above the
button and commits on one click. A confirmation dialog is added, using the
existing `Dialog` primitive, naming the agency and how many people lose access.
Restoring stays one click — it grants rather than removes.

### 4.2 Billing history on the tenant page

> "we would need to be able to see, like, track their subscription here…
> billing history… when their subscription is up and coming… if the agency
> sends a request to cancel subscription we should be able to do that from
> here."

`/ops/tenants/[id]` gains a Billing history panel: every payment row for that
organisation (date, amount, kind, status, provider ref) plus the active
subscription's period end, and a **Cancel subscription** control that ends the
current period. The agency's own `/agency/billing` already renders its half of
this from `listPaymentsForOrg`; this is the same data on the platform side.

---

## 5. Traveller-facing fixes

### 5.1 Documents explainer width

The three explainer paragraphs on `/app/documents` sit in a `max-w-[62ch]`
column beside the completion ring, so they wrap to roughly half the width of
the panels below. The block moves above the ring and takes the full page
measure; the ring moves to the row with the heading.

### 5.2 Local currency

> "I had mentioned having the equivalent of this in the local currency showing
> as well."

**Already built** — `convertFee` + `formatApproximate` on
`/app/requirements` render "≈ ₦2,400,000 at 3 September rates" under the
government fee. It did not appear in the demo because `fx_rates` is empty:
`getPairRate` returns null on any environment where the daily
`/api/cron/fx-rates` job has never run, and every caller treats null as "show
nothing".

Two changes:

1. An `npm run fx:refresh` script that calls `refreshFxRates()` once, so
   staging and a developer's machine can be populated without waiting for a
   cron.
2. When the conversion is unavailable but the currencies genuinely differ, the
   fee cell says so in one line rather than silently showing only the mission's
   currency. A missing figure that looks like a missing feature is what caused
   this feedback in the first place.

**Deployment, not polish.** The converted figure cannot appear on any
environment that lacks two things: `OPEN_EXCHANGE_RATES_APP_ID`, and a daily
schedule hitting `/api/cron/fx-rates`. Neither is set on this machine — running
`npm run fx:refresh` here answers "No OPEN_EXCHANGE_RATES_APP_ID is set, so
there is nothing to fetch", which is the whole of why the client saw no
number. Staging needs both before the feature exists there; `npm run
fx:refresh` is the manual equivalent of the cron, not a substitute for it.

The script imports the *provider* rather than `refreshFxRates()` and writes
through `pg`, because `@/` path aliases do not resolve under
`--experimental-strip-types` and `rates.ts` reaches the database through one.
It runs under `--conditions=react-server`, without which `server-only` throws.

### 5.3 The provenance icon

> "that icon there, what is that icon? Is that an info icon? Because it looks
> like a clock… it should be an I and then on hover it should display a
> helpful text… something like 'this is when last requirements were verified'."

The "In effect since {date}" line on `/app/requirements` gains a leading
`Info` icon and a hover/focus explanation: this is the date the mission itself
published the rules, and Toplance re-checks them against the source. Built on
the existing `@radix-ui/react-popover` dependency, opening on hover and on
focus so it is reachable by keyboard, with the same sentence also present as
`aria-describedby` text.

Note the correction to the client's wording: this date is the *mission's*
effective-from date, not our last verification. Our verification date is
deliberately staff-only — `src/lib/domain/freshness.ts` argues that at length
— so the tooltip explains what the date is rather than claiming to be
something it is not.

### 5.4 Phone validator

> "I should probably put better validator here right now. Doesn't work so
> well."

`PhoneField` accepts any number of digits. Each `Country` already carries a
`mask` whose `.` count is the national number length, so:

- `expectedDigits(mask)` — a new pure function counting `.`.
- The field validates on blur and on submit, refusing too few or too many
  digits with a message naming the expected length.
- `toE164` is unchanged; only the guard in front of it is new.

### 5.5 Question-count copy

> "we're not writing 'answer 10 short questions'."

**Already satisfied.** No string in `src/lib/i18n` names a fixed question
count; the two that mention a number (`srAllAnswered`, `srQuestionOf`) are
screen-reader labels interpolating the real total. The plan carries a
regression test asserting no locale string in the intake copy contains a bare
numeral, so this cannot come back.

### 5.6 AI pre-check consistency

> "sometimes it's rejecting, sometimes it's passing… the AI sometimes rejects
> accurate documents."

The ×2-in-the-requirement-name bug was fixed on 7 September (commit `96aa8bc`).
What the client saw *after* it is the residual non-determinism: the same file
flags on one attempt and passes on the next.

Three changes, in order of effect:

1. `temperature: 0` on the pre-check call. It is currently unset, so the model
   samples, and a borderline document lands on either side of the line at
   random. This is the whole of the "accepted the exact same thing it
   rejected" observation.
2. A `confidence: "high" | "low"` field on the schema, with the prompt told to
   flag **only** at high confidence — the "when unsure, PASS" instruction
   exists in prose but nothing makes the model commit to a judgement about its
   own certainty. `applyPrecheckTx` is called with `verdict: "pass"` for any
   low-confidence flag, and the model's reasoning is still stored in `raw` for
   the reviewer.
3. The stored `raw` payload gains the confidence, so a support conversation can
   tell "the model was sure" from "the model guessed".

The human reviewer remains the only path to `verified`. None of this changes
that.

---

## 6. Out of scope

- **Embassy submission integration.** Settled in the call: missions publish no
  API, so the export-and-return-manually loop of §3 *is* the design, not a
  stopgap.
- **A real Stripe implementation.** The payment UI, the rate card, the
  checkout screens and the mock provider all shipped in `cd6e81c`. The client
  asked for UI without integration; that is the state today.
- **The `toplance.*` schema move and the other deviations in `AGENTS.md`.**
  Platform-team work, planned with them, not touched here.
