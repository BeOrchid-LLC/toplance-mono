import type { KybState } from "@/lib/db/schema";

/**
 * What BeOrchid asks of a business before opening its console, and the
 * arithmetic over the answers.
 *
 * Pure. No database, no session, no framework — the discipline
 * `@/lib/payments/gates` keeps, and for the same reason: the rule that
 * decides whether a business is let in should be readable and testable
 * without standing up a request. The I/O is `@/lib/data/kyb`.
 */

/** One required document, as the seed writes it onto an agency. */
export type KybRequirementSpec = {
  docKey: string;
  name: string;
  description: string;
  sortOrder: number;
};

/**
 * The six, fixed in code.
 *
 * Fixed rather than admin-authored because "KYB is complete" has to be
 * something a query can answer. A per-agency list makes it mean "an
 * admin said so", which is the state this whole surface exists to
 * replace.
 *
 * The first four establish that the business is real, licensed and
 * where it says it is. The last two are the half a licence check does
 * not cover and that the client named separately: that the person who
 * created the account owns *this* company, and that the money moves
 * under the company's own name.
 *
 * Changing this list is a deploy, **and a migration**. Editing this
 * array alone reaches agencies created after the deploy and no others:
 * `seedKybRequirements` runs inside the two transactions that create an
 * `organisations` row and nowhere else. An existing agency would keep
 * its six rows, `kybProgress` counts `rows.length` as the total, and it
 * would read six of six — activatable without the new requirement ever
 * having been asked for. `drizzle/0035_massive_switch.sql` is the shape
 * the backfill takes.
 *
 * That cost is the right one while BeOrchid collects these by email and
 * the wrong one once agencies upload their own, at which point the list
 * becomes data. Recorded here so the next person reads the constant as
 * a stage rather than a decision.
 *
 * English, and not localised: every reader is BeOrchid staff, and these
 * are the names of legal documents. The screen's own chrome localises
 * normally through `OPS_KYB`.
 */
export const KYB_REQUIREMENTS: readonly KybRequirementSpec[] = [
  {
    docKey: "operating_licence",
    name: "Operating licence",
    description:
      "Travel, tour operator or immigration consultancy licence, in date, issued to the company named on the account.",
    sortOrder: 0,
  },
  {
    docKey: "incorporation_certificate",
    name: "Certificate of incorporation",
    description:
      "Registry document showing the company's legal name and registration number.",
    sortOrder: 1,
  },
  {
    docKey: "director_id",
    name: "Director's government ID",
    description:
      "Passport or national ID of the person who created the account, readable and unexpired.",
    sortOrder: 2,
  },
  {
    docKey: "business_address",
    name: "Proof of business address",
    description:
      "Utility bill, lease or bank correspondence in the company's name, dated within the last three months.",
    sortOrder: 3,
  },
  {
    docKey: "ownership_proof",
    name: "Proof of ownership",
    description:
      "Share register, board resolution or registry extract naming the account holder as an owner or director of this company.",
    sortOrder: 4,
  },
  {
    docKey: "bank_account",
    name: "Bank account proof",
    description:
      "Statement or account-confirmation letter showing an account held in the company's name.",
    sortOrder: 5,
  },
] as const;

export type KybProgress = {
  verified: number;
  total: number;
  /** Whether `activateAgency` would accept this checklist. */
  canActivate: boolean;
};

/**
 * How much of one agency's checklist is settled.
 *
 * `rejected` counts towards neither side: it is a decision, not a
 * completion, and five verified with one rejected is a business that
 * failed KYB rather than one that is nearly through.
 */
export function kybProgress(rows: readonly { state: KybState }[]): KybProgress {
  const total = rows.length;
  const verified = rows.filter((row) => row.state === "verified").length;

  return {
    verified,
    total,
    // `total > 0` is not defensive noise. An agency whose requirements
    // failed to seed reads 0 of 0, and `verified === total` on its own
    // would make it instantly activatable — the one case where "nothing
    // outstanding" means nothing was ever asked.
    canActivate: total > 0 && verified === total,
  };
}

/** Where one agency sits, as the queue's single-word column. */
export type KybStanding = "not_started" | "in_review" | "ready" | "activated";

/**
 * The queue's answer to "who is waiting on us".
 *
 * `activated` wins over everything below it. Requirements stay editable
 * after the fact — a note added, a document replaced when a licence is
 * renewed — and none of that re-closes a door BeOrchid has already
 * opened. Closing one is `suspendTenant`, which is a different act with
 * a different control.
 *
 * `touched` rather than `verified` separates the two waiting states,
 * and the distinction is the whole point of the queue: an agency that
 * has sent nothing is waiting on *them*, and one whose documents are
 * filed and part-judged is waiting on *us*. Counting only verdicts
 * would file an agency with six uploaded documents and no verdicts
 * under "not started", which is exactly backwards about whose move it
 * is — the same reading `tenants.ts` makes when it splits `inProgress`
 * from `withReviewer`.
 */
export function kybStanding(org: {
  activatedAt: Date | null;
  verified: number;
  /** Rows in any state but `not_started` — filed, whatever the verdict. */
  touched: number;
  total: number;
}): KybStanding {
  if (org.activatedAt) return "activated";
  if (org.total > 0 && org.verified === org.total) return "ready";
  return org.touched > 0 ? "in_review" : "not_started";
}
