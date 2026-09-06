import { describe, expect, it } from "vitest";

import { normaliseAnswer } from "@/lib/domain/normalise-answer";

/**
 * The defect this closes, in the client's terms: a traveller who types
 * "my wife and our son" rather than tapping "Partner and children" lost
 * the marriage certificate off their checklist — and the engine recorded
 * that as certain, not unknown.
 *
 * Rules match a canonical code. This is what produces one, and what
 * returns null when it honestly cannot.
 */
describe("normaliseAnswer", () => {
  it("passes through a canonical chip value", () => {
    expect(normaliseAnswer("companions", "Partner and children")).toBe(
      "Partner and children"
    );
  });

  it("ignores case and surrounding space", () => {
    expect(normaliseAnswer("companions", "  partner AND children ")).toBe(
      "Partner and children"
    );
  });

  it("resolves a chip tapped in another language to its canonical value", () => {
    // A Hausa speaker taps the Hausa chip. The rule an approver wrote is
    // in English, and both must reach the same code or the product works
    // only for the language it was authored in.
    expect(normaliseAnswer("nationality", "Najeriya")).toBe("Nigeria");
    expect(normaliseAnswer("nationality", "Nàìjíríà")).toBe("Nigeria");
  });

  it("returns null for free text that matches no chip", () => {
    // The whole point. Null is "we do not know", which the checklist
    // renders as a hedge — never as a confident no.
    expect(normaliseAnswer("companions", "my wife and our son")).toBeNull();
  });

  it("returns null for an empty or whitespace answer", () => {
    expect(normaliseAnswer("companions", "")).toBeNull();
    expect(normaliseAnswer("companions", "   ")).toBeNull();
  });

  it("resolves a city, whichever country it belongs to", () => {
    // `resolveChips` narrows the city list to the country the traveller
    // answered. Normalising cannot: it is handed one answer and no
    // context, so it matches against every city the intake offers.
    expect(normaliseAnswer("residence", "Accra")).toBe("Accra");
    expect(normaliseAnswer("residence", "  lagos ")).toBe("Lagos");
    expect(normaliseAnswer("residence", "Èkó")).toBe("Lagos");
  });

  it("returns null for a city nobody lists", () => {
    expect(normaliseAnswer("residence", "Dakar")).toBeNull();
  });

  it("returns null for a question that has no chips to match against", () => {
    // `passport_name` is a free-text answer by design. There is no
    // canonical set, so there is no code, and no rule can be written
    // against it.
    expect(normaliseAnswer("passport_name", "Ada Lovelace")).toBeNull();
  });

  it("returns null for a question key that does not exist", () => {
    expect(normaliseAnswer("not_a_question", "Nigeria")).toBeNull();
  });

  it("does not match one question's chip through another question's key", () => {
    // `Nigeria` is a chip on `nationality`, not on `companions`.
    expect(normaliseAnswer("companions", "Nigeria")).toBeNull();
  });
});
