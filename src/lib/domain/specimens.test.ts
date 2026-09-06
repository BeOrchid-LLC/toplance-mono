import { describe, expect, it } from "vitest";

import { SPECIMENS, specimenFor } from "@/lib/domain/specimens";

/**
 * The drawn example beside a requirement — "what an acceptable version
 * looks like", which the 05/09 review asked for and which a description
 * alone cannot carry. A sentence can say "the whole bio page, both
 * machine-readable lines visible"; a person photographing a passport on a
 * kitchen table at night is helped far more by seeing the frame.
 *
 * Keyed on `doc_key` rather than on the corridor. A Nigerian bank
 * statement looks like a Nigerian bank statement whether the visa is
 * Emirati or Canadian, so a specimen per route would be the same drawing
 * copied ninety-six times and then maintained ninety-six times. A
 * requirement with no specimen renders its description and nothing else,
 * which is the state every requirement is in until one is drawn.
 *
 * Nothing here is a real document. The renderer draws boxes and labels
 * from these numbers; there is no scan of anybody's passport in the
 * repository, and there must never be one.
 */
describe("specimenFor", () => {
  it("finds the specimen for a document type", () => {
    const passport = specimenFor("passport");
    expect(passport?.docKey).toBe("passport");
    expect(passport?.callouts.length).toBeGreaterThan(0);
  });

  it("returns null for a requirement nobody has drawn yet", () => {
    expect(specimenFor("biometrics")).toBeNull();
    expect(specimenFor("not_a_real_key")).toBeNull();
  });

  it("covers the requirements that appear on every seeded corridor", () => {
    // These three are on every rule set in `seed.sql`, so a traveller who
    // sees no specimen at all is seeing a bug rather than a gap.
    expect(specimenFor("passport")).not.toBeNull();
    expect(specimenFor("passport_photos")).not.toBeNull();
    expect(specimenFor("funds")).not.toBeNull();
  });
});

describe("every specimen", () => {
  const entries = Object.entries(SPECIMENS);

  it("is keyed by its own docKey", () => {
    for (const [key, specimen] of entries) {
      expect(specimen.docKey).toBe(key);
    }
  });

  /**
   * The renderer places callouts as percentages inside a fixed frame. A
   * box that runs past the edge is not clipped by the SVG — it draws
   * over the caption below it, which is the kind of fault that only
   * shows up on one document type in one locale.
   */
  it("keeps its callouts inside the frame", () => {
    for (const [key, specimen] of entries) {
      for (const c of specimen.callouts) {
        expect(c.w, `${key}: width`).toBeGreaterThan(0);
        expect(c.h, `${key}: height`).toBeGreaterThan(0);
        expect(c.x, `${key}: left edge`).toBeGreaterThanOrEqual(0);
        expect(c.y, `${key}: top edge`).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w, `${key}: right edge`).toBeLessThanOrEqual(100);
        expect(c.y + c.h, `${key}: bottom edge`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("labels every callout", () => {
    for (const [key, specimen] of entries) {
      expect(specimen.callouts.length, `${key}: callouts`).toBeGreaterThan(0);
      for (const c of specimen.callouts) {
        expect(c.label.trim(), `${key}: label`).not.toBe("");
      }
    }
  });

  /**
   * The pitfall is the sentence that saves a round trip — the single
   * commonest reason this document comes back. A specimen without one is
   * a picture with nothing to say.
   */
  it("names the commonest reason it is sent back", () => {
    for (const [key, specimen] of entries) {
      expect(specimen.pitfall.trim(), `${key}: pitfall`).not.toBe("");
    }
  });
});
