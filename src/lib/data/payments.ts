import "server-only";

import { and, desc, eq, gt, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { payments } from "@/lib/db/schema";
import type { PaymentKind, PaymentStatus } from "@/lib/payments/provider";

export type Payment = typeof payments.$inferSelect;

/**
 * Reading and writing the one record that anybody paid for anything.
 *
 * There is no `subscription_status` on `organisations` and no `paid`
 * flag on `applications`, deliberately. Entitlement is derived here,
 * from rows that are never edited after they settle: a status column in
 * two places is a status column that disagrees with itself the first
 * time a payment lands and the second write does not.
 *
 * Both reads below are on the path of every gated request — the agency's
 * on every console page, the client's on every `/app` page — which is
 * why `payments` carries an index for each.
 */

export type RecordPaymentInput = {
  kind: PaymentKind;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  /** Set on a subscription, and never together with `applicationId`. */
  orgId?: string | null;
  /** Set on a client payment, and never together with `orgId`. */
  applicationId?: string | null;
  payerId: string;
  rateCardId?: string | null;
  provider: string;
  providerRef?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
};

/**
 * Write one payment.
 *
 * `paid_at` is stamped here rather than passed in, so the time a payment
 * settled is the database's answer and not a caller's. The shape check
 * on the table is what stops a subscription that names an application,
 * so this function does not re-litigate it — a malformed call raises,
 * loudly, at the place that wrote it.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const [row] = await db
    .insert(payments)
    .values({
      kind: input.kind,
      status: input.status,
      amountMinor: input.amountMinor,
      currency: input.currency,
      orgId: input.orgId ?? null,
      applicationId: input.applicationId ?? null,
      payerId: input.payerId,
      rateCardId: input.rateCardId ?? null,
      provider: input.provider,
      providerRef: input.providerRef ?? null,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      paidAt: input.status === "paid" ? new Date() : null,
    })
    .returning();

  return row;
}

/**
 * The agency's live subscription, or `null`.
 *
 * "Live" is three conditions and all of them matter: paid rather than
 * pending or failed, a subscription rather than a client's fee, and an
 * end date still ahead of us. A row that has lapsed is history, not
 * entitlement — nothing renews, by design, so an agency that stops
 * paying stops passing this.
 */
export async function activeSubscription(
  orgId: string,
  at: Date = new Date()
): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.orgId, orgId),
        eq(payments.kind, "agency_subscription"),
        eq(payments.status, "paid"),
        isNotNull(payments.periodEnd),
        gt(payments.periodEnd, at)
      )
    )
    .orderBy(desc(payments.periodEnd))
    .limit(1);

  return row ?? null;
}

export async function hasActiveSubscription(
  orgId: string,
  at: Date = new Date()
): Promise<boolean> {
  return (await activeSubscription(orgId, at)) !== null;
}

/**
 * Whether this application has been paid for.
 *
 * Any paid row settles it, including the zero-amount `backfill` rows the
 * migration writes for every application that predates the paywall.
 * That is intended: those travellers were sponsored under the old model
 * and must not meet a payment screen in the middle of their own case.
 */
export async function isApplicationPaid(applicationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.applicationId, applicationId),
        eq(payments.kind, "client_application"),
        eq(payments.status, "paid")
      )
    )
    .limit(1);

  return !!row;
}

/** An agency's own payment history, newest first — what `/agency/billing` lists. */
export async function listPaymentsForOrg(orgId: string): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.orgId, orgId))
    .orderBy(desc(payments.createdAt));
}
