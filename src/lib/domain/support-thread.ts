import type { SupportRequestState } from "@/lib/db/schema";

/**
 * Who may add to a support thread.
 *
 * A pure rule, so it is provable without a database — `invitations`
 * taught that lesson: a permission tested only by a database-gated
 * suite is a permission CI never checks.
 */

export type SupportPoster =
  | { kind: "staff" }
  | { kind: "agency"; orgId: string | null };

/**
 * Staff may answer any agency's request: the queue is the platform
 * team's shared work, and a dispute should not wait on one person.
 * An agency may only add to its own — the table is one queue across
 * every tenant, so without the `orgId` check a member who guessed a
 * request id could read and answer somebody else's dispute.
 *
 * Nobody posts to a resolved request. Reopening is a state change
 * somebody makes on purpose, not a side effect of typing into a thread
 * that already reads as closed.
 */
export function canPostSupportMessage(
  request: { orgId: string; state: SupportRequestState },
  poster: SupportPoster
): boolean {
  if (request.state === "resolved") return false;
  if (poster.kind === "staff") return true;
  return poster.orgId !== null && poster.orgId === request.orgId;
}
