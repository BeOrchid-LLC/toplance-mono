# Pricing, entitlement and mock checkout

**Date:** 2026-09-07
**Status:** design, decided in chat — awaiting spec review
**Scope:** turn the pricing display into a purchase. An agency buys a
subscription before its console opens; an invited client buys their application
before intake. Payments are faked, behind a seam a real provider can replace.

## Why pricing does not work today

It was never wired to money, in four separate places:

- `quote()` has exactly two callers, both on the marketing home page. No console
  imports it, so nobody is shown a number they owe.
- There is no payment integration at all — no provider dependency, no checkout
  route, no webhook, and no table recording that anyone paid anything.
  `billing_rate_cards` stores rates; nothing stores a transaction.
- There is no entitlement to check. `markBillableIfComplete` stamps
  `applications.billable_at` and nothing reads it. `organisations.seats_purchased`
  is typed in by a BeOrchid staffer in `/ops/tenants` — an admin note, not a
  purchase, consulted by no guard.
- The paywall has nowhere to stand. An agency self-signs-up and gets the full
  console at `seats_purchased = 0`; a client exists only because an agency
  invited them.

## Decisions taken

| Question | Answer |
|---|---|
| Who pays | Both, separately — the agency for its console, the client for their application |
| Agency buys | A monthly subscription at the rate card's `base_fee_minor`. Per-application bands keep accruing on top and are shown, not charged |
| Client buys | One flat fee per application, a new `client_fee_minor` on the rate card |
| Client door | Unchanged — invite only. The agency invites; the client then pays for their own application instead of being sponsored |
| Payments | Faked now, behind a provider seam, with provider ids stored from day one |
| Enforcement | Hard. Sign up → buy → proceed. No trial, no grace period |

### What this settles in the existing copy

The build plan lists the traveller pricing FAQ — *"Nothing… You pay when you ask
us to handle an application"* — under **Deliberately not done**, as copy written
for a traveller who pays, left standing under a model where they never do. That
sentence becomes true again. The `paid: true/false` markers on the "how it
works" steps also start falling somewhere real. Both are in scope here; the
`LEDGER` rows arguing against paying an agent are not.

## Schema

One migration. Amounts stay in minor units throughout.

1. `billing_rate_cards.client_fee_minor integer not null default 0` — what one
   client pays for one application. On the rate card rather than in code, for
   the reason the table already exists: rates are provisional and must be
   editable without a deploy.
2. `payment_kind` enum — `agency_subscription`, `client_application`.
3. `payment_status` enum — `pending`, `paid`, `failed`.
4. `payments` table (plural, per the platform convention):
   - `id`, `kind`, `status` (default `pending`), `amount_minor`, `currency`
   - `org_id` → `organisations`, null on a client payment
   - `application_id` → `applications`, null on a subscription
   - `payer_id` → `profiles`, the human who pressed the button
   - `rate_card_id` → `billing_rate_cards`: which rates priced this. Same
     reasoning as `effective_from` — a charge you can re-derive is one you can
     explain
   - `provider text not null default 'mock'`, `provider_ref text` — the seam,
     populated from the first commit so adopting Stripe adds no column
   - `period_start` / `period_end`, set on subscriptions only
   - `created_at`, `paid_at`
   - check `payment_shape_matches_kind`: `agency_subscription` ⇒ `org_id not
     null and application_id is null`; `client_application` ⇒ `application_id
     not null and org_id is null`
   - indexes on `(org_id, status)` and `(application_id, status)` — both are
     read on every gated request, and a missing index on a read this hot has
     already cost this suite 450 seconds once

**No `subscription_status` column on `organisations`.** Entitlement is derived —
`hasActiveSubscription(orgId)` is "a paid `agency_subscription` whose
`period_end` is in the future". A denormalised copy is a second source of truth
that drifts the first time a payment lands and the update does not.

## The provider seam — `src/lib/payments/`

```
provider.ts   PaymentProvider interface + the intent/result types
mock.ts       MockProvider — succeeds immediately, mints a mock_ ref
index.ts      picks by PAYMENTS_PROVIDER, defaulting to "mock"
```

`createCheckout(intent)` → `{ providerRef, redirectUrl }`, `confirm(ref)` →
`{ status }`. The mock returns paid on the spot; Stripe would return a Checkout
URL and settle on a webhook. This is the arrangement `track()` already has with
analytics vendors: adopting one is a second implementation behind the
interface, not a change at every call site.

**The mock refuses to run in a production build** whatever the environment says,
unless `PAYMENTS_ALLOW_MOCK=1` — the same shape as `staffTwoFactorSkipped()`.
A fake payment path that survives into production is the one failure here that
cannot be undone by a deploy.

## Pricing domain — `src/lib/domain/pricing.ts`

`RateCard` gains `clientFeeMinor`; `parseRateCard` learns to validate it and
keeps throwing on a card that would under-bill. `quote()` is untouched — the
agency's accruing per-application total still means what it meant. One new pure
function, `subscriptionCharge(card)`, so the checkout screens and the payment
writer agree on the figure without either importing `db`.

## Gates

Both are pure decision functions beside their guards, tested without a database
— the shape `decideStaffGate` established.

**Agency — `decideAgencyBilling({ hasOrganisation, subscriptionActive })`**
→ `"name-organisation" | "checkout" | "ok"`. Called from
`resolveAgencyConsole`, which already resolves membership on every console
page. `requireAgencyConsole` redirects an unpaid agency to `/agency/billing`.
That page must not itself use `requireAgencyConsole`, or an unpaid agency
redirects to the page that redirects it.

**Client — `decideClientPaywall({ applicationPaid })`** → `"checkout" | "ok"`,
called from the `(app)` layout, which already loads the application on every
traveller request. Everything under `/app` is behind it except `/app/checkout`
itself. The draft application is created before payment — `getApplication()`
opens one on sight — which is correct here: the payment has to attach to a row,
and an unpaid draft reaches nothing.

## Screens

- `/agency/billing` — what the plan costs, what it includes, a Pay button, and
  the payment history once there is any. The only agency page an unpaid agency
  can open.
- `/app/checkout` — the flat application fee, what it buys, a Pay button. The
  only `/app` page an unpaid client can open.
- Both post to server actions that call the provider, write the `payments` row,
  `audit()` it and `track()` it. Neither trusts the client for an amount:
  the figure is re-derived from the active rate card server-side.
- `/ops/tenants/[id]` gains a subscription line — paid until when, or unpaid.
  Reading it, not setting it.
- The home page's `#pricing` section gains the client fee beside the agency
  bands, and the traveller pages' pricing answer is rewritten to the truth.

## Analytics and audit

Three new events in the `events.ts` union, in `app.object_action`:
`toplance.checkout_started`, `toplance.subscription_purchased`,
`toplance.application_purchased`. Audit entries for both purchases, since a
payment is a fact somebody may later dispute.

## Testing

Pure, no database:
- `pricing.test.ts` — `clientFeeMinor` parsing, and `parseRateCard` still
  throwing on an under-billing card.
- `decideAgencyBilling` / `decideClientPaywall` — every cell, including the
  unpaid-agency-on-the-billing-page case that would otherwise loop.
- `MockProvider` — succeeds, mints a ref, and refuses under a production build
  without the escape hatch.

Against the local database:
- The check constraint rejects both malformed payment shapes.
- `hasActiveSubscription` is false for pending, failed, and expired
  `period_end`, and true only for a live paid row.
- A paid application stays paid; paying twice is refused rather than charged.

End to end: an agency signs up, is held at `/agency/billing`, pays, and reaches
the console; an invited client signs up, accepts, is held at `/app/checkout`,
pays, and reaches intake.

## Out of scope

Real Stripe; refunds; invoices and receipts; recurring renewal (a subscription
is bought once and expires — nothing re-charges); dunning or suspension for
non-payment, which stays BeOrchid's manual `suspendedAt` decision; the
per-application band charges actually being collected from an agency; a rate
card editor in `/ops`, which stays a SQL job.

## Risks and open points

- **A client invited by an unpaid or suspended agency.** The client's paywall
  and the agency's are independent, so a client could pay for a case nobody can
  work. The design blocks the invitation itself while an agency is unpaid —
  cheaper than refunding — but this is the interaction most worth a second
  opinion.
- **Existing travellers.** Anyone already mid-application when this ships has an
  unpaid draft and would hit a paywall inside a case they are halfway through.
  Pre-launch there is no production data, so the answer is a backfill marking
  existing applications paid, and the migration should carry it.
- **`markBillableIfComplete` now overlaps a real payment.** It stamps
  `billable_at` for the agency's accruing bands while the client pays a separate
  flat fee. Two meanings of "billable" in one schema; the column keeps its
  meaning and this spec adds no reader for it, but the naming will confuse
  somebody.
