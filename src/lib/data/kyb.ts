import "server-only";

import { cache } from "react";
import { and, asc, count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  kybRequirements,
  orgMembers,
  organisations,
  profiles,
  type KybState,
} from "@/lib/db/schema";
import {
  KYB_REQUIREMENTS,
  kybProgress,
  kybStanding,
  type KybProgress,
  type KybStanding,
} from "@/lib/domain/kyb";
import { deleteDocument, putDocument, signedDocumentUrl } from "@/lib/storage/documents";

/**
 * The KYB file BeOrchid keeps on each agency.
 *
 * Holds to the same contract `@/lib/data/tenants` states in its own
 * preamble, for the same reason: **this module selects from
 * `organisations`, `kyb_requirements`, `org_members` and `profiles`,
 * and from no case, no document and no application.** KYB is a question
 * about a business. Nothing about a traveller answers it, so nothing
 * about a traveller is read here.
 *
 * The transaction that matters is `activateAgency`. Everything else is
 * a row update an admin can undo by taking the other verdict.
 */

/** Where an agency's documents live: one folder, one object per key. */
export function kybStoragePath(orgId: string, docKey: string): string {
  // Deterministic rather than uuid-suffixed. Replacing a document then
  // overwrites one object instead of orphaning the old one in a private
  // bucket nobody lists — and "the previous file is gone" is exactly
  // what the replace dialog warns about, so the storage should mean it.
  return `kyb/${orgId}/${docKey}`;
}

/**
 * Write the checklist onto an agency, once.
 *
 * Called inside both transactions that can create an `organisations`
 * row — `provisionTenantTx` and `createOrganisationTx` — because a
 * checklist that only one of the two creation paths leaves behind is a
 * checklist half the agencies escape.
 *
 * `onConflictDoNothing` on `(org_id, doc_key)` makes it idempotent, so
 * a backfill and a fresh provision can both run over the same agency
 * without either clobbering a verdict somebody already took.
 *
 * Takes a transaction rather than reaching for `db`: seeding must
 * commit with the agency it belongs to, or an agency exists with no way
 * to ever be verified.
 */
export async function seedKybRequirements(
  tx: Pick<typeof db, "insert">,
  orgId: string
): Promise<void> {
  await tx
    .insert(kybRequirements)
    .values(
      KYB_REQUIREMENTS.map((requirement) => ({
        orgId,
        docKey: requirement.docKey,
        name: requirement.name,
        description: requirement.description,
        sortOrder: requirement.sortOrder,
      }))
    )
    .onConflictDoNothing({
      target: [kybRequirements.orgId, kybRequirements.docKey],
    });
}

/** One agency's line in the queue. */
export type KybQueueRow = {
  orgId: string;
  name: string;
  verified: number;
  touched: number;
  total: number;
  standing: KybStanding;
  activatedAt: Date | null;
  /** Shown as a marker in the queue: a suspended agency is owed nothing. */
  suspendedAt: Date | null;
  createdAt: Date;
};

/**
 * Every agency: the ones waiting on BeOrchid first, oldest first
 * within that.
 *
 * `created_at` ascending alone was wrong, and wrong in the direction
 * that makes the screen useless. Migration `0035` backfilled
 * `activated_at` onto every agency that already existed, so the oldest
 * rows are precisely the settled ones — they sorted to the top and
 * pushed the agencies actually awaiting a decision to the bottom of a
 * list that only grows. The queue read as the opposite of a queue.
 *
 * So the first key is whether anything is owed. Within the waiting
 * group `created_at` ascending still means what it always meant: the
 * agency that has been waiting on us longest is the one to open next.
 *
 * Suspended agencies sort with the settled ones even when they have
 * never been activated. They are not owed a decision — somebody already
 * took one — and leaving them at the head of the queue is how a list
 * meant to be driven to zero never reaches it.
 *
 * Unpaginated on purpose while this is one screen over a pre-launch
 * table. `DataTable` takes a `pagination` prop the day that stops being
 * true; the ordering above is what makes the un-paged list usable in
 * the meantime, because the rows that matter are the first ones.
 *
 * One grouped select, not a query per agency. The counts come back from
 * Postgres as strings through `count()`, which `Number` settles here so
 * no caller has to remember.
 */
export const kybQueue = cache(async (): Promise<KybQueueRow[]> => {
  const rows = await db
    .select({
      orgId: organisations.id,
      name: organisations.name,
      activatedAt: organisations.activatedAt,
      suspendedAt: organisations.suspendedAt,
      createdAt: organisations.createdAt,
      total: count(kybRequirements.id),
      verified: sql<number>`count(*) filter (where ${kybRequirements.state} = 'verified')`,
      touched: sql<number>`count(*) filter (where ${kybRequirements.state} <> 'not_started')`,
    })
    .from(organisations)
    .leftJoin(kybRequirements, eq(kybRequirements.orgId, organisations.id))
    .groupBy(
      organisations.id,
      organisations.name,
      organisations.activatedAt,
      organisations.suspendedAt,
      organisations.createdAt
    )
    .orderBy(
      sql`(${organisations.activatedAt} is not null or ${organisations.suspendedAt} is not null)`,
      asc(organisations.createdAt)
    );

  return rows.map((row) => {
    const counts = {
      verified: Number(row.verified),
      touched: Number(row.touched),
      total: Number(row.total),
    };

    return {
      orgId: row.orgId,
      name: row.name,
      activatedAt: row.activatedAt,
      suspendedAt: row.suspendedAt,
      createdAt: row.createdAt,
      ...counts,
      standing: kybStanding({ activatedAt: row.activatedAt, ...counts }),
    };
  });
});

/** One requirement, as the checklist renders it. */
export type KybRequirementRow = {
  id: string;
  docKey: string;
  name: string;
  description: string | null;
  state: KybState;
  note: string | null;
  hasDocument: boolean;
  checkedAt: Date | null;
  reviewedByName: string | null;
};

export type AgencyKyb = {
  orgId: string;
  name: string;
  activatedAt: Date | null;
  suspendedAt: Date | null;
  requirements: KybRequirementRow[];
  progress: KybProgress;
  standing: KybStanding;
};

/**
 * One agency's whole file, or `null` if there is no such agency.
 *
 * `hasDocument` rather than the storage key itself: a key is only
 * useful signed, and signing six of them on every render spends six
 * round trips on links the admin will click at most one of. The signed
 * URL is fetched per click by `signedRequirementUrl`.
 */
export const getAgencyKyb = cache(async (orgId: string): Promise<AgencyKyb | null> => {
  const [org] = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      activatedAt: organisations.activatedAt,
      suspendedAt: organisations.suspendedAt,
    })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  if (!org) return null;

  const rows = await db
    .select({
      id: kybRequirements.id,
      docKey: kybRequirements.docKey,
      name: kybRequirements.name,
      description: kybRequirements.description,
      state: kybRequirements.state,
      note: kybRequirements.note,
      storagePath: kybRequirements.storagePath,
      checkedAt: kybRequirements.checkedAt,
      reviewedByName: profiles.fullName,
    })
    .from(kybRequirements)
    .leftJoin(profiles, eq(profiles.id, kybRequirements.reviewedBy))
    .where(eq(kybRequirements.orgId, orgId))
    .orderBy(asc(kybRequirements.sortOrder));

  const requirements = rows.map(({ storagePath, ...row }) => ({
    ...row,
    hasDocument: !!storagePath,
  }));

  const progress = kybProgress(requirements);

  return {
    orgId: org.id,
    name: org.name,
    activatedAt: org.activatedAt,
    suspendedAt: org.suspendedAt,
    requirements,
    progress,
    standing: kybStanding({
      activatedAt: org.activatedAt,
      verified: progress.verified,
      touched: requirements.filter((r) => r.state !== "not_started").length,
      total: progress.total,
    }),
  };
});

/** A ten-minute link to one filed document, or `null` if none is filed. */
export async function signedRequirementUrl(
  orgId: string,
  docKey: string
): Promise<string | null> {
  const [row] = await db
    .select({ storagePath: kybRequirements.storagePath })
    .from(kybRequirements)
    .where(
      and(eq(kybRequirements.orgId, orgId), eq(kybRequirements.docKey, docKey))
    )
    .limit(1);

  if (!row?.storagePath) return null;
  return signedDocumentUrl(row.storagePath);
}

/**
 * File a document against one requirement.
 *
 * The object is written before the row, so a failed put leaves the row
 * untouched: an admin sees the error rather than a checklist claiming a
 * file that is not in the bucket.
 *
 * Filing moves `not_started` → `in_review` and leaves every other state
 * where it is. Uploading a document does not verify it — only a person
 * does — and re-filing against a `rejected` row should not quietly
 * un-reject it either; the admin takes that verdict again themselves.
 */
export async function attachRequirementDocument(input: {
  orgId: string;
  docKey: string;
  file: File;
}): Promise<{ ok: true } | { error: "requirement_not_found" }> {
  const [row] = await db
    .select({ id: kybRequirements.id, state: kybRequirements.state })
    .from(kybRequirements)
    .where(
      and(
        eq(kybRequirements.orgId, input.orgId),
        eq(kybRequirements.docKey, input.docKey)
      )
    )
    .limit(1);

  if (!row) return { error: "requirement_not_found" };

  const path = kybStoragePath(input.orgId, input.docKey);
  await putDocument(path, input.file);

  await db
    .update(kybRequirements)
    .set({
      storagePath: path,
      state: row.state === "not_started" ? "in_review" : row.state,
      updatedAt: new Date(),
    })
    .where(eq(kybRequirements.id, row.id));

  return { ok: true };
}

/**
 * Take the file back off a requirement.
 *
 * Destructive, and gated by a dialog at the call site under the rule in
 * `AGENTS.md`: the object is deleted from the bucket and this product
 * keeps no other copy. The state drops back to `not_started`, because a
 * requirement with no document is not one anybody is reviewing.
 */
export async function removeRequirementDocument(input: {
  orgId: string;
  docKey: string;
}): Promise<{ ok: true } | { error: "requirement_not_found" }> {
  const [row] = await db
    .select({ id: kybRequirements.id, storagePath: kybRequirements.storagePath })
    .from(kybRequirements)
    .where(
      and(
        eq(kybRequirements.orgId, input.orgId),
        eq(kybRequirements.docKey, input.docKey)
      )
    )
    .limit(1);

  if (!row) return { error: "requirement_not_found" };

  if (row.storagePath) await deleteDocument(row.storagePath);

  await db
    .update(kybRequirements)
    .set({
      storagePath: null,
      state: "not_started",
      checkedAt: null,
      reviewedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(kybRequirements.id, row.id));

  return { ok: true };
}

/**
 * An admin's verdict on one requirement.
 *
 * `verified` requires a document on file, and that is the whole point
 * of the surface rather than a nicety: without it six empty rows could
 * be marked verified and `activateAgency` would open a console for a
 * business nobody had seen a single paper from — for a table whose
 * entire purpose is "document the businesses we have vetted".
 *
 * `rejected` deliberately does not require one. "They sent nothing and
 * stopped answering" is a real verdict, and a rejection an admin cannot
 * record is a rejection that lives in somebody's inbox instead.
 */
export async function setRequirementState(input: {
  orgId: string;
  docKey: string;
  state: KybState;
  note: string | null;
  reviewedBy: string;
}): Promise<
  { ok: true } | { error: "requirement_not_found" | "verify_needs_document" }
> {
  const settled = input.state === "verified" || input.state === "rejected";

  if (input.state === "verified") {
    const [row] = await db
      .select({ storagePath: kybRequirements.storagePath })
      .from(kybRequirements)
      .where(
        and(
          eq(kybRequirements.orgId, input.orgId),
          eq(kybRequirements.docKey, input.docKey)
        )
      )
      .limit(1);

    if (!row) return { error: "requirement_not_found" };
    if (!row.storagePath) return { error: "verify_needs_document" };
  }

  const updated = await db
    .update(kybRequirements)
    .set({
      state: input.state,
      note: input.note,
      // Stamped only by a verdict. Moving a row back to `in_review`
      // un-decides it, and a `checked_at` left standing under that would
      // read as "someone judged this" beside a state saying nobody has.
      checkedAt: settled ? new Date() : null,
      reviewedBy: settled ? input.reviewedBy : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(kybRequirements.orgId, input.orgId),
        eq(kybRequirements.docKey, input.docKey)
      )
    )
    .returning({ id: kybRequirements.id });

  if (updated.length === 0) return { error: "requirement_not_found" };
  return { ok: true };
}

/** Who to tell that the console is open, and at which address. */
export type ActivationRecipient = { email: string; fullName: string | null };

export type ActivateResult =
  | { ok: true; alreadyActivated: true }
  | { ok: true; alreadyActivated: false; recipient: ActivationRecipient; name: string }
  | { error: "agency_not_found" | "kyb_incomplete" | "no_recipient" };

/**
 * Open the console on an agency, and say who to write to.
 *
 * The whole check runs inside the transaction, on a locked
 * `organisations` row. The disabled button on the checklist is a
 * courtesy; this is the guard — the action behind it is a POST any
 * staff session can make without a page ever having been rendered.
 *
 * Sends nothing itself. The caller owns the letter, so that a dead mail
 * provider is reported to the operator rather than swallowed here, and
 * so this stays a database function with no network in it.
 *
 * Two refusals worth their own names:
 *
 * - `kyb_incomplete` — a requirement was un-verified between the render
 *   and the click, by this admin in another tab or by a colleague.
 * - `no_recipient` — nobody to tell. `provisionTenant` is deliberately
 *   two-step: the invitee joins as a `reviewer` and somebody promotes
 *   them afterwards, so an agency can be fully verified with no owner
 *   seated. Activating anyway would open a console behind a paywall
 *   nobody was invited through, so it refuses and names the fix. The
 *   `billing_contact` is tried first as the fallback because that is an
 *   address BeOrchid typed in itself.
 */
export async function activateAgency(orgId: string): Promise<ActivateResult> {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .select({
        id: organisations.id,
        name: organisations.name,
        activatedAt: organisations.activatedAt,
        billingContact: organisations.billingContact,
      })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .for("update")
      .limit(1);

    if (!org) return { error: "agency_not_found" as const };

    // Already open. Returns ok rather than an error — two admins racing
    // the same button both meant the same thing and got it — but says
    // so, so the caller sends one letter and not two.
    if (org.activatedAt) return { ok: true as const, alreadyActivated: true as const };

    const rows = await tx
      .select({ state: kybRequirements.state })
      .from(kybRequirements)
      .where(eq(kybRequirements.orgId, orgId));

    if (!kybProgress(rows).canActivate) {
      return { error: "kyb_incomplete" as const };
    }

    const [owner] = await tx
      .select({ email: profiles.email, fullName: profiles.fullName })
      .from(orgMembers)
      .innerJoin(profiles, eq(profiles.id, orgMembers.userId))
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "owner")))
      // Ordered, because `limit(1)` without one is "whichever row
      // Postgres felt like". An agency with two directors would get the
      // letter at a different address on a retry than on the first
      // attempt, and the audit row would name someone who never
      // received it.
      .orderBy(asc(profiles.email))
      .limit(1);

    const recipient: ActivationRecipient | null = owner
      ? { email: owner.email, fullName: owner.fullName }
      : org.billingContact
        ? { email: org.billingContact, fullName: null }
        : null;

    if (!recipient) return { error: "no_recipient" as const };

    await tx
      .update(organisations)
      .set({ activatedAt: new Date() })
      .where(eq(organisations.id, orgId));

    return {
      ok: true as const,
      alreadyActivated: false as const,
      recipient,
      name: org.name,
    };
  });
}

/**
 * Whether BeOrchid has opened this agency's console.
 *
 * Read by `purchaseSubscription`, which is a POST endpoint reachable
 * without the page whose button posts to it — so the holding screen is
 * not its guard, this is.
 */
export async function isAgencyActivated(orgId: string): Promise<boolean> {
  const [row] = await db
    .select({ activatedAt: organisations.activatedAt })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  return !!row?.activatedAt;
}
