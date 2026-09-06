import type { AppRole } from "@/lib/auth/policy";

export type InvitationKind = "client" | "staff";

export type InvitationDoor =
  /** This account may accept this invitation. */
  | "accept"
  /** Signed in as the wrong kind of account entirely. */
  | "wrong-persona";

/**
 * Whether the account currently signed in may accept this invitation.
 *
 * One table carries both invitations an agency sends, and the two want
 * different doors.
 *
 * A **client** invitation attaches an application, and only a traveller
 * owns one. An agency member accepting one would acquire a case inside
 * their own tenant and read their own client's documents as the client.
 *
 * A **staff** invitation attaches a membership, and both personas that
 * can hold one may accept. A traveller can: a colleague signing up
 * through the link is provisioned as `traveler` and flipped by
 * `acceptInvitationTx`, so refusing them here would refuse every new
 * colleague an agency ever hires. An existing `org_member` can too —
 * somebody who already works at one agency being invited to a second,
 * which is a person, not an application, and carries no case with it.
 *
 * Platform staff may accept neither. BeOrchid provisions agencies; it
 * does not join them, and a BeOrchid account holding an agency seat
 * would hold exactly the document access the v1.3 tenancy removed.
 *
 * Address matching is a separate check and deliberately not here: this
 * answers "is this the right kind of account", and `acceptInvitationTx`
 * answers "is this the right person" against the row it locks.
 */
export function invitationDoor(role: AppRole, kind: InvitationKind): InvitationDoor {
  if (role === "staff") return "wrong-persona";
  if (kind === "staff") return "accept";
  return role === "traveler" ? "accept" : "wrong-persona";
}
