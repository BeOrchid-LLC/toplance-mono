# Pricing and Mock Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agency buys a subscription before its console opens, and an invited client buys their application before intake — paid through a faked provider that a real one can replace without touching a call site.

**Architecture:** A `payments` table records every transaction; entitlement is *derived* from it rather than stored on `organisations` or `applications`. A `PaymentProvider` interface with a `MockProvider` behind it sits where Stripe will go. Two pure decision functions gate the two consoles, tested without a database.

**Tech Stack:** Next.js App Router (see `node_modules/next/dist/docs/`), Drizzle ORM + Postgres, Clerk, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-pricing-and-mock-checkout-design.md`

## Global Constraints

- Money is in **minor units** everywhere. Floats never touch a bill.
- Table names lowercase, snake_case, **plural** (`payments`).
- Analytics events are `app.object_action`, added to the union in `src/lib/analytics/events.ts` or they do not compile.
- Every user-facing string is `Record<Locale, string>` across all 10 locales — a missing locale is a compile error.
- The migration is **0028**; `0027_wide_talos.sql` is unrelated in-flight work already in the tree.
- Amounts are re-derived server-side from the active rate card. The browser never names a price.
- `npm run test` must be run as `npx vitest run --maxWorkers=3` — this suite leaks fixtures under full parallelism.

---

### Task 1: `client_fee_minor` on the rate card

**Files:**
- Modify: `src/lib/domain/pricing.ts`
- Modify: `src/lib/db/schema.ts` (`billingRateCards`)
- Test: `src/lib/domain/pricing.test.ts`

**Interfaces:**
- Produces: `RateCard.clientFeeMinor: number`; `subscriptionCharge(card: RateCard): number`; `clientCharge(card: RateCard): number`.

- [ ] **Step 1: Write the failing tests** in `pricing.test.ts`:

```ts
it("parses a card's client fee", () => {
  const card = parseRateCard({ baseFeeMinor: 300_00, currency: "USD", bands: [{ upTo: null, rateMinor: 18_00 }], clientFeeMinor: 25_00 });
  expect(card.clientFeeMinor).toBe(25_00);
});

it("refuses a card with a negative client fee", () => {
  expect(() => parseRateCard({ baseFeeMinor: 300_00, currency: "USD", bands: [{ upTo: null, rateMinor: 18_00 }], clientFeeMinor: -1 })).toThrow();
});

it("charges the base fee for a subscription and the flat fee for a client", () => {
  expect(subscriptionCharge(DEFAULT_RATE_CARD)).toBe(DEFAULT_RATE_CARD.baseFeeMinor);
  expect(clientCharge(DEFAULT_RATE_CARD)).toBe(DEFAULT_RATE_CARD.clientFeeMinor);
});
```

- [ ] **Step 2: Run and watch them fail** — `npx vitest run src/lib/domain/pricing.test.ts`
- [ ] **Step 3: Add `clientFeeMinor` to `RateCard`, `DEFAULT_RATE_CARD` and `parseRateCard`'s validation**, and the two one-line charge functions. `quote()` is untouched.
- [ ] **Step 4: Add the column** to `billingRateCards`: `clientFeeMinor: integer().notNull().default(0)`.
- [ ] **Step 5: Run the tests** — green.
- [ ] **Step 6: Commit** `feat(pricing): price a client application on the rate card`

---

### Task 2: The `payments` table

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `src/lib/data/payments.ts`
- Test: `src/lib/data/payments.test.ts`
- Create: `drizzle/0028_*.sql` (generated)

**Interfaces:**
- Produces: `recordPayment(input): Promise<Payment>`; `hasActiveSubscription(orgId: string, at?: Date): Promise<boolean>`; `isApplicationPaid(applicationId: string): Promise<boolean>`; `listPaymentsForOrg(orgId)`.

- [ ] **Step 1: Add the enums and table** to `schema.ts`, exactly as the spec's schema section describes — `paymentKind`, `paymentStatus`, `payments`, the `payment_shape_matches_kind` check, and both indexes.
- [ ] **Step 2: Generate and apply** — `npm run db:generate && npm run db:migrate`. Confirm the file is `0028_*` and contains only the payments objects plus `client_fee_minor`.
- [ ] **Step 3: Write the failing data tests** covering: both malformed shapes rejected by the check constraint; `hasActiveSubscription` false for pending / failed / expired and true only for a live paid row; `isApplicationPaid` true only after a paid row.
- [ ] **Step 4: Run them and watch them fail.**
- [ ] **Step 5: Implement `src/lib/data/payments.ts`.** `"server-only"` at the top, like every other module in `lib/data`.
- [ ] **Step 6: Run** `npx vitest run src/lib/data/payments.test.ts --maxWorkers=3` — green.
- [ ] **Step 7: Commit** `feat(pricing): record payments and derive entitlement from them`

---

### Task 3: The provider seam

**Files:**
- Create: `src/lib/payments/provider.ts`, `src/lib/payments/mock.ts`, `src/lib/payments/index.ts`
- Test: `src/lib/payments/mock.test.ts`

**Interfaces:**
- Produces: `type PaymentIntent = { kind: PaymentKind; amountMinor: number; currency: string; reference: string }`; `type PaymentProvider = { name: string; createCheckout(i: PaymentIntent): Promise<{ providerRef: string; redirectUrl: string | null }>; confirm(ref: string): Promise<{ status: PaymentStatus }> }`; `paymentProvider(): PaymentProvider`.

- [ ] **Step 1: Write the failing tests** — the mock mints a `mock_`-prefixed ref, confirms as `paid`, and **throws in a production build** unless `PAYMENTS_ALLOW_MOCK=1`.
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement the three files.** The production guard mirrors `staffTwoFactorSkipped()` in `src/lib/auth/staff-gate.ts` — read it first and copy its shape.
- [ ] **Step 4: Run the tests** — green.
- [ ] **Step 5: Commit** `feat(pricing): a payment provider seam with a mock behind it`

---

### Task 4: The two gates, as pure functions

**Files:**
- Create: `src/lib/payments/gates.ts`
- Test: `src/lib/payments/gates.test.ts`

**Interfaces:**
- Produces: `decideAgencyBilling({ hasOrganisation, subscriptionActive }): "name-organisation" | "checkout" | "ok"`; `decideClientPaywall({ applicationPaid }): "checkout" | "ok"`.

- [ ] **Step 1: Write the failing tests** — every cell of both tables. No organisation outranks no subscription (you cannot buy a plan for an agency that does not exist yet).
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement.** Pure; no imports beyond types.
- [ ] **Step 4: Run** — green.
- [ ] **Step 5: Commit** `feat(pricing): decide the two paywalls as pure functions`

---

### Task 5: Hold an unpaid agency at billing

**Files:**
- Modify: `src/app/[locale]/agency/console.ts` (`resolveAgencyConsole`, `requireAgencyConsole`)
- Create: `src/app/[locale]/agency/billing/page.tsx`, `src/app/[locale]/agency/billing/actions.ts`
- Modify: `src/lib/i18n/agency.ts`, `src/components/agency/agency-nav.ts`

- [ ] **Step 1:** `resolveAgencyConsole` resolves `subscriptionActive` via `hasActiveSubscription(orgId)` and returns it on `AgencyConsole`.
- [ ] **Step 2:** `requireAgencyConsole` calls `decideAgencyBilling` and `redirect("/agency/billing")` on `"checkout"`.
- [ ] **Step 3: Build `/agency/billing`.** It resolves the console itself and must **not** call `requireAgencyConsole` — that would redirect to itself. Shows the plan, the price from `activeRateCard()`, a Pay button, and past payments.
- [ ] **Step 4: `purchaseSubscription` action** — `requireActor`, org from `actor.orgIds[0]`, amount re-derived from the active card, `paymentProvider().createCheckout()`, `recordPayment(...)` with `period_start = now`, `period_end = now + 1 month`, then `audit()` and `track("toplance.subscription_purchased")`.
- [ ] **Step 5: Add the nav entry and every string** across all 10 locales.
- [ ] **Step 6: Run** `npx tsc --noEmit` and the suite — green.
- [ ] **Step 7: Commit** `feat(pricing): an agency buys its subscription before the console opens`

---

### Task 6: Hold an unpaid client at checkout

**Files:**
- Modify: `src/app/[locale]/(app)/layout.tsx`
- Create: `src/app/[locale]/(app)/app/checkout/page.tsx`, and the action beside it
- Modify: `src/lib/i18n/` (a new `checkout.ts`)

- [ ] **Step 1:** The layout already loads the application. Add `isApplicationPaid`, call `decideClientPaywall`, and `redirect("/app/checkout")` on `"checkout"`.
- [ ] **Step 2:** The checkout page is inside `(app)` but must not bounce itself — guard on the pathname, or place it outside the gated segment. Prefer the latter: no conditional inside a layout that every other page depends on.
- [ ] **Step 3: `purchaseApplication` action** — amount from `clientCharge(await activeRateCard())`, `application_id` from the caller's own application (never from the form), refuse a second payment for an application already paid.
- [ ] **Step 4: All strings, 10 locales.**
- [ ] **Step 5: Run** typecheck + suite — green.
- [ ] **Step 6: Commit** `feat(pricing): a client buys their application before intake`

---

### Task 7: Do not invite a client into an unpaid agency

**Files:**
- Modify: `src/app/[locale]/agency/actions.ts` (`inviteTraveller`)
- Modify: `src/lib/i18n/agency-actions.ts`

- [ ] **Step 1: Write the failing test** — `inviteTraveller` refuses with a clear message while the agency has no active subscription.
- [ ] **Step 2: Run and watch it fail.**
- [ ] **Step 3: Implement** — the check sits after `requireOrgAccess`, before `createInvitation`.
- [ ] **Step 4: Run** — green.
- [ ] **Step 5: Commit** `feat(pricing): an unpaid agency cannot invite clients`

---

### Task 8: Events, audit, and the ops subscription line

**Files:**
- Modify: `src/lib/analytics/events.ts`, `src/app/[locale]/ops/tenants/[id]/page.tsx`, `src/lib/data/tenants.ts`, `src/lib/i18n/ops-tenants.ts`

- [ ] **Step 1:** Add `toplance.checkout_started`, `toplance.subscription_purchased`, `toplance.application_purchased` to the union with doc comments in the file's existing style. `events.test.ts` asserts the format and will catch a malformed name.
- [ ] **Step 2:** `/ops/tenants/[id]` reads and displays "paid until <date>" or "unpaid". Read-only — BeOrchid does not sell here.
- [ ] **Step 3: Run** the suite — green.
- [ ] **Step 4: Commit** `feat(pricing): report subscription state to BeOrchid`

---

### Task 9: The marketing copy the build plan parked

**Files:**
- Modify: `src/app/[locale]/(site)/page.tsx`, `src/lib/i18n/site-home.ts`, `src/lib/i18n/site-travelers.ts`

- [ ] **Step 1:** The `#pricing` section shows the client fee beside the agency bands, both from the live rate card.
- [ ] **Step 2:** Rewrite the traveller pricing answer. It currently reads *"Nothing… You pay when you ask us to handle an application"* — which becomes true, but should now name the fee rather than imply a vague future one. All 10 locales.
- [ ] **Step 3: Commit** `feat(pricing): show the client fee on the public site`

---

### Task 10: Backfill and end-to-end

**Files:**
- Modify: the `0028` migration
- Create: `e2e/pricing.spec.ts`

- [ ] **Step 1:** Append to the migration an insert marking every existing application paid, so nobody mid-application meets a paywall inside their own case.
- [ ] **Step 2: Write the e2e spec** — an agency signs up, is held at billing, pays, reaches the console; an invited client signs up, accepts, is held at checkout, pays, reaches intake.
- [ ] **Step 3: Run** `npx playwright test e2e/pricing.spec.ts`.
- [ ] **Step 4: Commit** `test(pricing): cover both purchase paths end to end`
