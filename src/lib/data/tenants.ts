import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  invitations,
  orgMembers,
  organisations,
  profiles,
} from "@/lib/db/schema";
import type { ApplicationStatus } from "@/lib/domain/status";

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
