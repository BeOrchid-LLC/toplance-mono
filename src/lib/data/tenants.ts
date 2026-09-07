import "server-only";

import { and, count, desc, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  demoRequests,
  invitations,
  orgMembers,
  organisations,
  profiles,
} from "@/lib/db/schema";
import type { ApplicationStatus } from "@/lib/domain/status";
import { ORG_NAME_MAX } from "@/lib/domain/organisations";

/**
 * What BeOrchid is allowed to know about the agencies on the platform.
 *
 * **This module selects `count(*)` from `applications` and never a row.**
 * No `case_ref`, no `traveler_id`, no status per case, no document. That
 * is not a stylistic preference — the v1.3 tenancy moved review into the
 * agency and deleted the console's case screens because they reached a
 * traveller's documents without passing through
 * `requireApplicationAccess` (see `@/app/[locale]/ops/page.tsx`). Ops
 * learns that an agency has forty-one applications and that six are with
 * a reviewer. It cannot learn whose.
 *
 * Adding an identifying column here is a change to that decision, not a
 * change to a query. It needs the platform team, not a code review.
 */

/** The four buckets a status falls into, and the two flat counts beside them. */
export type TenantCounts = {
  /** Seats used: members of the agency. See the spec on what a seat means. */
  members: number;
  applicationsTotal: number;
  inProgress: number;
  withReviewer: number;
  approved: number;
  rejected: number;
  pendingInvitations: number;
};

export type TenantRow = {
  id: string;
  name: string;
  domain: string | null;
  seatsPurchased: number;
  billingContact: string | null;
  suspendedAt: Date | null;
  createdAt: Date;
} & TenantCounts;

export type TenantMember = {
  userId: string;
  fullName: string;
  email: string;
  role: "reviewer" | "owner";
  joinedAt: Date;
};

export type TenantPendingInvite = {
  id: string;
  email: string;
  fullName: string;
  kind: "client" | "staff";
  createdAt: Date;
  expiresAt: Date;
};

/**
 * `members_` rather than `members` because `TenantCounts.members` is
 * already the seat count. One object with two different things called
 * `members` is a bug waiting for a tired reader.
 */
export type TenantDetail = TenantRow & {
  members_: TenantMember[];
  pendingInvites: TenantPendingInvite[];
};

/**
 * Which headline number a raw status contributes to.
 *
 * Exhaustive over the enum by type, so adding an eighth
 * `application_status` value is a compile error here rather than a
 * silent zero in a console someone is reading to make a decision.
 */
const BUCKET: Record<
  ApplicationStatus,
  "inProgress" | "withReviewer" | "approved" | "rejected"
> = {
  draft: "inProgress",
  collecting_documents: "inProgress",
  additional_documents: "inProgress",
  submitted: "withReviewer",
  under_review: "withReviewer",
  approved: "approved",
  rejected: "rejected",
};

const ZERO_COUNTS: TenantCounts = {
  members: 0,
  applicationsTotal: 0,
  inProgress: 0,
  withReviewer: 0,
  approved: 0,
  rejected: 0,
  pendingInvitations: 0,
};

/**
 * Every agency with its numbers, newest first.
 *
 * Four grouped queries and three Maps rather than one query with joined
 * aggregate subqueries — the idiom `listCorridors` already uses in this
 * directory. Joining a one-to-many count onto the base row multiplies
 * the rows before it aggregates them, and the shape that avoids that is
 * harder to read than four flat `group by`s. What matters is that the
 * cost does not grow with the number of tenants: there is no per-tenant
 * follow-up query here.
 */
export async function listTenants(): Promise<TenantRow[]> {
  const [orgs, memberCounts, statusCounts, inviteCounts] = await Promise.all([
    db
      .select({
        id: organisations.id,
        name: organisations.name,
        domain: organisations.domain,
        seatsPurchased: organisations.seatsPurchased,
        billingContact: organisations.billingContact,
        suspendedAt: organisations.suspendedAt,
        createdAt: organisations.createdAt,
      })
      .from(organisations)
      .orderBy(desc(organisations.createdAt)),

    db
      .select({ orgId: orgMembers.orgId, total: count() })
      .from(orgMembers)
      .groupBy(orgMembers.orgId),

    db
      .select({
        orgId: applications.orgId,
        status: applications.status,
        total: count(),
      })
      .from(applications)
      .groupBy(applications.orgId, applications.status),

    db
      .select({ orgId: invitations.orgId, total: count() })
      .from(invitations)
      .where(eq(invitations.status, "pending"))
      .groupBy(invitations.orgId),
  ]);

  const membersByOrg = new Map(memberCounts.map((m) => [m.orgId, m.total]));
  const invitesByOrg = new Map(inviteCounts.map((i) => [i.orgId, i.total]));

  const countsByOrg = new Map<string, TenantCounts>();
  for (const row of statusCounts) {
    const current = countsByOrg.get(row.orgId) ?? { ...ZERO_COUNTS };
    current.applicationsTotal += row.total;
    current[BUCKET[row.status]] += row.total;
    countsByOrg.set(row.orgId, current);
  }

  // Spread `ZERO_COUNTS` first, so an agency with no applications, no
  // members and no invitations reports zeroes rather than being dropped.
  return orgs.map((org) => ({
    ...org,
    ...ZERO_COUNTS,
    ...countsByOrg.get(org.id),
    members: membersByOrg.get(org.id) ?? 0,
    pendingInvitations: invitesByOrg.get(org.id) ?? 0,
  }));
}

/** One agency with its roster and its live invitations, or null. */
export async function getTenant(orgId: string): Promise<TenantDetail | null> {
  const rows = await listTenants();
  const row = rows.find((r) => r.id === orgId);
  if (!row) return null;

  const [members_, pendingInvites] = await Promise.all([
    db
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
      .orderBy(orgMembers.createdAt),

    // Never selects `token`. The console has no reason to hold an
    // agency's accept credential — the same stance `listInvitations`
    // takes for the agency's own roster.
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        fullName: invitations.fullName,
        kind: invitations.kind,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(and(eq(invitations.orgId, orgId), eq(invitations.status, "pending")))
      .orderBy(desc(invitations.createdAt)),
  ]);

  return { ...row, members_, pendingInvites };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProvisionInput = {
  name: string;
  domain?: string;
  seatsPurchased?: number;
  billingContact?: string;
  ownerEmail: string;
  ownerName?: string;
  /** The enquiry this agency came from, when it came from one. */
  demoRequestId?: string;
};

export type ProvisionResult =
  | { ok: true; orgId: string; inviteToken: string }
  | { error: string };

/**
 * Create an agency and invite the person who will run it, in one
 * transaction.
 *
 * The invitation is inserted here rather than through
 * `createInvitation` for two reasons. That function runs against `db`
 * and so cannot join this transaction — and a half-provisioned tenant
 * (an agency nobody was invited to, or an enquiry marked converted
 * pointing at nothing) must not be a reachable state. Its
 * duplicate-pending-invitation guard is also vacuous against an
 * organisation created three statements earlier.
 *
 * `token` and `expiresAt` are still left to the column defaults, so this
 * decides nothing about either that `createInvitation` does not.
 *
 * `kind: "staff"` and **no membership row**. The invitee becomes a
 * `reviewer` when they accept, through the untouched `acceptInvitationTx`
 * — an invitation in this product cannot mint an owner. Ops promotes
 * them afterwards with `setMemberRole`. Two acts, both audited.
 *
 * The email is NOT sent from here. Sending inside the transaction would
 * put a live invitation link in somebody's inbox pointing at an agency a
 * later rollback removed; the caller sends it once this has committed.
 *
 * When a demo request is named, it is locked with `select ... for
 * update` and checked BEFORE anything is inserted — not stamped after
 * the fact and rolled back if it turns out to be missing. Checking
 * first means a missing id is an early `return` that commits an empty
 * transaction rather than a `tx.rollback()` throwing through the
 * transaction wrapper.
 *
 * The lock only serializes two concurrent calls naming the same
 * enquiry; it does not by itself make the second one correct, which is
 * why the same lookup also reads `status`. Without that check, a
 * double-submit or a retry after an ambiguous timeout would find the
 * row still present, provision a second agency, and silently overwrite
 * `convertedOrgId` onto the new one — orphaning the first agency from
 * the enquiry it was made from with nobody told. So a request that is
 * already `converted` is refused before anything is inserted, same as
 * a missing one.
 */
export async function provisionTenantTx(
  input: ProvisionInput,
  actorId: string
): Promise<ProvisionResult> {
  const name = input.name.trim();
  if (!name) return { error: "The agency needs a name." };
  if (name.length > ORG_NAME_MAX) return { error: "That name is too long." };

  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(ownerEmail)) {
    return { error: "Enter a valid email address for the first owner." };
  }

  const seats = input.seatsPurchased ?? 0;
  if (!Number.isInteger(seats) || seats < 0) {
    return { error: "Seats must be a whole number, zero or more." };
  }

  return db.transaction(async (tx) => {
    if (input.demoRequestId) {
      const [existing] = await tx
        .select({ id: demoRequests.id, status: demoRequests.status })
        .from(demoRequests)
        .where(eq(demoRequests.id, input.demoRequestId))
        .for("update")
        .limit(1);

      // A request id that matches nothing means the console showed a row
      // that is no longer there. Nothing has been inserted yet, so this
      // is simply an early return that commits an empty transaction —
      // provisioning "from" an enquiry that does not exist is not what
      // the operator asked for.
      if (!existing) {
        return { error: "We could not find that demo request." };
      }

      // The lock stops two provisions of this enquiry from interleaving,
      // but it does not stop a second one from happening — a
      // double-submit or a retry would otherwise find the row still
      // sitting there and quietly re-point it at a second agency. This
      // is the check that actually refuses that: the operator is looking
      // at a row that already became something, so it is not this call's
      // to convert again.
      if (existing.status === "converted") {
        return { error: "That demo request has already been converted." };
      }
    }

    const [org] = await tx
      .insert(organisations)
      .values({
        name,
        domain: input.domain?.trim() || null,
        seatsPurchased: seats,
        billingContact: input.billingContact?.trim() || null,
      })
      .returning({ id: organisations.id });

    const [invitation] = await tx
      .insert(invitations)
      .values({
        orgId: org.id,
        invitedBy: actorId,
        email: ownerEmail,
        fullName: input.ownerName?.trim() || "",
        kind: "staff",
      })
      .returning({ token: invitations.token });

    if (input.demoRequestId) {
      await tx
        .update(demoRequests)
        .set({ status: "converted", convertedOrgId: org.id })
        .where(eq(demoRequests.id, input.demoRequestId));
    }

    return { ok: true, orgId: org.id, inviteToken: invitation.token };
  });
}

/**
 * Take an agency's reach away, or give it back.
 *
 * `liveOrgIdsFor` drops a suspended membership before it reaches
 * `Actor.orgIds`, so every `isAgencyFor` check answers no the moment
 * this commits. The traveller keeps their own case throughout —
 * `ownsApplication` never consults the agency, deliberately, because a
 * billing dispute must not lock somebody out of their own passport scan
 * nine days before an interview.
 */
export async function setTenantSuspension(
  orgId: string,
  suspend: boolean
): Promise<{ ok: true } | { error: string }> {
  const updated = await db
    .update(organisations)
    .set({ suspendedAt: suspend ? new Date() : null })
    .where(eq(organisations.id, orgId))
    .returning({ id: organisations.id });

  if (!updated.length) return { error: "We could not find that agency." };

  return { ok: true };
}

/** What the agency bought, and who to bill for it. */
export async function setTenantBilling(
  orgId: string,
  seatsPurchased: number,
  billingContact: string | null
): Promise<{ ok: true } | { error: string }> {
  // Checked here as well as by the `seats_not_negative` constraint, so
  // an operator reads a sentence rather than a Postgres error.
  if (!Number.isInteger(seatsPurchased) || seatsPurchased < 0) {
    return { error: "Seats must be a whole number, zero or more." };
  }

  const contact = billingContact?.trim() || null;
  if (contact && !EMAIL_RE.test(contact)) {
    return { error: "Enter a valid email address for the billing contact." };
  }

  const updated = await db
    .update(organisations)
    .set({ seatsPurchased, billingContact: contact })
    .where(eq(organisations.id, orgId))
    .returning({ id: organisations.id });

  if (!updated.length) return { error: "We could not find that agency." };

  return { ok: true };
}

/**
 * The second half of provisioning: seat the person who accepted as the
 * agency's owner.
 *
 * Also the way back down — with one refusal. An agency whose last owner
 * is demoted can invite nobody and change no billing, and nothing inside
 * it can undo that; the only remedy is a staff member noticing. So the
 * demotion is refused under a lock that holds for as long as the count
 * it was decided on.
 */
export async function setMemberRole(
  orgId: string,
  userId: string,
  role: "owner" | "reviewer"
): Promise<{ ok: true } | { error: string }> {
  return db.transaction(async (tx) => {
    const [member] = await tx
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .for("update")
      .limit(1);

    if (!member) return { error: "That person is not a member of this agency." };
    if (member.role === role) return { ok: true };

    if (role === "reviewer") {
      const [others] = await tx
        .select({ total: count() })
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, orgId),
            eq(orgMembers.role, "owner"),
            ne(orgMembers.userId, userId)
          )
        );

      if (!others || others.total === 0) {
        return { error: "An agency needs at least one owner." };
      }
    }

    await tx
      .update(orgMembers)
      .set({ role })
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));

    return { ok: true };
  });
}
