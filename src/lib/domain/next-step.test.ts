import { describe, expect, it } from "vitest";

import type { ApplicationStatus } from "@/lib/domain/status";
import { nextStepFor } from "@/lib/domain/next-step";

const done = { total: 6, collected: 6, verified: 6 };

const step = (status: ApplicationStatus, over: Partial<Parameters<typeof nextStepFor>[0]> = {}) =>
  nextStepFor({ status, completion: done, sentBack: [], ...over });

describe("nextStepFor", () => {
  it("offers Review and submit while the case is still the traveller's", () => {
    expect(step("collecting_documents")).toEqual({ kind: "review_submit" });
  });

  it("stops offering to submit once the case is with the desk", () => {
    // The bug: the plate read the checklist alone, and a checklist stays
    // complete after submission — so a case already sent kept a yellow
    // "Review and submit" on the dashboard for the rest of its life.
    expect(step("submitted")).toEqual({ kind: "with_team" });
    expect(step("under_review")).toEqual({ kind: "with_team" });
    expect(step("processing")).toEqual({ kind: "with_team" });
    expect(step("awaiting_decision")).toEqual({ kind: "with_team" });
  });

  it("does not claim nothing is owed while an interview is booked", () => {
    // The one status on the far side of submission where the traveller
    // still has to do something: attend, and take what the notice asks
    // for. `tenants.ts` says the same thing about this status from the
    // agency's side.
    expect(step("interview_scheduled")).toEqual({ kind: "interview" });
  });

  it("names the decision once one has landed", () => {
    expect(step("approved")).toEqual({ kind: "decided", outcome: "granted" });
    expect(step("rejected")).toEqual({ kind: "decided", outcome: "refused" });
  });

  it("puts a sent-back document ahead of everything else", () => {
    expect(
      step("additional_documents", { sentBack: ["your bank statements"] })
    ).toEqual({ kind: "sent_back", names: ["your bank statements"] });
  });

  it("asks for the outstanding documents while any are missing", () => {
    expect(
      step("collecting_documents", { completion: { total: 6, collected: 2, verified: 2 } })
    ).toEqual({ kind: "to_upload", outstanding: 4, collected: 2, total: 6 });
  });

  it("says nothing is owed while uploaded documents are being checked", () => {
    expect(
      step("collecting_documents", { completion: { total: 6, collected: 6, verified: 2 } })
    ).toEqual({ kind: "checking", verified: 2, total: 6 });
  });

  it("does not report a sent-back document the desk has already moved past", () => {
    // `sentBack` is read off the documents, and a document can sit
    // `flagged` while the case itself has gone on. The status decides
    // whether the traveller may act; the documents only say what about.
    expect(step("under_review", { sentBack: ["your bank statements"] })).toEqual({
      kind: "with_team",
    });
  });
});
