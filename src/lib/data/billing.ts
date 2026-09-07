import "server-only";

import { and, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, billingRateCards, documents } from "@/lib/db/schema";
import {
  DEFAULT_RATE_CARD,
  cycleFor,
  parseRateCard,
  quote,
  type BillingCycle,
  type Quote,
  type RateCard,
} from "@/lib/domain/pricing";

// The arithmetic lives in `@/lib/domain/pricing` — pure and I/O-free, so
// the marketing estimator and the employer console can both import it
// without pulling `db` into the browser bundle. Re-exported here so this
// module stays the one place the rates and their use are read together,
// the same arrangement `transitions.ts` has with `STAFF_TRANSITIONS`.
export { cycleFor, quote, formatMoney } from "@/lib/domain/pricing";
export type { Quote, RateCard, BillingCycle } from "@/lib/domain/pricing";

/**
 * The rates in force right now.
 *
 * Falls back to `DEFAULT_RATE_CARD` when the table is empty — a fresh
 * database still quotes correctly rather than billing everyone nothing,
 * which is the failure mode that would look like it worked.
 */
export async function activeRateCard(at: Date = new Date()): Promise<RateCard> {
  const [row] = await db
    .select()
    .from(billingRateCards)
    .where(lte(billingRateCards.effectiveFrom, at))
    .orderBy(desc(billingRateCards.effectiveFrom))
    .limit(1);

  if (!row) return DEFAULT_RATE_CARD;

  // Parsed, not cast. `bands` is a JSON column that a human is expected
  // to edit; `parseRateCard` throws on a card that would under-bill
  // rather than letting it quote a smaller number than the rates say.
  return parseRateCard(row);
}

/**
 * Stamp `billable_at` if this application has just become billable, and
 * do nothing at all otherwise.
 *
 * Called at the end of every transaction that moves a document's state —
 * the pre-check and the reviewer's verdict — because "the checklist is
 * complete" is not a thing the application knows about itself.
 *
 * Two conditions, and each is load-bearing:
 *
 *  - **`billable_at is null`**, enforced in the UPDATE's own WHERE rather
 *    than checked first. Two documents verified concurrently would both
 *    see a complete checklist; only one row update can win.
 *  - **every required document verified**, which is a reviewer's
 *    verdict on each one, not `completionOf`'s 100%. The ring measures
 *    collecting; this measures finishing, and they parted company on
 *    6 September.
 *
 * Takes the transaction it is called inside so the stamp commits with
 * the document write that caused it: a crash between the two would
 * otherwise leave a complete checklist that never bills.
 */
export async function markBillableIfComplete(
  tx: Pick<typeof db, "select" | "update">,
  applicationId: string
): Promise<{ becameBillable: boolean }> {
  const [app] = await tx
    .select({ billableAt: applications.billableAt })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  // The third condition used to be `org_id is not null` — "a traveller
  // who signed up directly is nobody's client". Since the v1.3 tenancy
  // that state does not exist: every case belongs to an agency, and the
  // column is `not null`.
  if (!app || app.billableAt) return { becameBillable: false };

  const rows = await tx
    .select({ state: documents.state, isRequired: documents.isRequired })
    .from(documents)
    .where(eq(documents.applicationId, applicationId));

  const required = rows.filter((d) => d.isRequired);
  if (required.length === 0) return { becameBillable: false };

  // Verified, not collected. Decision 4 of 6 September: an application
  // "finishes" when every document has passed its check — an invitation
  // nobody accepted, a checklist still being filled and one whose
  // documents came back rejected are never charged. A flagged document
  // is the reviewer saying this is not done, so it holds the meter.
  //
  // The cost was named and accepted: the party being billed decides when
  // it is billed, and an agency that never reviews is never charged.
  // There is deliberately no timer and no auto-verify.
  const done = required.filter((d) => d.state === "verified").length;
  if (done < required.length) return { becameBillable: false };

  const updated = await tx
    .update(applications)
    .set({ billableAt: new Date() })
    .where(and(eq(applications.id, applicationId), isNull(applications.billableAt)))
    .returning({ id: applications.id });

  return { becameBillable: updated.length > 0 };
}

export type CycleUsage = {
  cycle: BillingCycle;
  /** Applications that became billable inside this cycle. */
  applications: number;
  quote: Quote;
};

/**
 * What this business has run up so far in the cycle it is in.
 *
 * Peace: "Show each business its running count and current estimated
 * charge for the cycle, so there are no surprises at billing time."
 *
 * An application counts in the cycle it was *completed* in, even if it
 * was started in an earlier one — which is what keying the range on
 * `billable_at` rather than `created_at` gets us, for free.
 */
export async function cycleUsage(
  orgId: string,
  anchor: Date,
  now: Date = new Date()
): Promise<CycleUsage> {
  const cycle = cycleFor(anchor, now);
  const card = await activeRateCard(now);

  const [row] = await db
    .select({ n: count() })
    .from(applications)
    .where(
      and(
        eq(applications.orgId, orgId),
        gte(applications.billableAt, cycle.start),
        // `end` is exclusive, so an application completed at the instant
        // the next cycle opens belongs to that one, not this.
        sql`${applications.billableAt} < ${cycle.end}`
      )
    );

  const applicationCount = row?.n ?? 0;

  return { cycle, applications: applicationCount, quote: quote(applicationCount, card) };
}
