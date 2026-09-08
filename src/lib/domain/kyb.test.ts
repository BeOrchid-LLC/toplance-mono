import { describe, expect, it } from "vitest";

import { KYB_REQUIREMENTS, kybProgress, kybStanding } from "@/lib/domain/kyb";
import type { KybState } from "@/lib/db/schema";

/** A checklist in whatever states the test names, in order. */
function rows(...states: KybState[]) {
  return states.map((state) => ({ state }));
}

describe("KYB_REQUIREMENTS", () => {
  it("has a unique key per requirement", () => {
    const keys = KYB_REQUIREMENTS.map((r) => r.docKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("orders every requirement distinctly, so the checklist cannot shuffle", () => {
    const orders = KYB_REQUIREMENTS.map((r) => r.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it("proves both halves of what KYB is for", () => {
    const keys = KYB_REQUIREMENTS.map((r) => r.docKey);
    // The licence and the incorporation say the business is real and
    // allowed to trade. Only `ownership_proof` ties the person holding
    // the owner seat to that business, which was asked for separately
    // and is the half a licence check does not cover.
    expect(keys).toContain("operating_licence");
    expect(keys).toContain("ownership_proof");
  });

  it("gives every requirement guidance an admin can act on", () => {
    for (const requirement of KYB_REQUIREMENTS) {
      expect(requirement.name.length).toBeGreaterThan(0);
      expect(requirement.description.length).toBeGreaterThan(0);
    }
  });
});

describe("kybProgress", () => {
  it("counts only verified rows", () => {
    expect(
      kybProgress(rows("verified", "verified", "in_review", "rejected", "not_started"))
    ).toEqual({ verified: 2, total: 5, canActivate: false });
  });

  it("can activate when every row is verified", () => {
    expect(kybProgress(rows("verified", "verified"))).toEqual({
      verified: 2,
      total: 2,
      canActivate: true,
    });
  });

  it("cannot activate an empty checklist", () => {
    // Not defensive noise. An agency whose requirements failed to seed
    // reads 0 of 0, and `verified === total` alone would make it
    // instantly activatable — the one case where "nothing outstanding"
    // means nothing was ever asked.
    expect(kybProgress([])).toEqual({ verified: 0, total: 0, canActivate: false });
  });

  it("does not let a rejected row pass as settled", () => {
    // `rejected` is a decision, not a completion. A checklist of five
    // verified and one rejected is a business that failed KYB.
    expect(
      kybProgress(rows("verified", "verified", "verified", "rejected")).canActivate
    ).toBe(false);
  });
});

describe("kybStanding", () => {
  it("reports an activated agency as activated whatever its rows say", () => {
    // Requirements can be edited after the fact — a note added, a
    // document replaced when a licence is renewed. None of that
    // re-closes a door BeOrchid opened.
    expect(
      kybStanding({ activatedAt: new Date(), verified: 3, touched: 4, total: 6 })
    ).toBe("activated");
  });

  it("is ready when the checklist is full but nobody has activated yet", () => {
    expect(
      kybStanding({ activatedAt: null, verified: 6, touched: 6, total: 6 })
    ).toBe("ready");
  });

  it("is in review once documents are filed, before any verdict", () => {
    // The distinction the queue exists for. Six documents filed and
    // nothing judged yet is waiting on us, not on them — counting only
    // verdicts would file it under "not started" and put it at the
    // bottom of a list it belongs at the top of.
    expect(
      kybStanding({ activatedAt: null, verified: 0, touched: 6, total: 6 })
    ).toBe("in_review");
  });

  it("is in review once a verdict has been taken", () => {
    expect(
      kybStanding({ activatedAt: null, verified: 1, touched: 3, total: 6 })
    ).toBe("in_review");
  });

  it("has not started while nothing has been filed", () => {
    expect(
      kybStanding({ activatedAt: null, verified: 0, touched: 0, total: 6 })
    ).toBe("not_started");
  });

  it("has not started when there is no checklist at all", () => {
    expect(
      kybStanding({ activatedAt: null, verified: 0, touched: 0, total: 0 })
    ).toBe("not_started");
  });
});
