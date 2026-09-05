import { describe, expect, it } from "vitest";

import {
  appliesToTraveller,
  describeAppliesWhen,
  parseAppliesWhen,
} from "@/lib/domain/applies-when";

/**
 * The rule that decides whether a traveller is asked for a document.
 *
 * Two failure directions, and they are not symmetric. Wrongly hiding a
 * document sends someone to a mission without it — the failure this
 * product exists to prevent. Wrongly showing one costs them a moment's
 * confusion. So every ambiguous case here resolves to "show it, and say
 * we are not certain", and the tests below pin that asymmetry rather
 * than merely covering the branches.
 */
const MARRIED: ReturnType<typeof parseAppliesWhen> = [
  { answer: "companions", in: ["Partner", "Partner and children"] },
];

describe("parseAppliesWhen", () => {
  it("reads a well-formed rule", () => {
    expect(
      parseAppliesWhen([{ answer: "companions", in: ["Partner"] }])
    ).toEqual([{ answer: "companions", in: ["Partner"] }]);
  });

  it("refuses a key that is not an intake topic", () => {
    // Otherwise a typo — `companion` for `companions` — becomes a rule
    // that never matches, and a document that silently never appears.
    expect(parseAppliesWhen([{ answer: "companion", in: ["Partner"] }])).toBeNull();
  });

  it("refuses an empty rule and empty options", () => {
    // `[]` would evaluate as "every clause matched" and quietly make a
    // conditional document required for everyone.
    expect(parseAppliesWhen([])).toBeNull();
    expect(parseAppliesWhen([{ answer: "companions", in: [] }])).toBeNull();
    expect(parseAppliesWhen([{ answer: "companions", in: ["  "] }])).toBeNull();
  });

  it("refuses anything that is not the shape at all", () => {
    // The column is `jsonb`: it will hold whatever was written to it.
    for (const value of [null, undefined, {}, "companions", 3, [null], [{}]]) {
      expect(parseAppliesWhen(value)).toBeNull();
    }
  });
});

describe("appliesToTraveller", () => {
  it("applies, with certainty, when the answer matches", () => {
    expect(appliesToTraveller(MARRIED, { companions: "Partner" })).toEqual({
      applies: true,
      certain: true,
    });
  });

  it("does not apply, with certainty, when the answer does not match", () => {
    expect(appliesToTraveller(MARRIED, { companions: "Just me" })).toEqual({
      applies: false,
      certain: true,
    });
  });

  it("ignores case and surrounding space", () => {
    // The answer can arrive from a chip, from free text, or from the
    // model repeating the chip's label back — three paths, one string.
    expect(
      appliesToTraveller(MARRIED, { companions: "  partner  " }).applies
    ).toBe(true);
  });

  it("ANDs its clauses", () => {
    const rule = parseAppliesWhen([
      { answer: "purpose", in: ["Study"] },
      { answer: "companions", in: ["Partner"] },
    ]);

    expect(appliesToTraveller(rule, { purpose: "Study", companions: "Partner" }).applies).toBe(true);
    expect(appliesToTraveller(rule, { purpose: "Study", companions: "Just me" }).applies).toBe(false);
  });

  it("hedges rather than hides when the answer is missing", () => {
    // The asymmetry, pinned. A rule naming a topic this traveller was
    // never asked is a data problem — and resolving it as "does not
    // apply" is how somebody reaches a mission without their marriage
    // certificate.
    expect(appliesToTraveller(MARRIED, {})).toEqual({ applies: true, certain: false });
    expect(appliesToTraveller(MARRIED, { companions: "" })).toEqual({
      applies: true,
      certain: false,
    });
  });

  it("hedges when no rule has been written", () => {
    // The state every conditional document starts in. It stays on the
    // "only if it applies" list until an approver writes the rule —
    // which is how that list empties, one corridor at a time.
    expect(appliesToTraveller(null, { companions: "Just me" })).toEqual({
      applies: true,
      certain: false,
    });
  });
});

describe("describeAppliesWhen", () => {
  it("names the topic the way the traveller was asked it", () => {
    const text = describeAppliesWhen(MARRIED);

    expect(text).toContain("Who is coming with you?");
    expect(text).toContain("Partner or Partner and children");
  });

  it("is null when there is no rule to describe", () => {
    expect(describeAppliesWhen(null)).toBeNull();
  });
});
