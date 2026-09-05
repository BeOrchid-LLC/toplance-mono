import "server-only";

import { and, count, desc, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  corridorRequirements,
  corridors,
  documents,
  profiles,
} from "@/lib/db/schema";
import type { TravelPurpose } from "@/lib/visa/types";

/**
 * Reading and deciding corridor versions, for the ops console.
 *
 * The draft/approve lifecycle needed no new machinery: `curatedProvider`
 * already serves `is_live = true` at the highest `version`, so a draft
 * is nothing more than a *new version left dark*. Nothing here gates the
 * resolver, and nothing here is a feature flag — approval is one
 * `is_live` flip, and the version ordering supersedes the old row on its
 * own.
 *
 * Like every other module under `src/lib/data`, this decides no access.
 * Its callers guard first — and for the two writes below the guard is
 * `owner`, not merely staff.
 */

export type CorridorRow = {
  id: string;
  nationalityIso: string;
  destinationIso: string;
  purpose: TravelPurpose;
  visaName: string;
  version: number;
  isLive: boolean;
  reviewState: "pending" | "approved" | "rejected";
  lastVerifiedAt: Date | null;
  approvedAt: Date | null;
  approverName: string | null;
  requirementCount: number;
};

export type CorridorDetail = CorridorRow & {
  effectiveFrom: string;
  sourceName: string | null;
  sourceUrl: string | null;
  rejectReason: string | null;
  processingWeeksMin: number | null;
  processingWeeksMax: number | null;
  governmentFeeMinor: number | null;
  governmentFeeCurrency: string | null;
  requirements: {
    id: string;
    docKey: string;
    name: string;
    description: string | null;
    category: string;
    isRequired: boolean;
    sortOrder: number;
    sourceUrl: string | null;
    /** Raw `jsonb`; the screen parses it with `parseAppliesWhen`. */
    appliesWhen: unknown;
  }[];
};

export type CorridorWriteResult = { ok: true } | { error: string };

/**
 * Write (or clear) the rule that decides which travellers a conditional
 * document applies to.
 *
 * Refused on a version that is already serving travellers. A rule
 * decides who is *asked* for a document, so a wrong one hides a
 * requirement from the people who need it — the same class of change as
 * editing the requirement list, and the reason the approval gate exists.
 * Drafts are where corridors are edited; `raisePendingCopy` in
 * `drift.ts` is how a live one gets a draft to edit.
 *
 * `appliesWhen` is validated by the caller with `parseAppliesWhen`; this
 * function writes what it is given and never invents a rule.
 */
export async function setRequirementCondition(
  requirementId: string,
  appliesWhen: unknown
): Promise<CorridorWriteResult & { corridorId?: string }> {
  const [row] = await db
    .select({
      corridorId: corridorRequirements.corridorId,
      isRequired: corridorRequirements.isRequired,
      isLive: corridors.isLive,
      reviewState: corridors.reviewState,
    })
    .from(corridorRequirements)
    .innerJoin(corridors, eq(corridors.id, corridorRequirements.corridorId))
    .where(eq(corridorRequirements.id, requirementId))
    .limit(1);

  if (!row) return { error: "That requirement no longer exists." };

  if (row.isLive || row.reviewState === "approved") {
    return {
      error:
        "This version is already serving travelers. Rules are written on a draft and take effect when it is approved.",
    };
  }

  if (row.isRequired) {
    // A required document applies to everybody by definition, and a rule
    // on one would read as a promise the checklist does not keep.
    return { error: "A required document applies to everyone — it takes no rule." };
  }

  await db
    .update(corridorRequirements)
    .set({ appliesWhen })
    .where(eq(corridorRequirements.id, requirementId));

  return { ok: true, corridorId: row.corridorId };
}

/**
 * Every corridor version, newest decision first.
 *
 * Pending drafts sort to the top because they are the only rows anyone
 * has to *act* on; everything below them is a record. The count of
 * requirements comes along because "approved, 0 requirements" is a
 * broken draft and should be visible without opening it.
 */
export async function listCorridors(): Promise<CorridorRow[]> {
  const rows = await db
    .select({
      id: corridors.id,
      nationalityIso: corridors.nationalityIso,
      destinationIso: corridors.destinationIso,
      purpose: corridors.purpose,
      visaName: corridors.visaName,
      version: corridors.version,
      isLive: corridors.isLive,
      reviewState: corridors.reviewState,
      lastVerifiedAt: corridors.lastVerifiedAt,
      approvedAt: corridors.approvedAt,
      approverName: profiles.fullName,
    })
    .from(corridors)
    .leftJoin(profiles, eq(profiles.id, corridors.approvedBy))
    .orderBy(
      corridors.nationalityIso,
      corridors.destinationIso,
      corridors.purpose,
      desc(corridors.version)
    );

  const counts = await db
    .select({
      corridorId: corridorRequirements.corridorId,
      total: count(),
    })
    .from(corridorRequirements)
    .groupBy(corridorRequirements.corridorId);

  const perCorridor = new Map(counts.map((c) => [c.corridorId, c.total]));

  // Pending first — the only rows that are work rather than history.
  // A stable sort, so the corridor ordering the query established still
  // holds within each group.
  return rows
    .map((r) => ({ ...r, requirementCount: perCorridor.get(r.id) ?? 0 }))
    .sort(
      (a, b) =>
        Number(b.reviewState === "pending") - Number(a.reviewState === "pending")
    );
}

/** One version with its requirements, for the review screen. */
export async function getCorridor(id: string): Promise<CorridorDetail | null> {
  const [row] = await db
    .select({
      id: corridors.id,
      nationalityIso: corridors.nationalityIso,
      destinationIso: corridors.destinationIso,
      purpose: corridors.purpose,
      visaName: corridors.visaName,
      version: corridors.version,
      isLive: corridors.isLive,
      reviewState: corridors.reviewState,
      lastVerifiedAt: corridors.lastVerifiedAt,
      approvedAt: corridors.approvedAt,
      approverName: profiles.fullName,
      effectiveFrom: corridors.effectiveFrom,
      sourceName: corridors.sourceName,
      sourceUrl: corridors.sourceUrl,
      rejectReason: corridors.rejectReason,
      processingWeeksMin: corridors.processingWeeksMin,
      processingWeeksMax: corridors.processingWeeksMax,
      governmentFeeMinor: corridors.governmentFeeMinor,
      governmentFeeCurrency: corridors.governmentFeeCurrency,
    })
    .from(corridors)
    .leftJoin(profiles, eq(profiles.id, corridors.approvedBy))
    .where(eq(corridors.id, id))
    .limit(1);

  if (!row) return null;

  const requirements = await db
    .select({
      id: corridorRequirements.id,
      docKey: corridorRequirements.docKey,
      name: corridorRequirements.name,
      description: corridorRequirements.description,
      category: corridorRequirements.category,
      isRequired: corridorRequirements.isRequired,
      sortOrder: corridorRequirements.sortOrder,
      sourceUrl: corridorRequirements.sourceUrl,
      appliesWhen: corridorRequirements.appliesWhen,
    })
    .from(corridorRequirements)
    .where(eq(corridorRequirements.corridorId, id))
    .orderBy(corridorRequirements.sortOrder);

  return { ...row, requirementCount: requirements.length, requirements };
}

/**
 * The version currently serving this corridor, if any — what a draft is
 * about to replace, and what the review screen diffs against.
 */
export async function liveVersionOf(
  draft: Pick<
    CorridorDetail,
    "id" | "nationalityIso" | "destinationIso" | "purpose"
  >
): Promise<CorridorDetail | null> {
  const [row] = await db
    .select({ id: corridors.id })
    .from(corridors)
    .where(
      and(
        eq(corridors.nationalityIso, draft.nationalityIso),
        eq(corridors.destinationIso, draft.destinationIso),
        eq(corridors.purpose, draft.purpose),
        eq(corridors.isLive, true),
        ne(corridors.id, draft.id)
      )
    )
    .orderBy(desc(corridors.version))
    .limit(1);

  return row ? getCorridor(row.id) : null;
}

/**
 * Approve a drafted version: stamp who said so and when, record that a
 * human has now verified it, and turn it live.
 *
 * The supersession is the interesting half and it is why this is a
 * transaction. `curatedProvider` takes the highest live version, so the
 * instant this row goes live it wins — but the row it replaces must go
 * dark in the same commit, or a reader between the two writes sees two
 * live versions and the tie is broken by whichever `order by` runs. One
 * transaction, both writes, no window.
 *
 * Refuses a draft with no requirements. An empty checklist reaching a
 * traveller is the exact failure `canLead` exists to prevent elsewhere —
 * `adoptRuleSet` would materialise zero rows, so no upload slots, no
 * completion, and no path to submission.
 */
export async function approveCorridorTx(
  corridorId: string,
  approverId: string
): Promise<CorridorWriteResult> {
  return db.transaction(async (tx) => {
    const [draft] = await tx
      .select()
      .from(corridors)
      .where(eq(corridors.id, corridorId))
      .for("update")
      .limit(1);

    if (!draft) return { error: "That route no longer exists." };
    if (draft.reviewState === "approved" && draft.isLive) {
      return { error: "That version is already live." };
    }

    const requirements = await tx
      .select({ docKey: corridorRequirements.docKey })
      .from(corridorRequirements)
      .where(eq(corridorRequirements.corridorId, corridorId));

    if (requirements.length === 0) {
      return {
        error:
          "This draft has no requirements. Approving it would give a " +
          "traveler an empty checklist with nothing to upload.",
      };
    }

    // The version this one replaces. Same corridor triple, live, not
    // this row — taken down in the same commit that raises the new one.
    await tx
      .update(corridors)
      .set({ isLive: false })
      .where(
        and(
          eq(corridors.nationalityIso, draft.nationalityIso),
          eq(corridors.destinationIso, draft.destinationIso),
          eq(corridors.purpose, draft.purpose),
          eq(corridors.isLive, true),
          ne(corridors.id, corridorId)
        )
      );

    await tx
      .update(corridors)
      .set({
        isLive: true,
        reviewState: "approved",
        approvedBy: approverId,
        approvedAt: new Date(),
        // Approval *is* the verification: an owner has just read this
        // against its sources. Nothing else in the system sets this, so
        // a corridor that never went through here reads as unchecked —
        // which is the truth about the four seeded ones.
        lastVerifiedAt: new Date(),
        rejectReason: null,
      })
      .where(eq(corridors.id, corridorId));

    return { ok: true };
  });
}

/**
 * Send a draft back with a reason, leaving it dark.
 *
 * Never touches `is_live`: rejecting a draft must not disturb the
 * version currently serving travellers, and a rejected draft was never
 * live to begin with.
 */
export async function rejectCorridorTx(
  corridorId: string,
  reason: string
): Promise<CorridorWriteResult> {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { error: "Say why — whoever redrafts this reads the reason." };
  }

  const [row] = await db
    .select({ isLive: corridors.isLive })
    .from(corridors)
    .where(eq(corridors.id, corridorId))
    .limit(1);

  if (!row) return { error: "That route no longer exists." };
  if (row.isLive) {
    return {
      error:
        "That version is live. Approve a replacement to supersede it — " +
        "rejecting it here would leave the route serving it anyway.",
    };
  }

  await db
    .update(corridors)
    .set({ reviewState: "rejected", rejectReason: trimmed })
    .where(eq(corridors.id, corridorId));

  return { ok: true };
}

export type ChecklistChange = {
  applicationId: string;
  travelerId: string;
  /** The revised rule set's own name, so the email can say which trip. */
  visaName: string;
  added: string[];
  removed: string[];
};

/**
 * Milestone 10 — who needs telling that their checklist moved, and what
 * to tell them.
 *
 * Called after an approval, with the version that just went live. It
 * finds the travellers mid-application on that corridor triple and works
 * out, per person, which documents appeared and which are no longer
 * asked for.
 *
 * Three deliberate restraints:
 *
 * - **Only real changes.** A revision that rewords a description changes
 *   no `docKey`, so nobody is emailed. The notification is about work
 *   the traveller now has to do, not about us having edited a row.
 * - **Only people still collecting.** Someone whose file is submitted,
 *   approved or rejected is past the point where a checklist matters,
 *   and telling them their paperwork changed would read as their
 *   decision being reopened.
 * - **Removals are reported, not performed.** `adoptRuleSet` deletes a
 *   dropped row only when it is untouched, so a traveller who already
 *   uploaded something keeps it. What they are told is that it is no
 *   longer required — which is why the email says both.
 */
export async function checklistChangesFrom(
  corridorId: string
): Promise<ChecklistChange[]> {
  const [corridor] = await db
    .select()
    .from(corridors)
    .where(eq(corridors.id, corridorId))
    .limit(1);

  if (!corridor) return [];

  const wanted = await db
    .select({ docKey: corridorRequirements.docKey, name: corridorRequirements.name })
    .from(corridorRequirements)
    .where(eq(corridorRequirements.corridorId, corridorId));

  const wantedKeys = new Map(wanted.map((r) => [r.docKey, r.name]));

  // Travellers on this corridor triple who are still gathering. The join
  // is on the corridor *columns*, not on `applications.corridor_id`:
  // that column still points at the version they adopted, which is the
  // one being superseded.
  const affected = await db
    .select({
      applicationId: applications.id,
      travelerId: applications.travelerId,
    })
    .from(applications)
    .innerJoin(corridors, eq(corridors.id, applications.corridorId))
    .where(
      and(
        eq(corridors.nationalityIso, corridor.nationalityIso),
        eq(corridors.destinationIso, corridor.destinationIso),
        eq(corridors.purpose, corridor.purpose),
        inArray(applications.status, [
          "draft",
          "collecting_documents",
          "additional_documents",
        ])
      )
    );

  const changes: ChecklistChange[] = [];

  for (const app of affected) {
    const held = await db
      .select({ docKey: documents.docKey, name: documents.name })
      .from(documents)
      .where(eq(documents.applicationId, app.applicationId));

    const heldKeys = new Set(held.map((d) => d.docKey));

    const added = wanted
      .filter((r) => !heldKeys.has(r.docKey))
      .map((r) => r.name);
    const removed = held
      .filter((d) => !wantedKeys.has(d.docKey))
      .map((d) => d.name);

    if (added.length || removed.length) {
      changes.push({ ...app, visaName: corridor.visaName, added, removed });
    }
  }

  return changes;
}
