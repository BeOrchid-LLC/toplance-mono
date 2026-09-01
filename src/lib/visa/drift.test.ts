import { describe, expect, it } from "vitest";

import { assessDrift, toVerdict } from "@/lib/visa/drift";

/**
 * The envelope the vendor was verified to send on 2026-08-31 — the same
 * two-key `{ data, meta }` shape `travelbuddy.test.ts` pins, reduced to
 * the one field this module reads. The reduction is deliberate: drift
 * assessment must not depend on any figure the contributor path cares
 * about, so a payload carrying nothing but a verdict is still readable
 * here even though `toEntryRules` would answer null for it.
 */
const live = (name: unknown) => ({
  data: {
    passport: { code: "NG", name: "Nigeria" },
    visa_rules: { primary_rule: { name, duration: "180 days", color: "red" } },
  },
  meta: { version: "2.0", language: "en" },
});

describe("toVerdict", () => {
  it("reads the primary rule's name out of the verified envelope", () => {
    expect(toVerdict(live("Online visa required"))).toBe(
      "Online visa required"
    );
  });

  /**
   * The lesson `travelbuddy.ts` learned in production: a schema loose
   * enough to accept a shape the vendor does not send cannot tell "I
   * understood nothing" apart from "there was nothing to understand".
   * An unwrapped payload must be rejected, not quietly read as empty.
   */
  it("rejects a payload that is not wrapped in data", () => {
    expect(
      toVerdict({ visa_rules: { primary_rule: { name: "Visa required" } } })
    ).toBeNull();
  });

  it("answers null rather than throwing on a reshaped payload", () => {
    expect(toVerdict(null)).toBeNull();
    expect(toVerdict("<html>")).toBeNull();
    expect(toVerdict({ nonsense: true })).toBeNull();
  });

  it("answers null when the vendor names no rule", () => {
    expect(toVerdict(live(null))).toBeNull();
    expect(toVerdict(live("   "))).toBeNull();
    expect(toVerdict({ data: { visa_rules: null }, meta: {} })).toBeNull();
  });
});

describe("assessDrift", () => {
  /**
   * A live curated corridor's standing assumption is that a visa
   * application exists to file. A verdict in the visa-required family —
   * the same two entries `entry-check.ts` allowlists — agrees with it.
   */
  it("reads the visa-required family as consistent", () => {
    expect(assessDrift("Visa required").status).toBe("consistent");
    expect(assessDrift("Online visa required").status).toBe("consistent");
  });

  /** The vendor's capitalisation varies between corridors; case is not
   *  a category, and neither is whitespace. */
  it("normalises case and whitespace before judging", () => {
    expect(assessDrift("  visa REQUIRED ").status).toBe("consistent");
  });

  /**
   * The one verdict that directly contradicts maintaining a visa
   * checklist for the pair. It is a prompt to re-verify with the
   * mission, never proof the corridor is wrong: the vendor has no
   * purpose parameter, so its answer is a short-stay default and a
   * work or study corridor may stand regardless.
   */
  it("flags visa-not-required as a contradiction", () => {
    const drift = assessDrift("Visa not required");
    expect(drift.status).toBe("contradicts");
    expect(drift.verdict).toBe("Visa not required");
  });

  /**
   * An allowlist, mirrored from `entry-check.ts`, and for the same
   * reason: a blocklist would let the next unanticipated verdict pass
   * silently. Anything unrecognised still reaches a human — labelled
   * attention rather than contradiction, because we decline to judge a
   * category we have not met.
   */
  it("routes any unrecognised verdict to attention", () => {
    expect(assessDrift("Visa free").status).toBe("attention");
    expect(assessDrift("Not admitted").status).toBe("attention");
    expect(assessDrift("eTA required").status).toBe("attention");
  });

  /** No verdict is no assessment — the report says so and flags
   *  nothing, because an unreachable vendor is not a drift signal. */
  it("answers unassessable when there is no verdict", () => {
    expect(assessDrift(null).status).toBe("unassessable");
    expect(assessDrift(null).verdict).toBeNull();
  });
});
