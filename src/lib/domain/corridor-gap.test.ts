import { describe, expect, it } from "vitest";

import { corridorGap } from "@/lib/domain/corridor-gap";

/**
 * The dead-end screen's copy. It is tested because it was wrong: it named
 * the destination whatever the actual blocker was, and offered a recovery
 * that could not reach one.
 */
describe("corridorGap", () => {
  /**
   * The six ECOWAS destinations, and the reason this branch exists.
   *
   * Ghana has no corridor row and never will have a useful one: a
   * Nigerian passport enters under ECOWAS free movement, and the
   * document checklist Ghana publishes is for everyone else. The engine
   * knowing that is not a gap — it is the answer — so the screen must
   * stop saying "we do not cover Ghana yet" and offering to change
   * destination, which is the same wrong-end-of-the-corridor bug this
   * module was written to fix.
   */
  describe("when the passport needs no visa at all", () => {
    const gap = corridorGap({
      nationality: "Nigeria",
      destination: "Ghana",
      purpose: "Tourism",
      entry: { requiresVisa: false },
    });

    it("is an answer rather than a gap", () => {
      expect(gap.kind).toBe("answer");
    });

    it("does not claim we fail to cover the country", () => {
      expect(gap.heading).not.toContain("do not cover");
      expect(gap.heading).toBe("You do not need a visa for Ghana");
    });

    it("does not offer a recovery for a problem the traveller does not have", () => {
      expect(gap.action).not.toBe("Change my destination");
    });
  });

  /**
   * The limit of the claim. VisaList reports Ghana visa-free for three
   * months — a short-stay figure. Someone moving there to work needs a
   * permit that no entry-rules vendor describes, so the visa-free
   * answer must not be stretched over a purpose it was never measured
   * for. Better a gap we admit to than a reassurance we cannot defend.
   */
  describe("when no visa is needed but the stay is a long one", () => {
    for (const purpose of ["Work", "Study", "Relocation"]) {
      it(`stays a gap for ${purpose.toLowerCase()}`, () => {
        const gap = corridorGap({
          nationality: "Nigeria",
          destination: "Ghana",
          purpose,
          entry: { requiresVisa: false },
        });

        expect(gap.kind).toBe("gap");
        expect(gap.heading).not.toContain("do not need a visa");
      });
    }
  });

  it("is unchanged when a visa is required, or when nobody answered", () => {
    // The entry verdict only ever opens the branch above; it must not
    // reword the three the screen already had.
    const base = { nationality: "Nigeria", destination: "Canada", purpose: "Tourism" };
    const plain = corridorGap(base);

    expect(corridorGap({ ...base, entry: null })).toEqual(plain);
    expect(corridorGap({ ...base, entry: { requiresVisa: true } })).toEqual(plain);
    expect(plain.kind).toBe("gap");
  });

  describe("when only the purpose is missing", () => {
    // Exactly the screenshot: Canada is seeded, for study, and the
    // traveller asked for tourism.
    const gap = corridorGap({
      nationality: "Nigeria",
      destination: "Canada",
      purpose: "Tourism",
    });

    it("does not claim we fail to cover the country", () => {
      expect(gap.heading).not.toBe("We do not cover Canada yet");
      expect(gap.heading).toBe("We cover Canada, but not for tourism yet");
    });

    it("names the purpose that is live instead", () => {
      expect(gap.lead).toContain("Canada is live for study");
    });

    it("offers the answer that can actually fix it", () => {
      expect(gap.action).toBe("Change my purpose");
    });
  });

  describe("when the destination is not built for this passport", () => {
    const gap = corridorGap({
      nationality: "Nigeria",
      destination: "United States",
      purpose: "Work",
    });

    it("names the corridor, not the country alone", () => {
      expect(gap.heading).toBe(
        "We do not cover United States for work yet"
      );
    });

    it("lists where this passport can actually go", () => {
      expect(gap.lead).toContain("United Kingdom");
      expect(gap.lead).toContain("Canada");
    });

    it("offers a destination change, which can reach a live corridor", () => {
      expect(gap.action).toBe("Change my destination");
    });
  });

  describe("when no corridor serves this passport at all", () => {
    const gap = corridorGap({
      nationality: "Ghana",
      destination: "Canada",
      purpose: "Study",
    });

    it("blames the passport rather than the destination", () => {
      expect(gap.heading).toBe("We do not cover Ghana passports yet");
    });

    it("says plainly that changing destination will not help", () => {
      // The old screen offered exactly that, and it was a loop with no
      // exit: no destination is live for a Ghanaian passport.
      expect(gap.lead).toContain("changing destination will not help");
      expect(gap.action).not.toBe("Change my destination");
    });

    it("names the passport that is served, derived not hardcoded", () => {
      expect(gap.lead).toContain("Nigeria");
    });
  });

  describe("free-text answers we cannot resolve", () => {
    it("treats an unknown nationality as unserved rather than Nigerian", () => {
      // This used to be coerced to `ng` and served the Nigerian rule set.
      const gap = corridorGap({
        nationality: "Senegal",
        destination: "United Kingdom",
        purpose: "Work",
      });

      expect(gap.heading).toBe("We do not cover Senegal passports yet");
    });

    it("does not render an empty slot when an answer is blank", () => {
      const gap = corridorGap({
        nationality: "",
        destination: "",
        purpose: "",
      });

      expect(gap.heading).toBe("We do not cover that corridor yet");
      expect(`${gap.heading}${gap.lead}`).not.toMatch(/\s{2,}|undefined|null/);
    });
  });

  it("never promises an email, because nothing can send one", () => {
    const every = [
      corridorGap({ nationality: "Nigeria", destination: "Canada", purpose: "Tourism" }),
      corridorGap({ nationality: "Nigeria", destination: "United States", purpose: "Work" }),
      corridorGap({ nationality: "Ghana", destination: "Canada", purpose: "Study" }),
    ];

    for (const gap of every) {
      expect(`${gap.heading} ${gap.lead}`).not.toMatch(/email|write to you|notify/i);
    }
  });
});
