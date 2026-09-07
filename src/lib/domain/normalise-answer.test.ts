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

  it("resolves a destination the chips do not show", () => {
    // The regression this exists to stop. `DESTINATION_ISO` covers 49
    // countries and the question chips five of them, so keying
    // normalisation on chips alone meant a traveller who typed
    // "Ireland" — a route we serve — resolved to no corridor and got an
    // empty checklist with no explanation.
    expect(normaliseAnswer("destination", "Ireland")).toBe("Ireland");
    expect(normaliseAnswer("destination", "  portugal ")).toBe("Portugal");
    expect(normaliseAnswer("destination", "United Kingdom")).toBe("United Kingdom");
  });

  it("resolves a nationality or residence country by name", () => {
    expect(normaliseAnswer("nationality", "Cameroon")).toBe("Cameroon");
    expect(normaliseAnswer("residence_country", "kenya")).toBe("Kenya");
  });

  it("still returns null for a country nothing maps", () => {
    expect(normaliseAnswer("destination", "Atlantis")).toBeNull();
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

  /**
   * The budget bands are the second question whose chips depend on an
   * earlier answer, and the only one where the *label* varies while the
   * value does not. There is no country in scope here, so every
   * country's wording has to resolve — otherwise a Ghanaian who tapped
   * "₵15,000" stores no code, and a rule keyed on that band silently
   * becomes unevaluable for everybody who is not reading dollars.
   */
  it("resolves a local budget band to the canonical dollar value", () => {
    expect(normaliseAnswer("budget", "Under ₵15,000")).toBe("Under US$1,250");
    expect(normaliseAnswer("budget", "Under ₦2 million")).toBe("Under US$1,250");
    expect(normaliseAnswer("budget", "R45,000–90,000")).toBe("US$2,500–5,000");
    expect(normaliseAnswer("budget", "Over KSh 650,000")).toBe("Over US$5,000");
  });

  it("resolves a budget band tapped in any language", () => {
    // A Zulu speaker taps the Zulu chip; an approver writes the rule in
    // English. Both have to arrive at the same code.
    expect(normaliseAnswer("budget", "Ngaphansi kuka-₦2m")).toBe(
      "Under US$1,250"
    );
    expect(normaliseAnswer("budget", "Ju ₦8m lọ")).toBe("Over US$5,000");
  });

  it("still resolves the canonical dollar band itself", () => {
    expect(normaliseAnswer("budget", "US$1,250–2,500")).toBe("US$1,250–2,500");
  });
});
