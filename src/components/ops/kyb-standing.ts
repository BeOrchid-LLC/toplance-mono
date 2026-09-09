import type { KybStanding } from "@/lib/domain/kyb";
import { OPS_KYB } from "@/lib/i18n/ops-kyb";

/**
 * Which colour a KYB standing wears, and the key its word lives under.
 *
 * Its own module because two files render it — the queue's `state`
 * column and the agency page's header badge — and a screen where the
 * same agency is amber in a list and green on its own page is worse
 * than one with no colour at all.
 *
 * `ready` is the only `info`: it is the row waiting on a person in this
 * console, and making it findable is the point of the column.
 * `activated` is `success`, and `not_started` is deliberately plain —
 * an agency that has sent nothing is a fact, not a problem.
 */
export const KYB_STANDING: Record<
  KybStanding,
  { key: keyof typeof OPS_KYB.standing; variant: "neutral" | "info" | "success" }
> = {
  not_started: { key: "notStarted", variant: "neutral" },
  in_review: { key: "inReview", variant: "neutral" },
  ready: { key: "ready", variant: "info" },
  activated: { key: "activated", variant: "success" },
};
