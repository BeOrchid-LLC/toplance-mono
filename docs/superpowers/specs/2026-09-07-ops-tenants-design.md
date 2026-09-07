# Tenant management in the platform console — design

**Date:** 2026-09-07
**Branch:** `feat/ops-tenants-console`
**Status:** approved in brainstorming; implementation plan to follow

## The problem

The platform console has one screen. `src/components/ops/ops-nav.ts` carries a
single entry — `/ops/corridors` — and its own comment names what is missing:

```ts
// Tenant provisioning and an audit-log reader belong here when they are
// built; nothing that reaches a traveller's case ever does.
```

So BeOrchid curates routes and can do nothing else. Three consequences follow
from that, and each is a hole this design closes.

**An agency cannot be created except by the agency.** The only path to an
`organisations` row is `createOrganisationTx`, called from
`src/app/[locale]/agency/actions.ts` when an employer signs themselves up. A
sales conversation that ends in "yes" ends with an email asking the customer to
go and register.

**Suspension exists in the database and nowhere else.** `organisations.suspendedAt`
is documented at length in `src/lib/db/schema.ts:269-282`, and
`liveOrgIdsFor` (`src/lib/data/applications.ts:81`) honours it correctly — a
suspended agency's members carry no `orgIds`, so every `isAgencyFor` check
answers no at once. Nothing sets the column. The mechanism is built, tested and
unreachable.

**Demo requests are written and never read.** `demo_requests` takes a row from
the landing-page form (`src/app/[locale]/(site)/actions.ts`), sends a
notification email, and stops. The table's own comment is explicit that the
email is the read path and that a status column belongs with the ops surface
that would change it. That surface is this one.

`organisations.seatsPurchased` is likewise dormant: no file in `src/` reads it.

## What is being built

Two pages under `/ops/tenants` that let BeOrchid staff see every agency on the
platform with its headline numbers, work the demo-request queue, and provision
a tenant end to end — create the agency, invite its first person, seat them as
owner, set what they bought, and suspend or restore them.

## The boundary this must not cross

Version 1.3 moved review into the agency and deleted the console's case queue
and case-detail screens. `src/app/[locale]/ops/page.tsx` records why: those
screens loaded documents directly rather than through
`requireApplicationAccess`, which made them the gap in the boundary rather than
merely pages nobody should open.

This design puts a new console screen next to that decision, so the rule is
stated as a contract on the data module rather than left as an intention:

> `src/lib/data/tenants.ts` selects `count(*)` from `applications` and never a
> row. No `case_ref`, no `traveler_id`, no status per case, no document.

Ops learns that an agency has 41 applications and that 6 are with a reviewer.
It cannot learn whose. Widening that later is a visible edit to a written rule
in one file, not one more column added to a select.

## Decisions taken

### Aggregate counts, not drill-through

The tenant row shows: members, seats used against seats purchased, total
applications, and a four-way split — in progress (`draft`,
`collecting_documents`, `additional_documents`), with a reviewer (`submitted`,
`under_review`), approved, rejected.

`applications.orgId` is `notNull`, so every application belongs to exactly one
agency and the platform total is the sum of the tenant totals with no orphan
bucket to explain.

Considered and rejected: a per-tenant case list showing refs and statuses but
no documents. It reads as harmless and it is not — it reintroduces the shape of
the screen v1.3 deleted, and the next reasonable-sounding request is a link
from the ref to the case.

### Two pages, not one

`/ops/tenants` is the scan: a counter row, the tenants table, and the
demo-request panel beneath it.

`/ops/tenants/[id]` is the tenant: the same counts, the member roster with
roles, pending invitations, and every write control.

The same split as `/ops/corridors` and `/ops/corridors/[id]`, for the same
reason — a table row is too small to hold a confirmed, audited write, and a
list of twenty agencies each carrying six controls is a screen nobody can read.

`opsNav` gains `/ops/tenants` as its **second** entry. `AppNav.isActive`
matches item 0 exactly as the section root and every other item on its
children, so `/ops/corridors` stays first; `ops-nav.test.ts` asserts this and
gains a case for the new entry.

### The first owner: invite, then promote

`acceptInvitationTx` seats a `kind: 'staff'` invitee as `reviewer`, and says
why (`src/lib/data/invitations.ts`):

> A colleague gets a seat, not a case. `reviewer` rather than `owner`: an
> invitation cannot mint someone with the authority to bill and to invite,
> which has to stay with the person who already has it.

Provisioning does not touch that. Ops creates the agency and sends a staff
invitation; the invitee accepts and is seated `reviewer` exactly as today; ops
then promotes them to owner from the tenant page. Two acts, both audited, and
the invariant stays literally true — no invitation in this product mints an
owner.

The alternative considered was an `org_role` column on `invitations`,
defaulted to `reviewer` and settable only by a staff action. One step instead
of two, at the cost of making every invitation a thing that *could* mint an
owner and relying on the setter to be the only gate. Rejected: the two-step
flow costs ops one click on a rare action.

### One deliberate exception, recorded where it is excluded

```ts
export const canManageInvitations = isOrgMemberOf; // platform staff deliberately excluded
```

Ops sending an agency's first invitation is precisely what that comment
excludes, so the comment has to change or it becomes a lie the next reader
believes.

What does **not** change is the predicate. `canManageInvitations` keeps its
definition and keeps excluding staff: every invitation surface an agency
operates — invite, resend, revoke, the roster — stays closed to BeOrchid.

A `canProvisionTenants(actor)` predicate was considered and dropped. It could
only be `isStaff(actor)`, and every caller sits behind `requireStaffAction()`,
which already admits nobody else — so it would be a function that can only
return `true`, read as a check while checking nothing. A tautology in
`policy.ts` is worse than no entry there at all, because `policy.ts` is the
file people trust.

Instead the comment is rewritten to name the one exception, where it lives, and
what gates it: the first invitation at provisioning time, written by
`provisionTenantTx` under `requireStaffAction()`. Greping for why staff can
invite here lands on the answer.

### Every tenant write is staff-gated, none is owner-gated

All actions open with `requireStaffAction()` — staff plus a second factor, in
the shape an action can return. `canWriteCorridors` stays the only owner-gated
thing in the console.

The reasoning: an approved corridor changes what every traveller on a route is
told to bring, which is why it is owner-only. A tenant write changes one
customer's account, is fully audited, and is reversible. Making it owner-only
would mean a single person is the bottleneck for provisioning a customer who
signed today.

### Demo requests gain a status and a link to what they became

Migration:

- `demo_request_status` enum — `new`, `contacted`, `scheduled`, `converted`,
  `declined`; column `status` defaults to `new`
- `converted_org_id uuid references organisations(id) on delete set null`

`on delete set null` rather than `cascade`: an organisation is never deleted in
this product, and if one ever were, losing the record that a demo happened is a
worse outcome than a dangling null.

The table's existing comment argues at length that a status column would
describe a workflow that does not exist. That comment is rewritten in the same
commit — a spec that leaves the schema arguing against the schema is a trap for
the next reader.

### Provisioning is one transaction; the email is not in it

`provisionTenantTx(input, actorId)` creates the organisation, inserts the
invitation, and — when the provisioning started from a demo request — stamps
that request `converted` with its `converted_org_id`, all in one transaction.
A half-provisioned tenant (an agency with no invited owner, or a request marked
converted pointing at nothing) is therefore not a reachable state.

It inserts the invitation row directly rather than calling `createInvitation`,
for two reasons: that function runs against `db` and cannot join a transaction,
and its duplicate-pending-invitation guard is vacuous against an organisation
created three statements earlier. Token and expiry are still left to the column
defaults, so this function decides nothing `createInvitation` decides.

`sendEmail` runs **after** the transaction commits. Inside it, a later rollback
would leave a live invitation link in somebody's inbox pointing at an agency
that does not exist.

### Seats mean agency staff

`seatsPurchased` sits beside `billingContact` on `organisations`, and
`src/lib/data/billing.ts` never reads it. This design reads a seat as a member
of the agency, so seats-used is the `org_members` count.

Flagged during brainstorming and approved as-is. If a seat is later decided to
mean a traveller case instead, the change is the seats-used expression in
`listTenants` and `getTenant` and nothing else — no migration, no UI change
beyond the number.

## Components

### `src/lib/data/tenants.ts` (new)

| Function | Purpose |
|---|---|
| `listTenants()` | Every agency with its counts, newest first |
| `getTenant(orgId)` | One agency, its counts, its roster, its pending invitations |
| `provisionTenantTx(input, actorId)` | Create agency + first invitation (+ stamp demo request), one transaction |
| `setTenantSuspension(orgId, suspend)` | Set or clear `suspendedAt` |
| `setTenantBilling(orgId, seatsPurchased, billingContact)` | Edit what they bought |
| `setMemberRole(orgId, userId, role)` | Promote to owner, or demote to reviewer |

`listTenants` is one query: `organisations` LEFT JOIN aggregate subqueries for
member count, application counts by status bucket, and pending-invitation
count. LEFT JOIN, not INNER — a tenant provisioned this morning with zero
applications must still appear, and an INNER JOIN would silently hide exactly
the tenants ops most needs to see. No per-tenant follow-up query.

`setMemberRole` refuses to demote an agency's last owner. An agency with only
reviewers can invite nobody and change no billing, and the only way back is a
staff member noticing.

### `src/lib/data/demo-requests.ts` (new)

`listDemoRequests()` newest first, and `setDemoRequestStatus(id, status)`. The
conversion path does not live here — it is inside `provisionTenantTx`, because
it has to share that transaction.

### `src/app/[locale]/ops/tenants/actions.ts` (new)

`provisionTenant`, `suspendTenant`, `restoreTenant`, `setTenantBilling`,
`setTenantMemberRole`, `setDemoRequestStatus`.

Each opens with `requireStaffAction()`, then `track()`, then `audit()`, then
revalidates. Suspension and restoration also `revalidatePath("/[locale]/app", "layout")`
— they change what `liveOrgIdsFor` returns, so an agency's members must not
keep reading a layout cached while their tenant was live.

### `src/lib/analytics/events.ts`

Six names added to the union: `toplance.tenant_provisioned`,
`toplance.tenant_suspended`, `toplance.tenant_restored`,
`toplance.tenant_seats_changed`, `toplance.tenant_member_role_changed`,
`toplance.demo_request_status_changed`. The union makes a typo a compile error;
`events.test.ts` asserts the `app.object_action` format.

### `src/lib/i18n/ops-tenants.ts` (new)

Same shape as `ops-corridors.ts`: a typed object of `Record<Locale, string>`
across all ten locales, marked `NEEDS NATIVE REVIEW`, translated in-house.
`OPS_COMMON.nav` gains a `tenants` label. Action error strings go in
`OPS_ACTIONS`, where the corridor actions' strings already are.

This is the largest single volume of work in the change and none of it is
interesting.

## Data flow

Provisioning from a demo request:

1. Staff opens `/ops/tenants`, sees the request in the panel, clicks Provision
2. The form opens pre-filled from the request — company name, contact name, email
3. `provisionTenant` → `requireStaffAction()`
4. `provisionTenantTx`: insert `organisations`, insert `invitations`
   (`kind: 'staff'`, `invitedBy` = the staff user), update `demo_requests`
5. Commit, then `sendEmail` with the existing `invitationEmail` template
6. `track` + `audit`, revalidate `/[locale]/ops`
7. The invitee opens `/invite/[token]`, accepts, is seated `reviewer` by the
   untouched `acceptInvitationTx`
8. Staff opens the tenant page and promotes them to owner

## Error handling

Actions return `{ error: string }` in the locale of the request, the shape the
ops actions already use and the ops forms already surface. `audit()` swallows
its own failures by design and that stays true. Both pages open with
`hasDatabaseEnv` → `<SetupNotice />` and the `requireStaffConsole` three-way
decision (`ok` / `refuse` → `<StaffAccessRefused />` / `enroll` →
`<StaffEnrollmentRequired />`), exactly as `/ops/corridors` does.

## Testing

`src/lib/data/tenants.test.ts`

- a tenant with zero applications appears in `listTenants` with zeroes
- a suspended tenant still reports its counts and is flagged suspended
- the status buckets add up to the total across all seven enum values
- `provisionTenantTx` rolls the organisation back when the invitation insert fails
- `provisionTenantTx` stamps the demo request only when one was passed
- `setMemberRole` is idempotent, and refuses to demote the last owner

`src/lib/data/demo-requests.test.ts`

- listing is newest first
- status transitions persist
- a converted request carries the organisation it became

`src/components/ops/ops-nav.test.ts`

- the new entry exists, `/ops/corridors` is still item 0, and the existing
  assertion that no nav href reaches a case still passes

## Out of scope

- Any per-case view for ops
- Deleting an organisation — suspension is the removal, by design
- Ops editing an agency's own data, corridors or documents
- The audit-log reader the nav comment also mentions
