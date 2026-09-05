import "server-only";

import { createHash } from "node:crypto";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { corridorRequirements, corridors } from "@/lib/db/schema";

/**
 * Milestone 09 — noticing when a mission changes its mind.
 *
 * A corridor is a promise about what a mission currently asks for, and
 * that promise decays silently: nothing in the product knows the page it
 * was read from has been rewritten. `last_verified_at` makes the decay
 * *visible* to a traveller; this makes it *actionable* for an owner.
 *
 * Two rules, and the second is the one that matters:
 *
 * 1. **Hash first.** Most weeks nothing moved, and a content digest is
 *    an HTTP call rather than a model call. Only a changed page is worth
 *    a person's attention.
 * 2. **Drift never writes to a live corridor.** It raises a *pending
 *    version* — the same dark row `scripts/draft-corridor.mts` writes —
 *    so an owner re-reads the source and approves. A job that silently
 *    corrected live data would be the invented checklist the whole
 *    engine is built to refuse, only worse, because nobody asked for it.
 */

export type DriftResult = {
  checked: number;
  /** Corridors whose source page moved, now raised as pending versions. */
  drifted: { corridorId: string; draftId: string; sourceUrl: string }[];
  /** First sighting: a hash was recorded, which is not drift. */
  baselined: number;
  failed: { corridorId: string; reason: string }[];
};

/**
 * The digest a page is compared against.
 *
 * Tags are stripped before hashing, so a template change, a rotating CSS
 * bundle hash or an analytics snippet does not read as the mission
 * changing its paperwork. The same crude strip `draft-corridor.mts` uses
 * to feed the model, and deliberately so: the two must agree on what
 * "the page" means or every draft would look drifted the moment it
 * landed.
 */
export function contentHash(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return createHash("sha256").update(text).digest("hex");
}

async function fetchHash(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "Toplance corridor re-check (ops tooling)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return contentHash(await response.text());
}

/**
 * Copy a live corridor into a new dark version at `version + 1`.
 *
 * A clone rather than a re-extraction. The execution plan imagined the
 * job re-running the model over the changed page, but a corridor row
 * stores a *single* `source_url` while a draft was built from several —
 * so re-extracting from the one we kept would quietly narrow the
 * corridor to whatever that page happens to cover. Cloning puts the
 * current content in front of an owner alongside the source that moved,
 * which is what PRD §5.4 actually asks for: drift produces a review
 * item, not a silent update.
 */
async function raisePendingCopy(
  corridorId: string,
  newHash: string
): Promise<string> {
  return db.transaction(async (tx) => {
    const [live] = await tx
      .select()
      .from(corridors)
      .where(eq(corridors.id, corridorId))
      .limit(1);

    if (!live) throw new Error("route disappeared mid-check");

    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${corridors.version}), 0)` })
      .from(corridors)
      .where(
        and(
          eq(corridors.nationalityIso, live.nationalityIso),
          eq(corridors.destinationIso, live.destinationIso),
          eq(corridors.purpose, live.purpose)
        )
      );

    const [draft] = await tx
      .insert(corridors)
      .values({
        nationalityIso: live.nationalityIso,
        destinationIso: live.destinationIso,
        purpose: live.purpose,
        visaName: live.visaName,
        version: Number(max) + 1,
        effectiveFrom: live.effectiveFrom,
        sourceName: live.sourceName,
        sourceUrl: live.sourceUrl,
        processingWeeksMin: live.processingWeeksMin,
        processingWeeksMax: live.processingWeeksMax,
        governmentFeeMinor: live.governmentFeeMinor,
        governmentFeeCurrency: live.governmentFeeCurrency,
        isLive: false,
        reviewState: "pending",
        sourceHash: newHash,
        // Deliberately not carried over: the clone has been approved by
        // nobody, and verified by nobody. Copying the live row's
        // approver would forge a signature.
      })
      .returning({ id: corridors.id });

    const existing = await tx
      .select()
      .from(corridorRequirements)
      .where(eq(corridorRequirements.corridorId, corridorId));

    if (existing.length) {
      await tx.insert(corridorRequirements).values(
        existing.map((r) => ({
          corridorId: draft.id,
          docKey: r.docKey,
          name: r.name,
          description: r.description,
          category: r.category,
          isRequired: r.isRequired,
          sortOrder: r.sortOrder,
          sourceUrl: r.sourceUrl,
        }))
      );
    }

    // The live row's hash moves forward too, so the next run compares
    // against what the page says *now* and does not raise a second
    // pending copy for the same change on every sweep.
    await tx
      .update(corridors)
      .set({ sourceHash: newHash })
      .where(eq(corridors.id, corridorId));

    return draft.id;
  });
}

/**
 * Re-read every live corridor's source and raise a review item for each
 * one that moved.
 *
 * `limit` caps a single run the way the companion digest does: each
 * corridor is an HTTP round trip inside one handler with a function
 * timeout, so an unbounded sweep grows with the corridor count.
 */
export async function recheckCorridors({
  limit = 25,
  only,
}: {
  limit?: number;
  /**
   * Re-check just these corridors instead of sweeping every live one.
   *
   * The scheduled run passes nothing and takes the whole table. This is
   * for asking about one corridor on purpose — an owner who wants to
   * know now rather than at the next sweep, and the tests, which must
   * not reach across into the seeded corridors and raise review items
   * nobody asked for.
   */
  only?: string[];
} = {}): Promise<DriftResult> {
  const scope = only?.length
    ? and(
        eq(corridors.isLive, true),
        isNotNull(corridors.sourceUrl),
        inArray(corridors.id, only)
      )
    : and(eq(corridors.isLive, true), isNotNull(corridors.sourceUrl));

  const rows = await db
    .select({
      id: corridors.id,
      sourceUrl: corridors.sourceUrl,
      sourceHash: corridors.sourceHash,
    })
    .from(corridors)
    .where(scope)
    /**
     * Never-hashed first, then least-recently-verified.
     *
     * `nulls first` is explicit because it has to be: Postgres defaults
     * ASC to NULLS LAST, so a plain `.orderBy(corridors.sourceHash)`
     * sorted un-baselined rows *behind* every hashed one. With 52
     * corridors and a default limit of 25, the sweep spent its whole
     * budget on rows it had already seen and never reached the ones it
     * exists to baseline — silently, with a healthy-looking log.
     *
     * The tiebreak is `last_verified_at`, not `version`: ordering by a
     * sha256 digest and then by version is arbitrary twice over, since
     * neither says anything about how overdue a corridor is.
     */
    .orderBy(
      sql`${corridors.sourceHash} asc nulls first`,
      sql`${corridors.lastVerifiedAt} asc nulls first`
    )
    .limit(limit);

  const result: DriftResult = {
    checked: 0,
    drifted: [],
    baselined: 0,
    failed: [],
  };

  for (const row of rows) {
    if (!row.sourceUrl) continue;
    result.checked += 1;

    try {
      const hash = await fetchHash(row.sourceUrl);

      if (!row.sourceHash) {
        // First sighting. Recording a baseline is not drift — the four
        // seeded corridors have never been hashed, and reporting them
        // all as changed on the first run would be noise, not signal.
        await db
          .update(corridors)
          .set({ sourceHash: hash })
          .where(eq(corridors.id, row.id));
        result.baselined += 1;
        continue;
      }

      if (hash === row.sourceHash) continue;

      const draftId = await raisePendingCopy(row.id, hash);
      result.drifted.push({
        corridorId: row.id,
        draftId,
        sourceUrl: row.sourceUrl,
      });
    } catch (error) {
      // A source that is down is not a source that changed. Nothing is
      // written, so the next run tries again.
      result.failed.push({
        corridorId: row.id,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return result;
}
