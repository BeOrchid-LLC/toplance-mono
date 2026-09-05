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
 * Three conditions, and each is load-bearing:
 *
 *  - **`org_id` is not null.** A traveller who signed up directly is
 *    nobody's client, and there is no business to charge for them.
 *  - **`billable_at is null`**, enforced in the UPDATE's own WHERE rather
 *    than checked first. Two documents verified concurrently would both
 *    see a complete checklist; only one row update can win.
 *  - **every required document collected**, which is `completionOf`'s
 *    100% — uploaded and past pre-check.
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
    .select({ orgId: applications.orgId, billableAt: applications.billableAt })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!app || !app.orgId || app.billableAt) return { becameBillable: false };

  const rows = await tx
    .select({ state: documents.state, isRequired: documents.isRequired })
    .from(documents)
    .where(eq(documents.applicationId, applicationId));

  const required = rows.filter((d) => d.isRequired);
  if (required.length === 0) return { becameBillable: false };

  const collected = required.filter(
    (d) => d.state === "checking" || d.state === "verified"
  ).length;
  if (collected < required.length) return { becameBillable: false };

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
