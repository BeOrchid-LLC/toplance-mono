import "server-only";

import { cache } from "react";
import { and, count, desc, eq, gt } from "drizzle-orm";

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
import { isUuid } from "@/lib/domain/uuid";

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
  /**
   * Invitations still worth waiting on: `pending` AND not past
   * `expiresAt`. The stored `status` column only flips off `pending`
   * when somebody opens the link (`acceptInvitationTx`), so counting the
   * column alone reports a dead invitation as live forever — beside
   * `awaitingFirstOwner` copy telling the operator to keep waiting,
   * while the agency's own roster (`listInvitations`) already calls the
   * same row `expired`. Two screens, one row, two answers.
   */
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
  /**
   * Derived, never stored — the same thing `listInvitations` derives for
   * the agency's own roster, and for the same reason: the column is
   * flipped lazily, so `status = 'pending'` outlives the link it names.
   * The panel still shows an expired invitation (the operator needs to
   * know one was sent and died, since nothing here can resend it), but
   * it is labelled rather than counted.
   */
  expired: boolean;
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
  const now = new Date();

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

    // Restricted to `kind: "staff"`, the same restriction `getTenant`'s
    // `pendingInvites` now carries — a pending client invitation is a
    // traveller's own outstanding invite, not this agency's, and this
    // count has to agree with the panel or the two contradict each
    // other on the same screen.
    //
    // `expiresAt > now` for the reason on `TenantCounts.pendingInvitations`:
    // `status` is flipped lazily, so without it a thirty-one-day-old
    // invitation nobody ever opened still reads as one the agency is
    // about to accept.
    db
      .select({ orgId: invitations.orgId, total: count() })
      .from(invitations)
      .where(
        and(
          eq(invitations.status, "pending"),
          eq(invitations.kind, "staff"),
          gt(invitations.expiresAt, now)
        )
      )
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

/**
 * One agency with its roster and its live invitations, or null.
 *
 * A `where` clause rather than `listTenants().find(...)`. Scanning every
 * organisation's platform-wide aggregates to keep one row made the cost
 * of a single-agency page grow with the number of tenants on the
 * platform — and the `find` was a JS `===` standing in for a Postgres
 * `uuid` comparison, which is case-insensitive where `===` is not, so
 * correctness depended on every caller lower-casing the id first. This
 * normalises here instead, which no caller can forget, and returns
 * `null` for a malformed id rather than letting Postgres throw a syntax
 * error at whatever called this.
 *
 * Wrapped in React `cache()` because `generateMetadata` and the page
 * component are two independent invocations Next makes for the same
 * request, and both need this agency. Without it they each run the five
 * queries below. React's `cache` is a no-op with no request dispatcher
 * bound, so the test suite still gets a fresh read per call — which is
 * what its suspend/restore assertions depend on.
 */
export const getTenant = cache(async function getTenant(
  orgId: string
): Promise<TenantDetail | null> {
  if (!isUuid(orgId)) return null;
  const id = orgId.toLowerCase();
  const now = new Date();

  const [orgRows, memberCounts, statusCounts, members_, inviteRows] =
    await Promise.all([
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
        .where(eq(organisations.id, id))
        .limit(1),

      db.select({ total: count() }).from(orgMembers).where(eq(orgMembers.orgId, id)),

      // Still `count(*)` grouped by status, still never a row. Scoping
      // it to one agency changes what it costs, not what it may know.
      db
        .select({ status: applications.status, total: count() })
        .from(applications)
        .where(eq(applications.orgId, id))
        .groupBy(applications.status),

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
        .where(eq(orgMembers.orgId, id))
        .orderBy(orgMembers.createdAt),

      // Never selects `token`. The console has no reason to hold an
      // agency's accept credential — the same stance `listInvitations`
      // takes for the agency's own roster.
      //
      // Restricted to `kind: "staff"`. A `client` invitation is a
      // traveller's own name and email address, addressed by this agency
      // — not this agency's business, and the one thing this module's own
      // header says the console must never learn: whose case is whose.
      // The only invitation this panel exists to show is the owner
      // invitation `provisionTenantTx` mints (`kind: "staff"`), so this
      // costs the panel nothing it uses.
      //
      // Expired rows are fetched and then labelled rather than filtered
      // out in SQL: nothing in the product can resend or revoke an
      // invitation, so an operator looking at an agency with no owner
      // needs to see that a link was sent and has died. Only the count
      // beside them treats them as gone.
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
        .where(
          and(
            eq(invitations.orgId, id),
            eq(invitations.status, "pending"),
            eq(invitations.kind, "staff")
          )
        )
        .orderBy(desc(invitations.createdAt)),
    ]);

  const [org] = orgRows;
  if (!org) return null;

  const counts: TenantCounts = { ...ZERO_COUNTS };
  for (const row of statusCounts) {
    counts.applicationsTotal += row.total;
    counts[BUCKET[row.status]] += row.total;
  }
  counts.members = memberCounts[0]?.total ?? 0;

  const pendingInvites = inviteRows.map((i) => ({ ...i, expired: i.expiresAt < now }));
  // The same rule `listTenants` counts by, so the list page and this
  // page cannot report different numbers for the same agency.
  counts.pendingInvitations = pendingInvites.filter((i) => !i.expired).length;

  return { ...org, ...counts, members_, pendingInvites };
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Every way a tenant write can be refused, as a stable code rather than
 * a sentence.
 *
 * This module ships ten distinct English sentences across its four write
 * functions, and this repo puts every user-facing string in an
 * `src/lib/i18n/*.ts` dictionary across all ten locales — a data-access
 * module is not that dictionary. The action layer
 * (`@/app/[locale]/ops/tenants/actions.ts`) maps each of these to an
 * `OPS_ACTIONS` key resolved at the caller's locale, in one
 * `Record<TenantError, …>`, so an eleventh code added here without a
 * matching entry there is a compile error rather than English on a
 * screen that ships in ten languages.
 */
export type TenantError =
  | "agency_name_required"
  | "agency_name_too_long"
  | "owner_email_invalid"
  | "seats_invalid"
  | "billing_email_invalid"
  | "demo_request_not_found"
  | "demo_request_already_converted"
  | "tenant_not_found"
  | "not_a_member"
  | "last_owner";

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
  | { error: TenantError };

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
  if (!name) return { error: "agency_name_required" };
  if (name.length > ORG_NAME_MAX) return { error: "agency_name_too_long" };

  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(ownerEmail)) {
    return { error: "owner_email_invalid" };
  }

  const seats = input.seatsPurchased ?? 0;
  if (!Number.isInteger(seats) || seats < 0) {
    return { error: "seats_invalid" };
  }

  /**
   * The same `EMAIL_RE` `setTenantBilling` applies, at the same moment
   * the value is first stored. Without it the provision form (whose
   * `type="email"` any direct POST bypasses) could write a billing
   * contact that every later `setTenantBilling` then refuses with
   * `billing_email_invalid` — locking the operator out of the billing
   * panel over a field they never typed and cannot see is wrong.
   */
  const billingContact = input.billingContact?.trim() || null;
  if (billingContact && !EMAIL_RE.test(billingContact)) {
    return { error: "billing_email_invalid" };
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
        return { error: "demo_request_not_found" };
      }

      // The lock stops two provisions of this enquiry from interleaving,
      // but it does not stop a second one from happening — a
      // double-submit or a retry would otherwise find the row still
      // sitting there and quietly re-point it at a second agency. This
      // is the check that actually refuses that: the operator is looking
      // at a row that already became something, so it is not this call's
      // to convert again.
      if (existing.status === "converted") {
        return { error: "demo_request_already_converted" };
      }
    }

    const [org] = await tx
      .insert(organisations)
      .values({
        name,
        domain: input.domain?.trim() || null,
        seatsPurchased: seats,
        billingContact,
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
): Promise<{ ok: true } | { error: TenantError }> {
  const updated = await db
    .update(organisations)
    .set({ suspendedAt: suspend ? new Date() : null })
    .where(eq(organisations.id, orgId))
    .returning({ id: organisations.id });

  if (!updated.length) return { error: "tenant_not_found" };

  return { ok: true };
}

/** What the agency bought, and who to bill for it. */
export async function setTenantBilling(
  orgId: string,
  seatsPurchased: number,
  billingContact: string | null
): Promise<{ ok: true } | { error: TenantError }> {
  // Checked here as well as by the `seats_not_negative` constraint, so
  // this returns `seats_invalid` rather than a Postgres error the caller
  // has no sentence for.
  if (!Number.isInteger(seatsPurchased) || seatsPurchased < 0) {
    return { error: "seats_invalid" };
  }

  const contact = billingContact?.trim() || null;
  if (contact && !EMAIL_RE.test(contact)) {
    return { error: "billing_email_invalid" };
  }

  const updated = await db
    .update(organisations)
    .set({ seatsPurchased, billingContact: contact })
    .where(eq(organisations.id, orgId))
    .returning({ id: organisations.id });

  if (!updated.length) return { error: "tenant_not_found" };

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
 *
 * That lock has to cover every row the decision reads, not only the row
 * being changed. A demotion's "is there another owner left" is a
 * question about the *whole* owner set — locking just the member being
 * demoted and then counting the others with an ordinary `SELECT` leaves
 * those other rows unlocked, so two transactions demoting two
 * *different* owners of the same agency can each lock only their own
 * target, each read the other's target as the surviving owner, and both
 * commit: zero owners, exactly what this guard exists to prevent.
 *
 * The fix locks every membership row of the org being written to,
 * `WHERE org_id = orgId` with nothing narrower, in the one query that
 * decides everything below — whether the target is a member, whether
 * the change is a no-op, and (for a demotion) the owner count. Every
 * call that might demote someone in this org takes that same lock over
 * that same row set, so two such calls always attempt it in the same
 * order and the second one queues behind the first rather than each
 * proceeding on a count the other has already invalidated. A promotion
 * never reduces the owner count, so it locks only the one row it
 * writes — and because it only ever holds that single lock, it cannot
 * be one half of a deadlock with a demotion's org-wide lock either: the
 * two can only block each other, never form a cycle.
 */
export async function setMemberRole(
  orgId: string,
  userId: string,
  role: "owner" | "reviewer"
): Promise<{ ok: true } | { error: TenantError }> {
  return db.transaction(async (tx) => {
    const rows =
      role === "reviewer"
        ? await tx
            .select({ userId: orgMembers.userId, role: orgMembers.role })
            .from(orgMembers)
            .where(eq(orgMembers.orgId, orgId))
            .for("update")
        : await tx
            .select({ userId: orgMembers.userId, role: orgMembers.role })
            .from(orgMembers)
            .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
            .for("update");

    const member = rows.find((r) => r.userId === userId);
    if (!member) return { error: "not_a_member" };
    if (member.role === role) return { ok: true };

    if (role === "reviewer") {
      const owners = rows.filter((r) => r.role === "owner");
      if (owners.length <= 1) return { error: "last_owner" };
    }

    await tx
      .update(orgMembers)
      .set({ role })
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));

    return { ok: true };
  });
}
