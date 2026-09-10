import { describe, expect, it } from "vitest";

import type { ApplicationFacts } from "@/lib/domain/kpis";
import { routeOf } from "@/lib/domain/route";

const DAY = 86_400_000;
const T0 = new Date("2026-08-01T00:00:00Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY);

function application(over: Partial<ApplicationFacts> = {}): ApplicationFacts {
  return {
    intakeComplete: false,
    checklistCompleteAt: null,
    submittedAt: null,
    decidedAt: null,
    status: "draft",
    ...over,
  };
}

/** The stage carrying the marker, or undefined if somehow none does. */
const markerKey = (facts: ApplicationFacts) =>
  routeOf(facts).find((s) => s.state === "current" || s.state === "returned")?.key;

const stateOf = (facts: ApplicationFacts, key: string) =>
  routeOf(facts).find((s) => s.key === key)?.state;

describe("routeOf", () => {
  it("names the five stages of the journey, in order", () => {
    expect(routeOf(application()).map((s) => s.key)).toEqual([
      "started",
      "intake",
      "collected",
      "submitted",
      "decided",
    ]);
  });

  it("puts the marker on intake until intake is finished", () => {
    // Ordering is load-bearing: a draft application also has
    // `intakeComplete: false`, and the draft rule would otherwise claim it.
    expect(markerKey(application({ status: "draft" }))).toBe("intake");
  });

  it("lights started even before anything else has happened", () => {
    expect(stateOf(application(), "started")).toBe("reached");
  });

  it("puts the marker on documents while they are being collected", () => {
    expect(
      markerKey(application({ intakeComplete: true, status: "collecting_documents" }))
    ).toBe("collected");
  });

  it("puts the marker on sent once submitted", () => {
    expect(
      markerKey(
        application({
          intakeComplete: true,
          checklistCompleteAt: at(1),
          submittedAt: at(2),
          status: "under_review",
        })
      )
    ).toBe("submitted");
  });

  describe("sent back for more documents", () => {
    const sentBack = application({
      intakeComplete: true,
      checklistCompleteAt: at(1),
      submittedAt: at(2),
      status: "additional_documents",
    });

    it("keeps sent lit, because it genuinely happened", () => {
      // `submittedAt` is never cleared, so the high-water mark survives the
      // return. Un-lighting it would erase a submission that really happened.
      expect(stateOf(sentBack, "submitted")).toBe("reached");
    });

    it("moves the marker back to documents", () => {
      expect(markerKey(sentBack)).toBe("collected");
    });

    it("marks that position as returned rather than current", () => {
      // The one signal that distinguishes "you are here" from "you are back
      // here" — computed from the marker sitting behind the high-water mark,
      // not from a stored column.
      expect(stateOf(sentBack, "collected")).toBe("returned");
    });
  });

  it("is current, not returned, when the marker leads the high-water mark", () => {
    expect(
      stateOf(application({ intakeComplete: true, status: "collecting_documents" }), "collected")
    ).toBe("current");
  });

  it("carries the outcome when a case is granted", () => {
    const granted = application({
      intakeComplete: true,
      checklistCompleteAt: at(1),
      submittedAt: at(2),
      decidedAt: at(3),
      status: "approved",
    });

    expect(markerKey(granted)).toBe("decided");
    expect(routeOf(granted).at(-1)?.outcome).toBe("granted");
  });

  it("carries the outcome when a case is refused", () => {
    const refused = application({
      intakeComplete: true,
      checklistCompleteAt: at(1),
      submittedAt: at(2),
      decidedAt: at(3),
      status: "rejected",
    });

    expect(routeOf(refused).at(-1)?.outcome).toBe("refused");
  });

  it("sets an outcome on no stage but the decision", () => {
    const underReview = application({
      intakeComplete: true,
      submittedAt: at(2),
      status: "under_review",
    });

    expect(routeOf(underReview).every((s) => s.outcome === undefined)).toBe(true);
  });

  it("leaves stages ahead of the marker unlit", () => {
    expect(stateOf(application({ intakeComplete: true, status: "collecting_documents" }), "decided")).toBe(
      "ahead"
    );
  });

  it("puts the marker on exactly one stage, whatever the facts", () => {
    // The function has to be total: every combination lands on one rule.
    const combinations: ApplicationFacts[] = [
      application(),
      application({ intakeComplete: true }),
      application({ intakeComplete: true, status: "collecting_documents" }),
      application({ intakeComplete: true, submittedAt: at(2), status: "submitted" }),
      application({ intakeComplete: true, submittedAt: at(2), status: "processing" }),
      application({ intakeComplete: true, submittedAt: at(2), status: "additional_documents" }),
      application({ intakeComplete: true, decidedAt: at(3), status: "approved" }),
      application({ intakeComplete: true, decidedAt: at(3), status: "rejected" }),
    ];

    for (const facts of combinations) {
      const marked = routeOf(facts).filter(
        (s) => s.state === "current" || s.state === "returned"
      );
      expect(marked).toHaveLength(1);
    }
  });

  it("never lights a stage after an unlit one", () => {
    // The lit set is a high-water mark, so it cannot have holes. A diagram
    // showing Sent lit with Documents dark would be unreadable.
    const facts = application({
      intakeComplete: true,
      checklistCompleteAt: at(1),
      submittedAt: at(2),
      status: "under_review",
    });
    const lit = routeOf(facts).map((s) => s.state !== "ahead");

    expect(lit.indexOf(false) === -1 || !lit.slice(lit.indexOf(false)).includes(true)).toBe(true);
  });
});
