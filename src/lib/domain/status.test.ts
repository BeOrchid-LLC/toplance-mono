import { describe, expect, it } from "vitest";

import {
  isApplicationStatus,
  isTerminalStatus,
  RESUBMITTABLE,
  STAFF_TRANSITIONS,
  STATUS_VARIANT,
  TERMINAL_STATUSES,
  type ApplicationStatus,
} from "@/lib/domain/status";

/**
 * `RESUBMITTABLE` is the traveller's half of the status machine, and it
 * is tested because the documents screen used not to read it at all.
 *
 * That screen showed "Everything is verified" and a Submit button on the
 * strength of the checklist alone, so a case that had already gone to
 * review still offered to send itself again — and the only thing that
 * said no was `submitApplicationTx`, as a red toast after the click. The
 * button is drawn from this list now, so the two agree by construction.
 */
describe("RESUBMITTABLE", () => {
  it("does not offer a resubmit once the case is with the desk", () => {
    expect(RESUBMITTABLE).not.toContain("submitted");
    expect(RESUBMITTABLE).not.toContain("under_review");
  });

  it("is empty of decided cases — there is no un-decide", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(RESUBMITTABLE).not.toContain(status);
    }
  });

  it("includes the statuses that are the traveller's move", () => {
    // `additional_documents` is in the list because resubmitting is
    // exactly what that status asks of them.
    expect(RESUBMITTABLE).toEqual([
      "draft",
      "collecting_documents",
      "additional_documents",
    ]);
  });

  it("covers every status that has no staff exit but is not terminal", () => {
    // If the desk cannot move a case on, the traveller must be able to —
    // otherwise it is stuck with nobody able to act. This is the invariant
    // that keeps a new status from silently becoming a dead end.
    const stuck = (Object.keys(STAFF_TRANSITIONS) as (keyof typeof STAFF_TRANSITIONS)[])
      .filter((s) => STAFF_TRANSITIONS[s].length === 0)
      .filter((s) => !TERMINAL_STATUSES.includes(s))
      .filter((s) => !RESUBMITTABLE.includes(s));

    expect(stuck).toEqual([]);
  });
});

/**
 * The lodgement leg, added 7 September.
 *
 * `processing` is the only status in the machine that describes somebody
 * outside this product holding the case, which makes two things easy to
 * get wrong and worth pinning: that a reviewer can actually reach it,
 * and that a case sitting in it is not stranded there when the embassy
 * comes back wanting something.
 */
describe("processing", () => {
  it("is reachable from review, and only from review", () => {
    const entries = (Object.keys(STAFF_TRANSITIONS) as ApplicationStatus[]).filter((from) =>
      STAFF_TRANSITIONS[from].includes("processing")
    );

    // Not from `submitted`: a pack cannot go to a mission before anyone
    // here has read it. Not from `additional_documents`, which is the
    // traveller's move to make. One door in.
    expect(entries).toEqual(["under_review"]);
  });

  it("keeps every decision exit review had", () => {
    // An embassy answers yes, answers no, or comes back wanting more.
    // Losing the third would strand a queried case with nobody able to
    // move it — the traveller cannot resubmit from `processing`, and
    // the desk would have only two verdicts it cannot honestly give.
    for (const exit of STAFF_TRANSITIONS.under_review) {
      if (exit === "processing") continue;
      expect(STAFF_TRANSITIONS.processing).toContain(exit);
    }
  });

  it("is not somewhere the traveller can submit from", () => {
    // Their case is with a mission. An upload at this point reaches
    // nobody who can act on it, so the documents screen must not offer
    // one — `RESUBMITTABLE` is what draws that panel.
    expect(RESUBMITTABLE).not.toContain("processing");
  });

  it("is not a decision", () => {
    // Lodged is not decided. `decidedAt` is stamped off `isTerminalStatus`
    // in `changeStatusTx`, so getting this wrong would date every case's
    // outcome to the day it left the building.
    expect(isTerminalStatus("processing")).toBe(false);
  });
});

describe("isApplicationStatus", () => {
  it("accepts every status the machine has", () => {
    for (const key of Object.keys(STATUS_VARIANT)) {
      expect(isApplicationStatus(key)).toBe(true);
    }
  });

  it("refuses a status that is not one", () => {
    expect(isApplicationStatus("nearly_done")).toBe(false);
  });

  /**
   * Same defect as `isFlagReason`: `value in STATUS_VARIANT` walks the
   * prototype chain, so `to=toString` on the `changeCaseStatus` POST
   * passed the guard. It got as far as the status label in the
   * notification, which reads a function off the prototype and sends the
   * traveller a garbled status name.
   */
  it("refuses inherited object keys", () => {
    expect(isApplicationStatus("toString")).toBe(false);
    expect(isApplicationStatus("constructor")).toBe(false);
    expect(isApplicationStatus("__proto__")).toBe(false);
  });
});
