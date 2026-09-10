import { describe, expect, it } from "vitest";

import {
  documentVerdict,
  isApplicationStatus,
  isTerminalStatus,
  RESUBMITTABLE,
  STAFF_TRANSITIONS,
  STATUS_VARIANT,
  submissionNotice,
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

/**
 * Who gave the verdict on a document — the fact `state` alone cannot
 * carry, and the bug of 10 September.
 *
 * The AI pre-check writes a flag through the same three columns a human
 * flag writes (`state`, `reason`, `reasonCode`), which `applyPrecheckTx`
 * says of itself. So the agency's case screen, bucketing on `state`
 * alone, filed an AI-flagged document under "Already reviewed" — folded
 * shut, beside verdicts a person had actually given, while nobody had
 * looked at it.
 *
 * `checkedAt` is the discriminator because `reviewDocumentTx` is the only
 * writer of it. `precheck` says the AI has run; it never says a person
 * has.
 */
describe("documentVerdict", () => {
  const doc = (over: Partial<Parameters<typeof documentVerdict>[0]> = {}) =>
    documentVerdict({ state: "checking", checkedAt: null, precheck: null, ...over });

  it("calls a human verdict human, whichever way it went", () => {
    expect(doc({ state: "verified", checkedAt: new Date() })).toBe("human");
    expect(doc({ state: "flagged", checkedAt: new Date() })).toBe("human");
  });

  /**
   * `verified` is human on the strength of the state alone, and this is
   * the assertion that says why it cannot lean on `checkedAt`.
   *
   * The AI never writes `verified` — `applyPrecheckTx` refuses to, and
   * submission and billing both gate on that column — so the state is
   * already proof a person signed it off. `checkedAt` is not: 58 of the
   * 62 verified rows in a local database have it null, left by fixtures
   * and by whatever wrote them before `reviewDocumentTx` did. Requiring
   * it here marched every one of those back into the reviewer's
   * "Awaiting review" pile as work nobody owed.
   */
  it("trusts verified without a timestamp, because the AI cannot write it", () => {
    expect(doc({ state: "verified", checkedAt: null, precheck: null })).toBe("human");
    expect(doc({ state: "verified", checkedAt: null, precheck: { verdict: "pass" } })).toBe(
      "human"
    );
  });

  /*
   * The bug, stated directly: an AI flag is not a review. It has a
   * `reason` and a `reasonCode` like a human flag does, and no
   * `checkedAt`, because no person has judged it.
   */
  it("does not let an AI flag pass as a review", () => {
    expect(doc({ state: "flagged", precheck: { verdict: "flag" } })).toBe("ai_flagged");
  });

  /*
   * A pass leaves `state` on `checking` — `applyPrecheckTx` writes only
   * the `precheck` column, because the AI is never what moves a document
   * to `verified`. The traveller's pill reads this to say "Checked by
   * AI" instead of "Checking", which described a machine still working
   * on a file it had in fact already passed.
   */
  it("separates a document the AI has passed from one still in the queue", () => {
    expect(doc({ state: "checking", precheck: { verdict: "pass" } })).toBe("ai_checked");
    expect(doc({ state: "checking", precheck: null })).toBe("none");
  });

  it("has no verdict on a document that has not arrived", () => {
    expect(doc({ state: "not_started" })).toBe("none");
    expect(doc({ state: "uploaded" })).toBe("none");
    expect(doc({ state: "failed" })).toBe("none");
  });

  /**
   * A re-upload clears the verdict columns (`uploadDocument`), so a
   * stale `checkedAt` cannot outlive the file it was about. Asserted
   * here as the shape this function is entitled to assume: a row on
   * `checking` carrying a human `checkedAt` would be a bug upstream, and
   * this reads it as the AI queue rather than as a review of a file that
   * no longer exists.
   */
  it("does not report a review of a replaced file", () => {
    expect(doc({ state: "checking", checkedAt: new Date(), precheck: null })).toBe("none");
  });
});

/**
 * Which sheet the documents screen draws once the checklist can no
 * longer be submitted.
 *
 * That branch used to draw one panel for every status it caught, so the
 * moment a traveller pressed Submit the green sheet they had just acted
 * on was replaced by a grey one — and the only thing that said the
 * submission had worked was a toast, gone in seconds. `submitted` is the
 * one status on that branch the traveller caused themselves.
 */
describe("submissionNotice", () => {
  it("celebrates the one status the traveller just caused", () => {
    expect(submissionNotice("submitted")).toBe("success");
  });

  it("stays neutral about where the case has since got to", () => {
    // Progress, not success: nobody has decided anything yet.
    expect(submissionNotice("under_review")).toBe("neutral");
    expect(submissionNotice("processing")).toBe("neutral");
  });

  /*
   * `approved` has its own celebration elsewhere and `rejected` must
   * never be tinted like one. Neither is a report on the act of
   * submitting, which is all this sheet is about.
   */
  it("leaves a decided case to the status copy", () => {
    expect(submissionNotice("approved")).toBe("neutral");
    expect(submissionNotice("rejected")).toBe("neutral");
  });

  it("says nothing on a case that can still be submitted", () => {
    for (const status of RESUBMITTABLE) {
      expect(submissionNotice(status)).toBe("neutral");
    }
  });
});

/**
 * The interview leg.
 *
 * A consulate interview was invisible to the status machine until now:
 * the product could already summon a traveller to one — `InviteAttendance`
 * writes an `attendance_requests` row with `kind: "interview"` and emails
 * them — but the case they were being summoned about still read "With the
 * embassy" on their own dashboard, and the desk's queue could not tell a
 * file that had been lodged from one whose owner was sitting an interview
 * on Thursday.
 *
 * Two statuses close that, and the pair is deliberately asymmetric: the
 * entrances are narrow and the exits are wide. Narrow entrances are what
 * make the statuses mean something; wide exits are what keep a case from
 * stranding when a mission does something nobody planned for.
 */
describe("the interview leg", () => {
  const entrancesTo = (target: ApplicationStatus) =>
    (Object.keys(STAFF_TRANSITIONS) as ApplicationStatus[]).filter((from) =>
      STAFF_TRANSITIONS[from].includes(target)
    );

  it("books an interview only on a case a mission is already holding", () => {
    // Not from `under_review`: a consulate interview follows lodgement,
    // and a case still being read here has not reached one. Biometrics
    // before lodgement stay what they already are — an attendance
    // invitation that touches no status at all.
    expect(entrancesTo("interview_scheduled")).toEqual(["processing"]);
  });

  /**
   * The invariant the whole pair exists for: **you can only be awaiting a
   * decision if an interview actually happened.**
   *
   * The tempting edit is a `processing → awaiting_decision` leg, on the
   * grounds that a lodged case is obviously awaiting a decision. It is —
   * and `processing` is already its name. Two statuses meaning one thing
   * is how the funnel and the queue start disagreeing about the same
   * case, and it would make "awaiting decision" unreadable as the figure
   * it is here to produce: cases that have been interviewed and are
   * overdue an answer.
   */
  it("can only await a decision after an interview has been held", () => {
    expect(entrancesTo("awaiting_decision")).toEqual(["interview_scheduled"]);
  });

  it("lets the consulate answer at the window", () => {
    // Plenty of missions say yes or no across the counter, and a
    // reviewer who watched it happen must not have to route the case
    // through a waiting state that already ended.
    expect(STAFF_TRANSITIONS.interview_scheduled).toContain("approved");
    expect(STAFF_TRANSITIONS.interview_scheduled).toContain("rejected");
  });

  it("keeps the come-back-for-more exit on both", () => {
    // The third answer an embassy gives. Without it a case queried at or
    // after interview is stuck: the traveller cannot submit from either
    // status, so only `additional_documents` gives them the move.
    expect(STAFF_TRANSITIONS.interview_scheduled).toContain("additional_documents");
    expect(STAFF_TRANSITIONS.awaiting_decision).toContain("additional_documents");
  });

  it("is not a decision, on either status", () => {
    // `decidedAt` is stamped off `isTerminalStatus` in `changeStatusTx`.
    // Calling either of these a decision would date a case's outcome to
    // the day its interview was booked.
    expect(isTerminalStatus("interview_scheduled")).toBe(false);
    expect(isTerminalStatus("awaiting_decision")).toBe(false);
  });

  it("is not somewhere the traveller can submit from", () => {
    // Same argument `processing` makes: an upload at this point reaches
    // nobody who can act on it.
    expect(RESUBMITTABLE).not.toContain("interview_scheduled");
    expect(RESUBMITTABLE).not.toContain("awaiting_decision");
  });
});
