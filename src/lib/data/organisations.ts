import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  orgApplicationProgress,
  orgMembers,
  organisations,
  profiles,
} from "@/lib/db/schema";
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
 * not, so the employer arrived at `/agency`, was found to have no
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
 * `/agency` is left exactly as it was rather than quietly becoming an
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
 * in `@/app/[locale]/agency/actions.ts`, resolves `userId` from the session.
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

/**
 * Whether this person is an owner of this agency.
 *
 * §1 gives an agency owner everything a reviewer can do plus staff
 * invitations and billing, so this is the check that separates the two.
 * A reviewer able to invite colleagues is the quiet kind of privilege
 * escalation: nothing looks broken, the agency simply grows people
 * nobody senior approved.
 *
 * Scoped to one agency on purpose. Seniority does not travel between
 * tenants — an owner of agency A is nothing at agency B.
 *
 * Not in `policy.ts` because that file is pure and `Actor` carries only
 * the ids of the agencies somebody belongs to, not their rank inside
 * each. Widening `Actor` for one caller would put a query on the path of
 * every access decision in the product.
 */
export async function isAgencyOwner(userId: string, orgId: string): Promise<boolean> {
  const [row] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)))
    .limit(1);

  return row?.role === "owner";
}

/** One colleague on the team page: who they are, their rank, and since when. */
export type OrgMemberRow = {
  userId: string;
  fullName: string;
  email: string;
  role: (typeof orgMembers.$inferSelect)["role"];
  joinedAt: Date;
};

/**
 * The colleagues inside one agency, oldest first — which puts the owner
 * who created it at the top for free, since `createOrganisationTx`
 * writes that row before any invitation can exist.
 *
 * Columns are named rather than `select()`-ed from `profiles`, for the
 * same reason `listInvitations` names its own: this feeds a rendered
 * roster, and a whole profile row carries a passport number and a date
 * of birth that the team page has no business holding — one future
 * `{...member}` spread away from being on the wire.
 *
 * Takes an org id and filters on it. There is no unfiltered form of this
 * query, because an unfiltered form returns every agency's staff.
 */
export async function listOrgMembers(orgId: string): Promise<OrgMemberRow[]> {
  return db
    .select({
      userId: orgMembers.userId,
      fullName: profiles.fullName,
      email: profiles.email,
      role: orgMembers.role,
      joinedAt: orgMembers.createdAt,
    })
    .from(orgMembers)
    .innerJoin(profiles, eq(profiles.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId))
    .orderBy(orgMembers.createdAt);
}

/**
 * The people one agency sponsors, furthest along first.
 *
 * Read through the progress view, never the applications table
 * directly. The view carries no column that could reveal a document, so
 * the organisation console cannot leak one even by accident.
 *
 * Taking the ids and returning `[]` for an empty list is not a
 * convenience. RLS used to scope this view to the caller's own agency;
 * with RLS gone, an unfiltered select returns every sponsored traveller
 * on the platform — so the empty case has to return here rather than
 * fall through to a query with no restriction.
 */
/**
 * Which slice of the agency's roster to read. Omitted means all of it —
 * the clients page, which lists everyone the agency is responsible for.
 */
export type RosterFilter = { handledBy: string } | { unclaimed: true };

export async function listOrgRoster(
  orgIds: readonly string[],
  filter?: RosterFilter
) {
  if (!orgIds.length) return [];

  const where = [inArray(orgApplicationProgress.orgId, [...orgIds])];
  if (filter && "handledBy" in filter) {
    where.push(eq(applications.assigneeId, filter.handledBy));
  }
  if (filter && "unclaimed" in filter) {
    where.push(isNull(applications.assigneeId));
  }

  // Joined to `applications` for `assignee_id` alone: the progress view
  // does not carry it, and adding a column to a view is a migration
  // where a join is a line. The columns are named rather than spread,
  // so the join cannot widen what this returns — the view's whole point
  // is that it has no column a document could hide in.
  return db
    .select({
      id: orgApplicationProgress.id,
      caseRef: orgApplicationProgress.caseRef,
      fullName: orgApplicationProgress.fullName,
      status: orgApplicationProgress.status,
      destinationIso: orgApplicationProgress.destinationIso,
      visaName: orgApplicationProgress.visaName,
      documentsTotal: orgApplicationProgress.documentsTotal,
      documentsVerified: orgApplicationProgress.documentsVerified,
      completionPct: orgApplicationProgress.completionPct,
    })
    .from(orgApplicationProgress)
    .innerJoin(applications, eq(applications.id, orgApplicationProgress.id))
    .where(and(...where))
    .orderBy(desc(orgApplicationProgress.completionPct));
}
