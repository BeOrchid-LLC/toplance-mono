import { describePlanState, type PlanRecord } from "@/lib/payments/plan-state";

/**
 * Where an agency is in its life on the platform, as one word.
 *
 * Ops used to show `suspendedAt ? "Suspended" : "Live"`, which called an
 * agency that had never passed KYB or never paid "Live" — beside a plan
 * card reading "Unpaid". The client's review of 17 September (decision
 * D1, our recommended default, pending her confirmation) asked for one
 * derived status instead:
 *
 * | suspended_at | activated_at | subscription          | status             |
 * |--------------|--------------|-----------------------|--------------------|
 * | set          | any          | any                   | `suspended`        |
 * | null         | null         | any                   | `onboarding`       |
 * | null         | set          | never bought          | `awaiting_payment` |
 * | null         | set          | active now            | `live`             |
 * | null         | set          | bought, not active    | `lapsed`           |
 *
 * The order follows the agency console's own gate
 * (`decideAgencyBilling`): verification before payment. The subscription
 * facts are the same two `describePlanState` takes — `activeSubscription`'s
 * `period_end` and the latest paid plan — so "live" here is exactly the
 * entitlement that opens the console, never a second opinion about it.
 */
export const AGENCY_STATUSES = [
  "onboarding",
  "awaiting_payment",
  "live",
  "lapsed",
  "suspended",
] as const;
export type AgencyStatus = (typeof AGENCY_STATUSES)[number];

/** Lifecycle order, for a status column's sort. */
export const AGENCY_STATUS_RANK: Record<AgencyStatus, number> = Object.fromEntries(
  AGENCY_STATUSES.map((status, i) => [status, i])
) as Record<AgencyStatus, number>;

export function agencyStatus(input: {
  suspendedAt: Date | null;
  /** `organisations.activated_at` — KYB passed and the door opened. */
  activatedAt: Date | null;
  /** `activeSubscription(...)?.periodEnd`, or `null` with no active plan. */
  activeUntil: Date | null;
  /** The newest paid plan, active or not (`latestSubscription`). */
  latest: PlanRecord | null;
  now: Date;
}): AgencyStatus {
  if (input.suspendedAt) return "suspended";
  if (!input.activatedAt) return "onboarding";

  const plan = describePlanState({
    activeUntil: input.activeUntil,
    latest: input.latest,
    now: input.now,
  });

  switch (plan.kind) {
    case "never":
      return "awaiting_payment";
    case "running":
    case "ending-soon":
      return "live";
    case "lapsed":
    case "cancelled":
      return "lapsed";
  }
}
