/**
 * What rank a `kind: "staff"` invitation grants when it is accepted.
 *
 * A pure function for one reason: the behaviour it decides is otherwise
 * provable only by `invitations.test.ts`, which is
 * `describe.skipIf(!process.env.DATABASE_URL)` and therefore skipped in
 * CI. A revert of this rule would leave every check green and surface
 * as a brand-new agency nobody inside it can open. This is the half of
 * the rule that can be tested without a database, so it is the half CI
 * can defend.
 */
export function staffInviteRank(existingMembers: number): "owner" | "reviewer" {
  /**
   * An invitation cannot hand out the authority to bill and to invite
   * while somebody already holds it — that is the rule. An agency with
   * no members is the exception, and the only one: nobody holds it, and
   * the only way a staff invitation reaches an empty agency is an
   * operator provisioning one, which is that operator granting it.
   */
  return existingMembers === 0 ? "owner" : "reviewer";
}
