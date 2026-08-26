import { describe, expect, it } from "vitest";

import { corridorGap } from "@/lib/domain/corridor-gap";

/**
 * The dead-end screen's copy. It is tested because it was wrong: it named
 * the destination whatever the actual blocker was, and offered a recovery
 * that could not reach one.
 */
describe("corridorGap", () => {
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
