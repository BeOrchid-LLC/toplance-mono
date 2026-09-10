import { canSubmitFrom, type ApplicationStatus } from "@/lib/domain/status";

/**
 * What the dashboard's lead plate should say, as a state rather than a
 * chain of conditions on a screen.
 *
 * It lives here for the reason `RESUBMITTABLE` does: the rule is about
 * who holds the case, two screens have to agree on it, and a page is a
 * bad place to keep a rule two people will later disagree about.
 *
 * The plate used to be derived from the checklist alone — `verified >=
 * total` meant "Everything is verified" and a `--way` button reading
 * "Review and submit". A checklist stays complete after submission, so
 * that plate survived `submitted`, `under_review`, `processing`, the
 * interview and both decisions: a case sitting with the embassy still
 * invited the traveller to send it, and the button led to a documents
 * screen that had correctly stopped offering the action. The documents
 * screen learned this in `canSubmitFrom`; the dashboard never did.
 *
 * The status decides whether the traveller may act at all. Only once it
 * says they may does the checklist get to say what about.
 */
export type NextStep =
  /** A required document came back; nothing else on the screen matters. */
  | { kind: "sent_back"; names: string[] }
  /** Every required document is past a human, and the case is theirs to send. */
  | { kind: "review_submit" }
  /** Everything is uploaded and somebody is checking it. Nothing is owed. */
  | { kind: "checking"; verified: number; total: number }
  /** Documents still to come. */
  | { kind: "to_upload"; outstanding: number; collected: number; total: number }
  /**
   * Booked to attend. The one status past submission where the
   * traveller still owes something, so it cannot borrow `with_team`'s
   * "nothing is waiting on you" — `tenants.ts` makes the same point
   * from the agency's side.
   */
  | { kind: "interview" }
  /** Sent, and not decided. The traveller has nothing to do. */
  | { kind: "with_team" }
  /** Decided, either way. */
  | { kind: "decided"; outcome: "granted" | "refused" };

/** Only the three counts, so this stays clear of `@/lib/data`. */
type Counts = { total: number; collected: number; verified: number };

export function nextStepFor({
  status,
  completion,
  sentBack,
}: {
  status: ApplicationStatus;
  completion: Counts;
  /** Names of the required documents the desk sent back. */
  sentBack: string[];
}): NextStep {
  if (!canSubmitFrom(status)) {
    if (status === "approved") return { kind: "decided", outcome: "granted" };
    if (status === "rejected") return { kind: "decided", outcome: "refused" };
    if (status === "interview_scheduled") return { kind: "interview" };
    return { kind: "with_team" };
  }

  if (sentBack.length > 0) return { kind: "sent_back", names: sentBack };

  const { total, collected, verified } = completion;

  // `total > 0` guards both of the first two: a case whose checklist has
  // not been built yet has 0 of 0 verified, and neither "everything is
  // verified" nor "everything is uploaded" is a true thing to say about
  // it. It falls through to the count, which reads 0 of 0 and asks for
  // nothing.
  if (total > 0 && verified >= total) return { kind: "review_submit" };
  if (total > 0 && collected >= total) return { kind: "checking", verified, total };

  return { kind: "to_upload", outstanding: total - collected, collected, total };
}
