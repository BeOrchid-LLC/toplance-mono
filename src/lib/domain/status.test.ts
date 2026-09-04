import { describe, expect, it } from "vitest";

import {
  RESUBMITTABLE,
  STAFF_TRANSITIONS,
  TERMINAL_STATUSES,
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
