import { Badge } from "@/components/ui/badge";
import type { AgencyStatus } from "@/lib/domain/agency-status";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/**
 * Which colour each lifecycle status wears.
 *
 * One map, read by the agencies table, an agency's own page and the KYB
 * queue, so the same agency is never green in one list and amber on its
 * own page. Only `live` is green; the two that want a person's attention
 * — a plan that ran out, an agency that was shut — are the warm ones.
 */
export const AGENCY_STATUS_VARIANT = {
  onboarding: "neutral",
  awaiting_payment: "info",
  live: "success",
  lapsed: "warning",
  suspended: "danger",
} as const satisfies Record<AgencyStatus, string>;

export function AgencyStatusBadge({
  status,
  locale,
}: {
  status: AgencyStatus;
  locale: Locale;
}) {
  return (
    <Badge variant={AGENCY_STATUS_VARIANT[status]}>{OPS_TENANTS.status[status][locale]}</Badge>
  );
}
