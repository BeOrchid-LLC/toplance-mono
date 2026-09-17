import { describe, expect, it } from "vitest";

import {
  AGENCY_STATUSES,
  AGENCY_STATUS_RANK,
  agencyStatus,
} from "@/lib/domain/agency-status";

const DAY = 86_400_000;
const NOW = new Date("2026-09-17T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * DAY);

const base = {
  suspendedAt: null,
  activatedAt: days(-30),
  activeUntil: null,
  latest: null,
  now: NOW,
};

describe("agencyStatus", () => {
  it("is onboarding until KYB has activated the agency", () => {
    expect(agencyStatus({ ...base, activatedAt: null })).toBe("onboarding");
  });

  it("stays onboarding even if a plan is somehow already paid", () => {
    // The console's own gate asks for verification before payment
    // (`decideAgencyBilling`), so the lifecycle reads in that order too.
    expect(
      agencyStatus({
        ...base,
        activatedAt: null,
        activeUntil: days(20),
        latest: { periodEnd: days(20), cancelledAt: null },
      })
    ).toBe("onboarding");
  });

  it("is awaiting payment once activated, before any plan was bought", () => {
    expect(agencyStatus(base)).toBe("awaiting_payment");
  });

  it("is live with an active subscription", () => {
    expect(
      agencyStatus({
        ...base,
        activeUntil: days(20),
        latest: { periodEnd: days(20), cancelledAt: null },
      })
    ).toBe("live");
  });

  it("is still live in the last days of a plan", () => {
    expect(
      agencyStatus({
        ...base,
        activeUntil: days(1),
        latest: { periodEnd: days(1), cancelledAt: null },
      })
    ).toBe("live");
  });

  it("is lapsed when a plan ran out", () => {
    expect(
      agencyStatus({ ...base, latest: { periodEnd: days(-2), cancelledAt: null } })
    ).toBe("lapsed");
  });

  it("is lapsed when the plan was ended early", () => {
    expect(
      agencyStatus({ ...base, latest: { periodEnd: days(10), cancelledAt: days(-1) } })
    ).toBe("lapsed");
  });

  it("is suspended whatever else is true", () => {
    const suspendedAt = days(-1);
    expect(agencyStatus({ ...base, suspendedAt, activatedAt: null })).toBe("suspended");
    expect(agencyStatus({ ...base, suspendedAt })).toBe("suspended");
    expect(
      agencyStatus({
        ...base,
        suspendedAt,
        activeUntil: days(20),
        latest: { periodEnd: days(20), cancelledAt: null },
      })
    ).toBe("suspended");
    expect(
      agencyStatus({ ...base, suspendedAt, latest: { periodEnd: days(-2), cancelledAt: null } })
    ).toBe("suspended");
  });

  it("ranks every status for sorting, in lifecycle order", () => {
    expect([...AGENCY_STATUSES].sort((a, b) => AGENCY_STATUS_RANK[a] - AGENCY_STATUS_RANK[b])).toEqual([
      "onboarding",
      "awaiting_payment",
      "live",
      "lapsed",
      "suspended",
    ]);
  });
});
