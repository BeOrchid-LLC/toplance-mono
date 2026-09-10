# Agency-requested documents

Letting a reviewer ask one traveller for a document the corridor never listed — and
giving that traveller somewhere to put it.

## The problem

A reviewer sends a case back with "Additional documents needed". The traveller's
dashboard then says two opposite things at once, and both are correct given today's
code:

- The main panel says **"Everything is verified — your file is ready to submit.
  Nothing else is waiting on you."**, with a live **Review and submit** button.
- The status card beside it says **"Additional documents needed — something needs
  replacing before this can go further. We have told you which."** Nothing on the page
  says which.

`additional_documents` is in `RESUBMITTABLE`, so `canSubmitFrom` returns true and the
page draws the submit panel. That panel's copy comes from the checklist, and the
checklist is 100% verified — because **the requested document has no row anywhere.**
There is nothing outstanding to count, so the traveller is told they are finished while
the status pill says they are not.

Every `documents` row in the product is inserted in exactly one place —
`adoptRuleSet` in `src/lib/data/checklist.ts` — from corridor requirements. There is no
second author. That is the whole of the gap.

## Decisions (2026-09-10)

| Question | Decision |
|---|---|
| Request shape | **A named slot per document.** The reviewer types a name and guidance; it becomes a real checklist row, so the AI pre-check, the verify/flag cycle and the completion ring all keep working on it. |
| Where to ask | **A separate "Request a document" button**, independent of the send-back control, so the desk can add a slot at any status without bouncing the case. |
| Sent back, nothing named | **Hold submit.** The documents page draws a neutral panel and hides Submit until the desk names something. |
| Withdrawing a request | **Only while the slot is still empty.** No agency click can destroy a file a traveller uploaded; once filled, the reviewer uses the existing flag verdict. |

Two further decisions taken from what the codebase already answers:

- **Free-text names.** `precheckDocument` takes an `expectedName` string rather than a
  catalogue key, and `toDocKey()` already exists to slugify a name into a key. A typed
  name therefore works end to end with no catalogue to maintain.
- **Always required.** No optional toggle on a request — the desk is asking because they
  need it.

## Approach

Three were considered.

**A — a `source` discriminator on `documents` (chosen).** Agency requests are ordinary
`documents` rows carrying `source: "agency"`. Shape-identical to a corridor document, so
upload, pre-check, verify/flag, the completion ring, the export archive and both page
renders keep working untouched. The two sweeps that assume a single author learn to skip
them.

**B — a separate `document_requests` table.** Cleaner on paper, much worse here.
`getDocuments`, `completionOf`, `submitApplicationTx`, `markBillableIfComplete`,
`markChecklistCompleteIfDone`, `exportableDocuments` and both page renders would each
need to union two sources. It trades one column for a seam through eight call sites.

**C — write it into `corridor_requirements`.** Ruled out: that table is keyed on the
corridor, so requesting a document for one traveller would add it to every traveller on
that corridor.

A is cheap because of a decision this codebase already paid for: `documents` rows carry
**snapshots rather than joins**. Guidance is copied at insert because joining through
`applications.corridor_id` broke for rule sets with no corridor row behind them. A row
therefore needs no corridor to be a valid, fully-renderable checklist item — which is
exactly what an agency-requested document is.

## Data model

A new enum beside `documentState`:

```ts
export const documentSource = pgEnum("document_source", ["corridor", "agency"]);
```

Two new columns on `documents`:

| Column | Type | Why |
|---|---|---|
| `source` | `documentSource()` not null, default `"corridor"` | The discriminator. Not null and not derived, so nothing can quietly turn an agency row back into a corridor row. The default means no backfill. |
| `requestedBy` | `text()` → `profiles.id`, `set null` | Provenance, for display and audit only. **Never** read as the discriminator. |

That last row is load-bearing. Clerk has no `user.deleted` webhook, so orphan `profiles`
get deleted — and this FK is `set null`. Keying the discriminator off "`requestedBy` is
non-null" would mean a reviewer leaving the agency silently converts their requests back
into corridor-looking rows and hands them to the sweep below.

No `requestedAt` column: `createdAt` already is the moment it was requested. `docKey`
comes from `toDocKey(name)`. The existing `unique(applicationId, docKey)` constraint does
real work here — it is what stops a reviewer requesting "Passport" on a case that already
has one.

## The two sweeps

Both bugs are the same bug: a set difference used as a proxy for ownership.
`!wanted.has(docKey)` silently means "the corridor doesn't want this, therefore nobody
does" — true only while the corridor is the sole author. Adding a second author does not
break the query, it breaks the *inference*, which is why the compiler cannot help and why
both need tests.

**Fix 1 — the stale-row sweep, `src/lib/data/checklist.ts`.** `adoptRuleSet` ends by
deleting rows the corridor no longer asks for. An agency-requested document is
`not_started` and is not in the corridor's requirements, so it matches. The requirements
screen re-adopts to heal state — so the first time the traveller opens it, every unfilled
request is deleted with no trace.

```ts
const stale = existing
  .filter((d) => d.source === "corridor" && !wanted.has(d.docKey) && d.state === "not_started")
```

`existing` gains `source` in its select.

**Fix 2 — corridor propagation, `src/lib/data/corridors.ts`.** `corridorCoverageGaps`
computes its `removed` list by the same set difference and needs the same filter. Without
it, a corridor revision tells the traveller "we removed Bank statements" about a document
the agency asked for five minutes earlier.

**Promotion.** If a later corridor revision asks for a `docKey` an agency row already
holds, that row is promoted to `source: "corridor"` and its description refreshed, rather
than skipped. It genuinely is a corridor document now; leaving it as `agency` would put a
row permanently outside the sweep's reach.

## Agency surface

- **`src/components/agency/request-document.tsx`**, on the case's documents panel. Two
  fields: name (required) and guidance (optional, becomes the row's `description` — the
  line the traveller reads under the title).
- **`requestDocument`** in `src/app/[locale]/agency/actions.ts`, guarded by
  `canReviewDocuments` — the same guard `reviewDocument` uses. Rejects a duplicate
  `docKey` with a written error rather than letting the unique constraint throw.
- **Withdraw** appears only on rows with `source: "agency"` and `state: "not_started"`,
  and routes through `src/components/shared/confirm-dialog.tsx` per the project rule. Its
  body says what lands: the requirement comes off the traveller's list and they stop being
  asked for it.
- **`AGENTS.md` gains a row** in the destructive-controls table.

## Traveller surface

The row renders through the existing `DocumentRow` with no changes. The documents page
groups by **state**, not `sortOrder`, so a request lands in "Still to upload"
automatically — no ordering work.

One addition: an "Asked for by your agency" label on the row, so a traveller who had
finished understands why a new item appeared. Ten locales, in
`src/lib/i18n/document-row.ts`.

Both surfaces already load documents through the same `getDocuments(applicationId)`, so
the requirement that a requested document appear on the agency's client page too costs
nothing — once the row exists, it is there.

## The submit-panel rule

A new pure function in `src/lib/domain/status.ts`, beside `canSubmitFrom`, so the two
halves of the branch stay readable together:

```ts
/** Sent back for documents the desk has not listed yet. */
export function sentBackWithoutDetail(
  status: ApplicationStatus,
  requestedCount: number
): boolean {
  return status === "additional_documents" && requestedCount === 0;
}
```

When true, the documents page draws a neutral panel — the desk has asked for something
and has not listed it yet, check your messages — and hides Submit. When the desk does name
one, the ordinary checklist rules take over: Submit returns once it is uploaded and
verified, exactly as for a corridor document.

The predicate counts requests that **exist**, not requests that are outstanding. A
traveller who has uploaded the requested document can resubmit; a reviewer who withdraws
their only request puts the case back to holding. Both are correct.

## Events, notification, audit

| Kind | Added | Where |
|---|---|---|
| Analytics | `toplance.document_requested`, `toplance.document_request_withdrawn` | `src/lib/analytics/events.ts` — a union type, so a missing name is a compile error |
| Notification | `document_requested` → traveller | `notificationKind` enum; payload carries the doc name, like `document_flagged` |
| Audit | `document.requested`, `document.request_withdrawn` | alongside `document.verified` / `document.flagged` |

Billing and completion need no changes. `completionOf`, `submitApplicationTx` and
`markBillableIfComplete` all read `isRequired` and `state`, which a requested row has.
Requesting a document on an already-billable case does not un-bill it — the `is null`
column guard makes that write once-only.

## Tests, written first

1. `adoptRuleSet` leaves an agency-requested row alone. *The regression that would
   otherwise silently delete the whole feature.*
2. `adoptRuleSet` promotes an agency row to `corridor` when a revision asks for the same key.
3. `corridorCoverageGaps` does not list agency rows under `removed`.
4. `requestDocument` refuses a `docKey` already on the case.
5. `submitApplicationTx` refuses while a requested required document is unverified.
6. `sentBackWithoutDetail` — full truth table across statuses and counts.
7. `withdrawDocumentRequest` refuses once `state !== "not_started"`. *The guarantee that
   no agency click destroys a traveller's file.*

## Out of scope

- Requesting a document from more than one traveller at once. A corridor revision is
  already the tool for that.
- Any change to the deferred BeOrchid Core schema move (`toplance.*`, `core.users`).
  These two columns land in `public.documents` alongside everything else and move with it.
