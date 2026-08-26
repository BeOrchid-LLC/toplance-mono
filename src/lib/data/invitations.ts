import "server-only";

import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, invitations, organisations, type Invitation } from "@/lib/db/schema";
import type { TravelPurpose } from "@/lib/visa/types";

export type CreateInvitationResult =
  | { ok: true; invitation: Invitation }
  | { error: string };

export type AcceptInvitationResult = { ok: true; orgId: string } | { error: string };

export type MutateInvitationResult = { ok: true } | { error: string };

/**
 * The roster's own shape: everything about an invitation except its
 * bearer token. `listInvitations` renders straight into the employer
 * console — a row that carried `token` would be one future `{...invite}`
 * spread away from a live leak of the accept credential, so the token
 * column is never selected for this path at all.
 */
export type ListedInvitation = Omit<Invitation, "token">;

/** What the accept page shows a visitor before they have done anything. */
export type InvitationPreview = {
  orgName: string;
  fullName: string;
  destinationIso: string | null;
  purpose: TravelPurpose | null;
  status: Invitation["status"];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * An employer's invitation to a named email address. `token` and
 * `expiresAt` are left to the column defaults — `encode(gen_random_bytes(24),
 * 'hex')` and `now() + interval '30 days'` — so this function decides
 * nothing about either.
 */
export async function createInvitation(
  orgId: string,
  invitedBy: string,
  input: {
    email: string;
    fullName?: string;
    jobTitle?: string;
    destinationIso?: string;
    purpose?: TravelPurpose;
  }
): Promise<CreateInvitationResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const [existing] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.orgId, orgId),
        eq(invitations.email, email),
        eq(invitations.status, "pending")
      )
    )
    .limit(1);

  if (existing) {
    return { error: "There is already a pending invitation for that address." };
  }

  const [invitation] = await db
    .insert(invitations)
    .values({
      orgId,
      invitedBy,
      email,
      fullName: input.fullName?.trim() || "",
      jobTitle: input.jobTitle?.trim() || null,
      destinationIso: input.destinationIso || null,
      purpose: input.purpose,
    })
    .returning();

  return { ok: true, invitation };
}

/**
 * Newest first. A `pending` row past `expiresAt` reads as `expired` in
 * the shape this returns — the roster should never show a dead link as
 * live — but the stored column is untouched: flipping it is
 * `acceptInvitationTx`'s job, the one place that also needs the lock.
 *
 * Selects every column except `token` by name, rather than `select()`.
 * The roster is the one invitation surface with no reason to ever hold
 * the bearer credential — only `createInvitation` (which just minted it)
 * and `getInvitationPreview`/`acceptInvitationTx` (both keyed BY the
 * token, not selecting it out) have any business reading that column.
 */
export async function listInvitations(orgId: string): Promise<ListedInvitation[]> {
  const rows = await db
    .select({
      id: invitations.id,
      orgId: invitations.orgId,
      email: invitations.email,
      fullName: invitations.fullName,
      jobTitle: invitations.jobTitle,
      destinationIso: invitations.destinationIso,
      purpose: invitations.purpose,
      status: invitations.status,
      invitedBy: invitations.invitedBy,
      acceptedBy: invitations.acceptedBy,
      acceptedAt: invitations.acceptedAt,
      createdAt: invitations.createdAt,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.orgId, orgId))
    .orderBy(desc(invitations.createdAt));

  const now = new Date();
  return rows.map((row) =>
    row.status === "pending" && row.expiresAt < now
      ? { ...row, status: "expired" as const }
      : row
  );
}

/**
 * What the accept page shows, signed in or not — this is the one read
 * in the whole invitation surface with no guard in front of it, because
 * the visitor holding the link IS the credential (see the trade-off
 * comment on `acceptInvitationTx`). `null` means the token matches
 * nothing at all; a dead status (`expired` / `revoked` / `accepted`) is
 * still returned so the page can say which, but the page never shows
 * `orgName` on a dead row — that is the page's call, not this
 * function's, since a preview and a dead-end share this one query.
 */
export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const [row] = await db
    .select({
      status: invitations.status,
      fullName: invitations.fullName,
      destinationIso: invitations.destinationIso,
      purpose: invitations.purpose,
      expiresAt: invitations.expiresAt,
      orgName: organisations.name,
    })
    .from(invitations)
    .innerJoin(organisations, eq(organisations.id, invitations.orgId))
    .where(eq(invitations.token, token))
    .limit(1);

  if (!row) return null;

  const status =
    row.status === "pending" && row.expiresAt < new Date() ? "expired" : row.status;

  return {
    orgName: row.orgName,
    fullName: row.fullName,
    destinationIso: row.destinationIso,
    purpose: row.purpose,
    status,
  };
}

/**
 * `status='revoked'` only where currently `pending`, scoped to the
 * caller's own org in the same `where` — the guard checks membership,
 * this checks the row actually belongs to that org, and the two must
 * agree or a member of one org could revoke another's invitation by id.
 */
export async function revokeInvitation(
  orgId: string,
  invitationId: string
): Promise<MutateInvitationResult> {
  const updated = await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.orgId, orgId),
        eq(invitations.status, "pending")
      )
    )
    .returning({ id: invitations.id });

  if (!updated.length) return { error: "That invitation can no longer be revoked." };
  return { ok: true };
}

/**
 * Accepting an invitation, as one transaction with the invitation row
 * locked for its duration — the same idiom as `submitApplicationTx` and
 * `createOrganisationTx`: a second accept on the same token blocks here,
 * then reads the first one's write and refuses instead of racing it.
 *
 * Deliberate trade-off: the token is the bearer credential (48 hex
 * characters, mailed to the invited address) — whoever holds the link
 * accepts it. Accepting does NOT require the signed-in email to match
 * the invited one; someone might reasonably accept from a different
 * personal address than the one HR typed in. `acceptedBy` is the
 * record of who actually joined, independent of `invitations.email`.
 *
 * Attaching the org handles both orders an application can arrive in:
 * an invitee with no account yet (the insert below wins, carrying the
 * org from the start) and a traveller who already began their intake
 * before the invitation landed (the insert loses to the unique
 * `travelerId` row `getOrCreateApplication` wrote, so the update
 * attaches the org to it instead). A traveller already sponsored by a
 * DIFFERENT org matches neither branch and is refused rather than
 * silently reassigned.
 */
export async function acceptInvitationTx(
  token: string,
  travelerId: string
): Promise<AcceptInvitationResult> {
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .for("update")
      .limit(1);

    if (!invitation) return { error: "This invitation link is not valid." };
    if (invitation.status === "revoked") {
      return { error: "This invitation has been revoked." };
    }
    if (invitation.status === "accepted") {
      return { error: "This invitation has already been accepted." };
    }
    if (invitation.status === "expired") {
      return { error: "This invitation has expired." };
    }

    // Only "pending" remains, but pending is not the same as live: a
    // link nobody opened in time flips here, under the same lock that
    // is about to accept it, so no other reader can observe the
    // now-stale "pending" in between.
    if (invitation.expiresAt < new Date()) {
      await tx
        .update(invitations)
        .set({ status: "expired" })
        .where(eq(invitations.id, invitation.id));
      return { error: "This invitation has expired." };
    }

    const created = await tx
      .insert(applications)
      .values({ travelerId, orgId: invitation.orgId })
      .onConflictDoNothing({ target: applications.travelerId })
      .returning({ id: applications.id });

    if (!created.length) {
      const updated = await tx
        .update(applications)
        .set({ orgId: invitation.orgId })
        .where(
          and(
            eq(applications.travelerId, travelerId),
            or(
              isNull(applications.orgId),
              eq(applications.orgId, invitation.orgId)
            )
          )
        )
        .returning({ id: applications.id });

      if (!updated.length) {
        return { error: "This account is already sponsored by another organisation." };
      }
    }

    await tx
      .update(invitations)
      .set({ status: "accepted", acceptedBy: travelerId, acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    return { ok: true, orgId: invitation.orgId };
  });
}
