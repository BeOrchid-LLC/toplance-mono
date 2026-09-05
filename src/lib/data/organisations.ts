import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, orgMembers, organisations, profiles } from "@/lib/db/schema";
import { ORG_NAME_MAX } from "@/lib/domain/organisations";
import {
  EMPTY_PENDING_PROFILE,
  profileColumnsFrom,
  type PendingProfile,
} from "@/lib/domain/pending-profile";

export type CreateOrganisationResult = { ok: true; orgId: string } | { error: string };

// One source, shared with the forms — see `@/lib/domain/organisations`.
const NAME_MAX = ORG_NAME_MAX;

/**
 * The profile a torn-down employer sign-up did not manage to write.
 *
 * `completeProfile` runs from the browser, and Clerk activating the
 * brand-new session navigates the page out from under it, cancelling the
 * write. That used to be invisible: `getProfile` provisioned a row for
 * anyone holding a session. Since travellers became invite-only it does
 * not, so the employer arrived at `/employer`, was found to have no
 * profile, and was sent to `/go` to be told they had no account —
 * moments after creating one.
 *
 * The mirror of `provisionInvitedProfile`, minus the token: that door is
 * gated by an invitation because a traveller needs one, and this door is
 * open by design, so anyone reaching it could have obtained this row
 * through the form anyway. The invariant lives in the role, and the role
 * written here is `org_member` — never `traveler`, which is why this
 * cannot become a way around the invitation.
 *
 * `onConflictDoNothing`, so a traveller or a staff account that opens
 * `/employer` is left exactly as it was rather than quietly becoming an
 * employer. `true` means a row exists now, not that this call wrote it.
 */
export async function provisionEmployerProfile(
  userId: string,
  email: string,
  fullName: string,
  pending: PendingProfile = EMPTY_PENDING_PROFILE
): Promise<boolean> {
  await db
    .insert(profiles)
    .values({
      id: userId,
      email,
      fullName: fullName.trim(),
      role: "org_member",
      // Same reasoning as `provisionInvitedProfile`: the sign-up form's
      // answers reach here through Clerk because the action that used to
      // carry them is cancelled by the redirect off the sign-up page.
      ...profileColumnsFrom(pending),
    })
    .onConflictDoNothing();

  return true;
}

/**
 * A new employer's first act: name an organisation and become its
 * owner, in one transaction — the idiom of `submitApplicationTx`. The
 * profile row is locked for the duration, so a double-click (or two
 * tabs) cannot create two organisations or flip the role twice; a
 * second attempt blocks here, then reads the membership the first one
 * just wrote and refuses.
 *
 * Decides nothing about who is signed in. Its caller, `createOrganisation`
 * in `@/app/employer/actions.ts`, resolves `userId` from the session.
 */
export async function createOrganisationTx(
  userId: string,
  name: string
): Promise<CreateOrganisationResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Your organisation needs a name." };
  if (trimmed.length > NAME_MAX) return { error: "That name is too long." };

  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .for("update")
      .limit(1);

    if (!profile) return { error: "We could not find your account." };

    const [existingMembership] = await tx
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, userId))
      .limit(1);

    if (existingMembership) {
      return { error: "You already belong to an organisation." };
    }

    if (profile.role === "staff") {
      return { error: "Staff accounts cannot create an organisation." };
    }

    if (profile.role === "traveler") {
      // A traveller mid-case must not silently become an employer — the
      // two roles read someone else's documents from opposite sides of
      // the privacy boundary.
      const [existingApplication] = await tx
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.travelerId, userId))
        .limit(1);

      if (existingApplication) {
        return {
          error:
            "This account is a traveler account — use a different email for your organisation.",
        };
      }
    }

    const [org] = await tx
      .insert(organisations)
      .values({ name: trimmed })
      .returning({ id: organisations.id });

    await tx.insert(orgMembers).values({ orgId: org.id, userId, role: "owner" });

    // Flip ONLY traveler → org_member, keyed on this session's userId.
    // Since travellers became invite-only (2026-08-31) the common case
    // is that there is nothing to flip: `completeProfile` already wrote
    // `org_member` at sign-up, so an employer never spends a moment
    // reading as a traveller. The clause stays for the accounts that
    // predate that and for staff, who are refused above — this is a
    // signup step, not a general role editor.
    await tx
      .update(profiles)
      .set({ role: "org_member", updatedAt: new Date() })
      .where(and(eq(profiles.id, userId), eq(profiles.role, "traveler")));

    return { ok: true, orgId: org.id };
  });
}
