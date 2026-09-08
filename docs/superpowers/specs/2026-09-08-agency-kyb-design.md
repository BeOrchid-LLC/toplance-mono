# Agency KYB — a manual checklist before an agency can start — design

**Date:** 2026-09-08
**Branch:** `feat/agency-kyb-checklist`
**Status:** approved in brainstorming; implementation follows in this branch

## The problem

Nothing stands between an agency and the product.

`provisionTenant` (`src/app/[locale]/ops/tenants/actions.ts:91`) creates the
`organisations` row and emails an invitation. The invitee accepts, is promoted
to owner, names nothing further, and `resolveAgencyConsole`
(`src/app/[locale]/agency/console.ts`) asks them for money. On payment the
console opens: they invite colleagues, take cases, and read travellers'
passports.

At no point does BeOrchid establish that the business is a licensed agency, or
that the person holding the owner seat has anything to do with it. Peace's
request on 2026-09-08, verbatim in intent:

> we need to do KYB before an agency can start inviting their team on Toplance.
> To do that, the agency needs to provide certain information to prove that
> they're a licensed agency, and that the person creating the account is
> actually the owner of the business.

The automated path — a KYB provider, an API, documents uploaded by the agency
itself — is the next milestone. This one is explicitly manual: documents arrive
by email, a BeOrchid admin files them against a checklist, and a deliberate act
opens the console. What is being built is **the record and the gate**, not the
automation.

> Because this is out of scope, I'm proposing that we do this "manually". […]
> A way for us to be able to at least document the businesses we have vetted.

## What is being built

1. A `kyb_requirements` table — six rows per agency, each a document with a
   state, an uploaded file and an admin's note.
2. A `/ops/kyb` queue and a `/ops/kyb/[id]` checklist where a BeOrchid admin
   uploads each document and marks it verified or rejected.
3. `organisations.activatedAt` — the moment BeOrchid opened the agency — set by
   an **Activate** button that is inert until all six read `verified`.
4. A third decision in the agency paywall: an agency that exists but is not
   activated sees a holding screen instead of a bill.
5. One email to the director on activation, whose button lands on
   `/agency/billing` — the flow that already exists.

## Decisions taken

### The checklist is six requirements, fixed in code

`src/lib/domain/kyb.ts` holds `KYB_REQUIREMENTS`, and seeding an agency writes
one row per entry. Not admin-authored, not per-agency: "KYB is complete" has to
mean something a query can answer, and a free-form list makes it mean "an admin
said so".

| `docKey` | Name | What it establishes |
|---|---|---|
| `operating_licence` | Operating licence | The agency is licensed to do this work |
| `incorporation_certificate` | Certificate of incorporation | The company legally exists |
| `director_id` | Director's government ID | Who the account holder is |
| `business_address` | Proof of business address | The company is where it says it is |
| `ownership_proof` | Proof of ownership | The account holder owns *this* company |
| `bank_account` | Bank account proof | The account is in the business's name |

The last two are the half Peace named separately and the half a licence check
does not cover. A licence proves the business; only `ownership_proof` ties the
person who signed up to it.

Changing the list is a deploy. That is the right cost at this stage and the
wrong one later — when agencies self-serve, the list becomes data. Saying so
here means the next person does not read the constant as a permanent decision.

### `name` and `description` are copied onto the row, not joined

The same call `documents.description` records, in the same words: a checklist
row must carry its own instructions. If the constant is edited, an agency
reviewed last month still shows what its reviewer was actually looking at.
Rewriting history is not a feature of an audit record.

### A new `kyb_state` enum, not `document_state`

`documentState` is `not_started | uploaded | checking | verified | flagged |
failed`. Three of those are the AI pre-check's vocabulary, and there is no AI
in this milestone. An ops screen switching on a state that can never occur is a
state somebody will eventually try to set.

```
kyb_state = not_started | in_review | verified | rejected
```

Four values, which is Peace's three plus the state every row starts in. The
distinction `not_started`/`in_review` is the one the queue is read for: nothing
received yet versus received and being looked at.

### `activatedAt` is its own column, beside `suspendedAt`

Not one lifecycle enum. Suspension and activation are orthogonal and both
reversible in principle, and collapsing them makes "restore a suspended agency"
ambiguous about whether it also re-opens KYB. Two nullable timestamps, each
answering one question, is the shape `suspendedAt` already established.

### Activation is gated on all six, and additive

The **Activate agency** button is disabled while any requirement is not
`verified`, and the panel names which. `activateAgency` re-reads and re-counts
inside its transaction: a disabled button is a courtesy, the transaction is the
guard. This action is reachable as a POST by anyone with a staff session and no
page ever rendered.

Under `AGENTS.md`'s rule, activation is **not destructive** and commits on the
click with no `ConfirmDialog`. It opens a console and sends a letter; it takes
nothing away. This is the same reading that leaves `purchaseSubscription` and
`CorridorDecision` ungated.

**Replacing an uploaded document is destructive** — it deletes the stored
object — and confirms, exactly as `app/document-row.tsx` does.

There is no deactivation control. An agency that turns out to be a problem is
stopped by `suspendTenant`, which exists, already confirms, and already removes
every member's reach through `liveOrgIdsFor`. A second control for the same
outcome would be two rules for one decision.

### The checklist is internal

The director never sees it. They see the holding screen, then the activation
email. Showing an agency a `rejected` row it cannot act on in-product invites
the question "why can't I upload it here?" — whose honest answer is "next
milestone". Documents arrive by email in this milestone, so the record stays
where the work happens.

This also means the six names and descriptions are stored in English and not
localised. Every reader of them is BeOrchid staff, and they are the names of
legal documents. The screen's own chrome localises normally through `OPS_KYB`.

### Existing agencies are backfilled as activated

The migration stamps `activatedAt = now()` on every `organisations` row that
already exists and seeds their six requirements as `not_started`. Nobody
currently working is locked out by a rule introduced after they onboarded.
KYB applies to agencies provisioned from here on.

Pre-launch, so this is a handful of seed rows. It is still written as a data
migration rather than done by hand, because staging and production both need it
and neither is somebody's laptop.

### A sixth item in a nav that was curated down to five

`ops-nav.ts` records the client's 2026-09-08 request that the console's nav
close rather than open, and this adds to it. The justification is that KYB is a
**queue**: "who is waiting on us" is a daily question, and a panel on
`/ops/tenants/[id]` can only answer it one agency at a time. A queue with no
front door is a queue nobody works.

It sits second, between Agencies and Enquiries — beside the screen it is about,
before the screen that feeds it.

Visible to every staff rank, not owner-gated, consistent with `suspendTenant`
and `restoreTenant`, which are more consequential and are not gated either
(`src/app/[locale]/ops/tenants/actions.ts:31`).

## Architecture

### Schema (`src/lib/db/schema.ts`)

```ts
export const kybState = pgEnum("kyb_state", [
  "not_started",
  "in_review",
  "verified",
  "rejected",
]);

export const kybRequirements = pgTable(
  "kyb_requirements",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid().notNull().references(() => organisations.id, { onDelete: "cascade" }),
    docKey: text().notNull(),
    name: text().notNull(),
    description: text(),
    state: kybState().notNull().default("not_started"),
    storagePath: text(),
    /** Why it was rejected, or any remark the next admin should read. */
    note: text(),
    sortOrder: integer().notNull().default(0),
    checkedAt: timestamp({ withTimezone: true }),
    reviewedBy: text().references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("kyb_requirements_doc_key").on(t.orgId, t.docKey),
    index("kyb_requirements_org_idx").on(t.orgId, t.state),
  ]
);
```

Plus `organisations.activatedAt: timestamp({ withTimezone: true })`.

Table name is plural snake_case per the platform convention. It lands in
`public` alongside everything else — the `toplance.*` schema move is BeOrchid
Core work and is not done unilaterally here.

### Pure core (`src/lib/domain/kyb.ts`)

`KYB_REQUIREMENTS` and:

```ts
export function kybProgress(rows: { state: KybState }[]): {
  verified: number;
  total: number;
  canActivate: boolean;
};

export function kybStanding(org: {
  activatedAt: Date | null;
  verified: number;
  total: number;
}): "not_started" | "in_review" | "ready" | "activated";
```

No I/O, no framework — the discipline `src/lib/payments/gates.ts` keeps, and
for the same reason: the rule that decides whether a business is let in should
be readable and testable without standing up a request.

`canActivate` is `verified === total && total > 0`. The `total > 0` is not
defensive noise: an agency whose requirements failed to seed would otherwise
read 0/0 and be instantly activatable.

### The gate (`src/lib/payments/gates.ts`)

```ts
export type AgencyBillingDecision =
  | "name-organisation"
  | "pending-verification"   // new
  | "checkout"
  | "ok";

export function decideAgencyBilling(input: {
  hasOrganisation: boolean;
  kybActivated: boolean;      // new
  subscriptionActive: boolean;
}): AgencyBillingDecision
```

Order matters and is asserted in `gates.test.ts`: no organisation, then not
activated, then not paid. An agency with nothing to be verified cannot be
pending verification, and an agency that has not been let in is not asked for
money.

### The redirect (`src/app/[locale]/agency/console.ts`)

`resolveAgencyConsole` already selects the organisation row for the bar; it
gains `activatedAt` at no extra query cost, and a second option:

```ts
resolveAgencyConsole({ allowUnpaid = false, allowPending = false })
```

The two are **independent checks, not a ladder**. `/agency/billing` passes
`allowUnpaid: true` and not `allowPending`, so a pending agency that types the
billing URL is walked to `/agency/verification` rather than shown a Pay button.
Without that independence the paywall's own escape hatch would be the hole in
the new gate.

`/agency/verification` is the one page that passes `allowPending: true`, for
precisely the reason `/agency/billing` passes `allowUnpaid: true`: without it
the screen redirects to itself.

`purchaseSubscription` (`src/app/[locale]/agency/billing/actions.ts`) refuses
for a non-activated agency. It is a POST endpoint reachable without ever
rendering the page whose button posts to it — the same argument its own
preamble already makes about reading the amount from the rate card rather than
the form.

### Data layer (`src/lib/data/kyb.ts`)

- `seedKybRequirements(tx, orgId)` — called inside `provisionTenantTx` and
  `createOrganisationTx`, so both doors into an `organisations` row leave a
  checklist behind. Idempotent via `onConflictDoNothing`.
- `kybQueue()` — one grouped select: agency, verified count, total, standing,
  created date. Ordered oldest-waiting first, because that is what a queue is
  for.
- `getAgencyKyb(orgId)` — the six rows plus the agency's name and `activatedAt`.
- `setRequirementState({ orgId, docKey, state, note, reviewedBy })`
- `attachRequirementDocument({ orgId, docKey, file })` — puts the object, then
  writes `storagePath` and moves `not_started` → `in_review`. Uploading a
  document does not verify it; only a person does.
- `activateAgency(orgId, actorId)` — transaction: re-read, re-count, refuse
  unless `canActivate`, stamp `activatedAt`, return the director to email.

Like `src/lib/data/tenants.ts`, this module reads nothing about a traveller.
It selects from `organisations` and `kyb_requirements` and from no other table
except `profiles` for the reviewer's name and the director's address.

### Storage

`kyb/<orgId>/<docKey>` in the same private bucket as everything else, through
the existing `putDocument` / `signedDocumentUrl` / `deleteDocument` in
`src/lib/storage/documents.ts`. No new infrastructure and no new credential.

A deterministic key rather than a uuid suffix: replacing a document should not
leave the old object orphaned in the bucket, and overwriting one key is simpler
than deleting one and writing another. The confirm dialog on replace is about
the same fact — the previous file is gone.

### Email (`src/lib/notifications/templates.ts`)

`kybActivatedEmail({ orgName, fullName, billingUrl })`, sent directly through
`sendEmail` rather than through `notify`. `notifications.applicationId` is the
wrong hook for a letter to an agency director; `invitationEmail` and
`demoRequestEmail` already take this path for the same reason.

`sendEmail` returns `false` rather than throwing, and `activateAgency` reports
that back so the operator is told when the letter did not leave — the exact
failure `provisionTenant`'s preamble documents at length.

**Recipient resolution is where this gets interesting.** `provisionTenant` is
deliberately two-step: the invitee joins as a `reviewer` and somebody promotes
them afterwards. So an agency can be fully verified with no `owner` row at all.
The order is:

1. the agency's `owner` in `org_members`, by their `profiles.email`;
2. failing that, `organisations.billingContact`;
3. failing both, **refuse to activate** and tell the operator to seat an owner
   first.

Refusing is the right answer rather than activating silently: the whole point of
this act is that a person is told they can now pay, and an activation nobody
hears about is a console sitting open behind a paywall nobody was invited
through.

### Ops screens

`/ops/kyb` and `/ops/kyb/[id]`, built from `/ops/tenants` and
`/ops/tenants/[id]` — including the `generateMetadata` staff gate that page
documents at length, because the same agency-uuid enumeration oracle applies
here and the title would carry a real agency name.

- `src/components/ops/kyb-table.tsx` — the queue, through the shared
  `DataTable`, with a progress cell and a standing badge.
- `src/components/ops/kyb-checklist.tsx` — six rows: name, description, the
  uploaded file as a signed link, a state control, a note field, and the
  **Activate agency** button with its "two requirements are not verified yet"
  sentence beneath.

Actions in `src/app/[locale]/ops/kyb/actions.ts`, each opening with
`requireStaffAction()` as every action in `ops/tenants/actions.ts` does.

### Analytics and audit

Three names added to the union in `src/lib/analytics/events.ts`:
`toplance.kyb_document_uploaded`, `toplance.kyb_document_reviewed`,
`toplance.agency_activated`. Audit entries `kyb.document_uploaded`,
`kyb.document_reviewed`, `agency.activated`, the last carrying `emailSent` the
way `tenant.provisioned` does.

## Error handling

- **Upload fails.** The object write happens before the row update, so a failed
  put leaves the row untouched and the admin sees the error rather than a row
  claiming a file that is not there.
- **Activation loses a race.** Two admins on the same agency: the transaction
  re-reads, and the second one either finds it already activated (returns ok,
  sends nothing — one activation, one letter) or finds a requirement no longer
  verified and refuses.
- **Email provider down.** Activation still commits and reports
  `emailSent: false`. The console is open; the director has not been told. The
  operator sees that plainly and can resend by other means. Not silently
  swallowed, and not a reason to un-activate.
- **No owner seated.** Activation refuses before writing anything, with a
  message naming the fix.

## Testing

- `src/lib/domain/kyb.test.ts` — `kybProgress` and `kybStanding` over every
  combination, including the 0/0 case.
- `src/lib/payments/gates.test.ts` — the new branch and, specifically, its
  order: activated-but-unpaid is `checkout`, unactivated-and-unpaid is
  `pending-verification`.
- `src/lib/data/kyb.test.ts` — seeding idempotence, the queue's counts, and
  `activateAgency` refusing on an incomplete checklist and on a missing owner.
- `src/components/ops/ops-nav.test.ts` — updated for six items, per rank.
- `src/lib/notifications/templates.test.ts` — the activation email, as the
  other templates are covered.
- `src/lib/analytics/events.test.ts` — already asserts the `app.object_action`
  format over the union, so the three new names are covered by construction.

## Out of scope, deliberately

Automated KYB through a provider or API. Agency self-serve upload. Document
expiry and re-verification. Deactivation. All named in the conversation as the
next milestone, and none of them is made harder by what is built here — the
table, the states and the gate are what an automated checker would write into.
