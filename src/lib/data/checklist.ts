import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents } from "@/lib/db/schema";
import type { CorridorRuleSet } from "@/lib/visa/types";

/**
 * Materialise a rule set as an application's checklist and point the
 * application at the corridor it came from.
 *
 * Callable more than once by design. The intake action runs it when the
 * final answer lands, but that moment is not guaranteed to be the last
 * word: staging completed intakes against an unseeded corridors table
 * and left applications permanently checklist-less, because nothing
 * revisited the decision once the data existed. The requirements screen
 * now heals that state by calling this again — so re-running against an
 * existing checklist must add nothing, and a document a traveller has
 * already uploaded must survive whatever the corridor now asks for.
 *
 * Authorization is the caller's job, same as `submitApplicationTx`:
 * this module never learns who asked.
 */
export async function adoptRuleSet(
  applicationId: string,
  ruleSet: CorridorRuleSet
): Promise<void> {
  const requirements = ruleSet.requirements;

  const existing = await db
    .select({
      docKey: documents.docKey,
      state: documents.state,
      description: documents.description,
    })
    .from(documents)
    .where(eq(documents.applicationId, applicationId));

  const keep = new Set(existing.map((d) => d.docKey));

  const rows = requirements
    .filter((r) => !keep.has(r.docKey))
    .map((r) => ({
      applicationId,
      docKey: r.docKey,
      name: r.name,
      // Copied onto the row rather than joined back through
      // `applications.corridor_id`, which is null whenever the rule set
      // has no corridor row of ours behind it. See the column comment.
      description: r.description,
      isRequired: r.isRequired,
      sortOrder: r.sortOrder,
    }));

  if (rows.length) await db.insert(documents).values(rows);

  /**
   * Copying guidance costs what the join gave away: a reworded
   * requirement no longer reaches an existing checklist by itself. So
   * re-adopting refreshes it — only where it actually changed, which on
   * the common path (the requirements screen re-adopting an unchanged
   * corridor) is nowhere and costs no writes.
   *
   * Only the description. `name`, `isRequired` and `sortOrder` were
   * already snapshots taken at insert and are left that way: renumbering
   * a checklist someone is halfway through is a bigger decision than
   * this fix, and belongs with the change-notification work.
   */
  const wording = new Map(existing.map((d) => [d.docKey, d.description]));
  const reworded = requirements.filter(
    (r) => wording.has(r.docKey) && wording.get(r.docKey) !== r.description
  );

  for (const r of reworded) {
    await db
      .update(documents)
      .set({ description: r.description })
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, r.docKey)
        )
      );
  }

  // Drop rows this corridor no longer asks for, unless already uploaded.
  const wanted = new Set(requirements.map((r) => r.docKey));
  const stale = existing
    .filter((d) => !wanted.has(d.docKey) && d.state === "not_started")
    .map((d) => d.docKey);

  if (stale.length) {
    await db
      .delete(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          inArray(documents.docKey, stale)
        )
      );
  }

  await db
    .update(applications)
    .set({ corridorId: ruleSet.corridorId })
    .where(eq(applications.id, applicationId));
}
