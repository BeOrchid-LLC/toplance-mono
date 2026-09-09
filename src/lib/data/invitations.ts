import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  invitations,
  orgMembers,
  organisations,
  profiles,
  type Invitation,
} from "@/lib/db/schema";
import {
  EMPTY_PENDING_PROFILE,
  profileColumnsFrom,
  type PendingProfile,
} from "@/lib/domain/pending-profile";
import type { TravelPurpose } from "@/lib/visa/types";

export type CreateInvitationResult =
  | { ok: true; invitation: Invitation }
  | { error: string };

/**
 * `orgId` is `null` on a platform staff invitation, which attaches a
 * BeOrchid rank rather than an agency. Callers use it to name what was
 * joined, and there is nothing to name.
 */
export type AcceptInvitationResult =
  | { ok: true; orgId: string | null }
  | { error: string };

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
  /**
   * `null` on a platform staff invitation — BeOrchid is not a tenant and
   * has no `organisations` row. The accept page branches on it rather
   * than printing an empty name.
   */
  orgName: string | null;
  /**
   * The address the invitation was sent to, so the sign-up door can
   * fix the email field rather than ask for it and refuse a miss.
   *
   * This is disclosed to whoever holds the token. The preview already
   * discloses fullName on the same read, so a token names its person
   * either way; what withholding the address bought was not privacy,
   * it was a retyped answer the server then rejected.
   */
  email: string;
  fullName: string;
  kind: Invitation["kind"];
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
  /** `null` mints a platform staff invitation, which belongs to no agency. */
  orgId: string | null,
  invitedBy: string,
  input: {
    email: string;
    fullName?: string;
    /**
     * `client` (the default) invites somebody whose visa the agency is
     * handling; `staff` invites a colleague who will review those
     * applications. See `invitationKind` in the schema for why both live
     * on one table.
     */
    kind?: Invitation["kind"];
    /** Required on a `platform_staff` invitation, and refused on any other. */
    staffRank?: "reviewer" | "owner";
    jobTitle?: string;
    destinationIso?: string;
    purpose?: TravelPurpose;
  }
): Promise<CreateInvitationResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  // `eq(org_id, null)` is never true in SQL, so without this branch a
  // platform invitation would match no existing row and a second one to
  // the same address would be minted silently.
  const scope = orgId === null ? isNull(invitations.orgId) : eq(invitations.orgId, orgId);

  const [existing] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(scope, eq(invitations.email, email), eq(invitations.status, "pending")))
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
      kind: input.kind ?? "client",
      staffRank: input.staffRank ?? null,
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
      kind: invitations.kind,
      staffRank: invitations.staffRank,
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
 * The platform's own invitation roster — every BeOrchid staff invite,
 * newest first.
 *
 * Scoped by `org_id is null` rather than by kind, which is the same set
 * (`platform_invite_has_no_org` makes the two conditions equivalent) and
 * is the one the partial index is built on.
 *
 * Selects every column except `token`, exactly as `listInvitations`
 * does, and for a sharper reason: this token grants a rank in the
 * console that curates every corridor.
 */
export async function listPlatformInvitations(): Promise<ListedInvitation[]> {
  const rows = await db
    .select({
      id: invitations.id,
      orgId: invitations.orgId,
      email: invitations.email,
      fullName: invitations.fullName,
      kind: invitations.kind,
      staffRank: invitations.staffRank,
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
    .where(isNull(invitations.orgId))
    .orderBy(desc(invitations.createdAt));

  const now = new Date();
  return rows.map((row) =>
    row.status === "pending" && row.expiresAt < now
      ? { ...row, status: "expired" as const }
      : row
  );
}

/**
 * The same gate `resendableInvitation` is, for an invitation that
 * belongs to no agency. Scoped to platform rows so an ops action can
 * never reach into a tenant's roster and resend a client's link.
 */
export async function resendablePlatformInvitation(
  invitationId: string
): Promise<(ResendableInvitation & { staffRank: "reviewer" | "owner" }) | null> {
  const [row] = await db
    .select({
      token: invitations.token,
      email: invitations.email,
      fullName: invitations.fullName,
      staffRank: invitations.staffRank,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        isNull(invitations.orgId),
        eq(invitations.status, "pending")
      )
    )
    .limit(1);

  if (!row || row.expiresAt < new Date()) return null;

  return {
    token: row.token,
    email: row.email,
    fullName: row.fullName,
    // The rank travels with the resend so the second email says the same
    // thing as the first. `platform_invite_has_no_org` guarantees it is
    // set on any row this query can return.
    staffRank: row.staffRank ?? "reviewer",
  };
}

/** Revoke a platform staff invitation. Same scoping as the read above. */
export async function revokePlatformInvitation(
  invitationId: string
): Promise<MutateInvitationResult> {
  const updated = await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(invitations.id, invitationId),
        isNull(invitations.orgId),
        eq(invitations.status, "pending")
      )
    )
    .returning({ id: invitations.id });

  if (!updated.length) return { error: "That invitation can no longer be revoked." };
  return { ok: true };
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
      email: invitations.email,
      fullName: invitations.fullName,
      kind: invitations.kind,
      destinationIso: invitations.destinationIso,
      purpose: invitations.purpose,
      expiresAt: invitations.expiresAt,
      orgName: organisations.name,
    })
    .from(invitations)
    // A left join, not an inner one. A platform staff invitation has no
    // organisation, and an inner join would drop the row entirely — so a
    // perfectly good token would read as "this link is not valid".
    .leftJoin(organisations, eq(organisations.id, invitations.orgId))
    .where(eq(invitations.token, token))
    .limit(1);

  if (!row) return null;

  const status =
    row.status === "pending" && row.expiresAt < new Date() ? "expired" : row.status;

  return {
    orgName: row.orgName,
    email: row.email,
    fullName: row.fullName,
    kind: row.kind,
    destinationIso: row.destinationIso,
    purpose: row.purpose,
    status,
  };
}

/**
 * The invited address behind a token, and `null` for every reason a
 * token might not entitle its bearer to anything: it matches no row, it
 * has been revoked or already accepted, or it is past `expiresAt`.
 *
 * Deliberately not `getInvitationPreview`. That one feeds a page and
 * returns dead rows on purpose, so the page can say *which* kind of
 * dead. This one is a gate, and a gate wants one answer — it is the
 * check standing between a stranger and a traveller account, so it
 * collapses every dead state into the same `null` rather than inviting
 * a caller to interpret a status enum correctly.
 */
export async function pendingInvitationEmail(token: string): Promise<string | null> {
  if (!token) return null;

  const [row] = await db
    .select({
      email: invitations.email,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!row || row.status !== "pending" || row.expiresAt < new Date()) return null;
  return row.email;
}

/** Whether an invitation is live, and whether it names this address. */
export type InvitedAddressCheck = "ok" | "dead" | "mismatch";

/**
 * The one comparison behind "is this the person the invitation names",
 * so the three places that ask cannot drift apart.
 *
 * `roleFor` asks it to decide a role, `provisionInvitedProfile` to
 * decide whether to write a row, and the sign-up form asks it *before*
 * `signUp.create()` — the case this exists for. Until then the answer
 * arrived only after Clerk had made an account and spent an emailed
 * code, by which point the form the visitor would fix their typo in no
 * longer existed.
 *
 * Three answers rather than a boolean, because "no live invitation" and
 * "not your address" are different sentences to a person and a caller
 * holding `false` would have to guess which it had.
 *
 * It answers about an address the caller already supplied and never
 * returns the invited one. That matters here more than in the callers
 * above: this is reachable from the browser, on a page whose whole
 * premise is that the link may have been forwarded, and the invited
 * address is the one fact on an invitation belonging to somebody who
 * may not be the reader.
 */
export async function checkInvitedAddress(
  token: string,
  email: string
): Promise<InvitedAddressCheck> {
  const invited = await pendingInvitationEmail(token);
  if (!invited) return "dead";
  return invited.toLowerCase() === email.trim().toLowerCase() ? "ok" : "mismatch";
}

/**
 * The profile a torn-down sign-up did not manage to write.
 *
 * `completeProfile` runs from the browser, and Clerk activating the
 * brand-new session navigates the page out from under it — the write can
 * be cancelled mid-flight. That was survivable while `getProfile`
 * provisioned a row for anyone holding a session; since travellers
 * became invite-only it is not, and the traveller lands on their own
 * invitation as a stranger.
 *
 * So the same write happens again here, server-side, on the page the
 * token names, where no client navigation can interrupt it. This is not
 * a second door: it writes only what the invitation already entitles
 * that address to, applying the same checks as the sign-up gate, and
 * `onConflictDoNothing` means it can never overwrite a row that exists —
 * an employer or a staff account opening an invitation link is left
 * exactly as it was.
 *
 * `fullName` is the name Clerk holds, and it is preferred over the one
 * the employer typed into the invite dialog. `signUp.create` sends it
 * before the session exists, which makes it the one field on this path
 * that a cancelled write cannot lose — and the name the intake agent
 * greets the traveller by, so getting it from the wrong place is not
 * cosmetic. The invitation's name is the fallback.
 *
 * Phone, country and language used to be unrecoverable here, and the
 * profile went without them until `/app/profile` — the accepted trade
 * being that a traveller who can act beats a dead end. `pending` ends
 * that trade: the sign-up form now hands those answers to Clerk before
 * the session exists, so this path can spend them. Language mattered
 * most of the three and was the quietest to lose — it decides which
 * language the intake agent opens in, and a traveller who chose Hausa
 * was met in English with nothing on screen to explain why.
 *
 * Still absent-tolerant. `pending` is validated, every field of it is
 * optional, and a profile written without any of them is the same row
 * this wrote before.
 */
export async function provisionInvitedProfile(
  token: string,
  userId: string,
  email: string,
  fullName?: string,
  pending: PendingProfile = EMPTY_PENDING_PROFILE
): Promise<boolean> {
  const invited = await pendingInvitationEmail(token);
  if (!invited || invited.toLowerCase() !== email.toLowerCase()) return false;

  const [row] = await db
    .select({ fullName: invitations.fullName })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  await db
    .insert(profiles)
    .values({
      id: userId,
      email,
      fullName: fullName?.trim() || row?.fullName || "",
      role: "traveler",
      ...profileColumnsFrom(pending),
    })
    .onConflictDoNothing();

  return true;
}

/** Everything an invitation email needs, and nothing else. */
export type ResendableInvitation = {
  token: string;
  email: string;
  fullName: string;
};

/**
 * The one read that hands a live token back to the employer who sent it.
 *
 * `listInvitations` refuses to select the token on purpose — the roster
 * has no business carrying the bearer credential into every render — but
 * that leaves an employer whose invitation email silently failed with no
 * way to reach the link at all, which under invite-only means a
 * traveller who can never get in. This is the deliberate exception:
 * narrow, keyed on one id, and returning only what the email needs.
 *
 * Scoped to the caller's own org in the same `where` as the id, the same
 * shape as `revokeInvitation` — the guard checks membership, this checks
 * the row belongs to that org, and the two must agree or a member of one
 * org could read another's live token by guessing an id.
 *
 * A read, not a write: the token is not rotated, because a first email
 * that was merely slow should still work, and `expiresAt` is not
 * extended, because quietly lengthening the life of a bearer link is not
 * a side effect a resend button should have. Once expired the answer is
 * `null` — that invitation needs sending again, not resending.
 */
export async function resendableInvitation(
  orgId: string,
  invitationId: string
): Promise<ResendableInvitation | null> {
  const [row] = await db
    .select({
      token: invitations.token,
      email: invitations.email,
      fullName: invitations.fullName,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.orgId, orgId),
        eq(invitations.status, "pending")
      )
    )
    .limit(1);

  if (!row || row.expiresAt < new Date()) return null;

  return { token: row.token, email: row.email, fullName: row.fullName };
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
 * The invited address is binding, and it is checked here rather than
 * only at sign-up (client decision, 2026-08-31). The token is a bearer
 * credential — 48 hex characters, mailed to one address — so holding it
 * proves the link was received, never that the holder is the person it
 * names. A forwarded link is the ordinary case, not the exotic one.
 *
 * Enforcing it in both places is the point. `completeProfile` refuses to
 * mint a traveller for an unmatched address, so this check should be
 * unreachable through the accept button; it stands anyway, because that
 * one guards a role and this one guards a roster. An account that
 * became a traveller through some other invitation must not be able to
 * walk onto a second employer's list by opening their link.
 *
 * The email comes from `profiles`, read inside this transaction, rather
 * than from an argument. A caller that could pass the email is a caller
 * that could pass the wrong one.
 *
 * Since the v1.3 tenancy this is the only thing that creates an
 * application, because it is the only thing that knows which agency a
 * traveller belongs to. `getApplication` used to open a draft on first
 * visit and no longer does — an agency-less case is not expressible,
 * `applications.org_id` being `not null`.
 *
 * The update branch below therefore handles exactly one case: the same
 * agency inviting the same traveller twice, which is a no-op success. A
 * traveller already held by a DIFFERENT agency matches neither branch
 * and is refused rather than silently reassigned — one traveller
 * belongs to one agency, and a move is a support operation.
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

    // After the status checks, deliberately: a dead token is dead for
    // everyone, and "expired" is the more useful thing to be told than
    // "wrong address". Refusing here leaves the row `pending`, so the
    // invitation is still there for the person it actually names.
    const [profile] = await tx
      .select({ email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, travelerId))
      .limit(1);

    // `createInvitation` lowercases what the employer typed; Clerk keeps
    // whatever case the traveller signed up with.
    if (!profile || profile.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return { error: "This invitation was sent to a different email address." };
    }

    if (invitation.kind === "platform_staff") {
      /**
       * A BeOrchid colleague, at the rank the owner who sent this chose.
       *
       * **One UPDATE, both columns.** `staff_role_only_for_staff` says a
       * `staff_role` may exist only on a `staff` row, so writing the two
       * in separate statements would trip the check in between.
       *
       * Narrowed to `traveler` for the same reason the agency branch is:
       * this is an invitation, not a general role editor. It cannot
       * demote an existing staff account or convert an agency member —
       * `invitationDoor` refuses the latter before the page even renders
       * an Accept button, and this is the second line behind it.
       *
       * Unlike the agency branch, the rank comes off the invitation
       * rather than being hardcoded to the lower of the two. That is the
       * deliberate divergence recorded in the design: a platform
       * invitation may mint an owner, because only an owner can send
       * one, and the rank is fixed by the sender rather than chosen by
       * whoever holds the link.
       */
      if (!invitation.staffRank) {
        // `platform_invite_has_no_org` makes this unreachable; the
        // column is nullable and the compiler is right to ask.
        return { error: "This invitation link is not valid." };
      }

      await tx
        .update(profiles)
        .set({ role: "staff", staffRole: invitation.staffRank })
        .where(and(eq(profiles.id, travelerId), eq(profiles.role, "traveler")));
    } else if (invitation.kind === "staff") {
      // A colleague gets a seat, not a case. `reviewer` rather than
      // `owner`: an invitation cannot mint someone with the authority to
      // bill and to invite, which has to stay with the person who
      // already has it.
      //
      // `onConflictDoNothing` on the composite key makes re-accepting a
      // no-op rather than a demotion — an owner who accepts a second
      // invitation stays an owner.
      // Guaranteed by `platform_invite_has_no_org`, asked for by the
      // compiler now that the column is nullable.
      if (!invitation.orgId) return { error: "This invitation link is not valid." };

      /**
       * Unless there is nobody to keep it away from.
       *
       * `provisionTenantTx` creates an agency with no membership rows
       * and one `kind: "staff"` invitation, so the first person through
       * the door arrives at an empty agency. As a reviewer they landed
       * on a console closed for an unpaid plan, were told only a
       * director could start it, and had no director to ask — an agency
       * that nobody inside it could ever open, unstickable except by an
       * operator running `setMemberRole` by hand, which nothing asks
       * them to do.
       *
       * The rule above protects authority that somebody already holds.
       * Here nobody holds it, and the only way a staff invitation
       * reaches an empty agency is an operator provisioning one — which
       * is that operator granting the authority, the same act the
       * provision dialog describes as making them the director.
       *
       * Counted inside the transaction, so the read and the insert
       * cannot be separated by another commit. Note what the lock this
       * transaction holds is: the *invitation* row, not the agency. Two
       * accepts of the same invitation are therefore serialised, and
       * the second sees a member; two accepts of two different
       * invitations into one empty agency would not be, and would both
       * read zero. That cannot happen today — `provisionTenantTx` mints
       * exactly one, and every other staff invitation is created by
       * somebody who is already a member — but a second provisioning
       * invitation would need a lock on the organisation here, not this
       * comment's assurance.
       */
      const [existing] = await tx
        .select({ n: count() })
        .from(orgMembers)
        .where(eq(orgMembers.orgId, invitation.orgId));
      const role = (existing?.n ?? 0) === 0 ? "owner" : "reviewer";

      await tx
        .insert(orgMembers)
        .values({ orgId: invitation.orgId, userId: travelerId, role })
        .onConflictDoNothing();

      // So they read as agency rather than as a traveller everywhere the
      // persona is resolved. Narrowed to `traveler` for the same reason
      // `createOrganisationTx` narrows it: this is an invitation, not a
      // general role editor, and it must not quietly demote staff.
      await tx
        .update(profiles)
        .set({ role: "org_member" })
        .where(and(eq(profiles.id, travelerId), eq(profiles.role, "traveler")));
    } else {
      if (!invitation.orgId) return { error: "This invitation link is not valid." };

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
              eq(applications.orgId, invitation.orgId)
            )
          )
          .returning({ id: applications.id });

        if (!updated.length) {
          // One traveller belongs to one agency, so a second agency
          // inviting the same person is refused rather than silently
          // reassigning them. A move is a support operation — it
          // reassigns `org_id`, which is metadata, so it stays inside
          // the boundary BeOrchid keeps to.
          //
          // Deliberately not vague. The person reading this is the
          // traveller, who already knows which agency they are with, so
          // naming the situation tells them nothing they did not know
          // and tells them what to do about it. The inviting agency
          // learns nothing either way: this returns before the status
          // update, so their roster still shows `pending` and cannot be
          // read as a signal that somebody else holds this client.
          return {
            error:
              "You are already working with another agency. Ask them to contact us to move your case.",
          };
        }
      }
    }

    await tx
      .update(invitations)
      .set({ status: "accepted", acceptedBy: travelerId, acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    return { ok: true, orgId: invitation.orgId };
  });
}
