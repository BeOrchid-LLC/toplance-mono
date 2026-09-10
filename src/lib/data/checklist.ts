import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents } from "@/lib/db/schema";
import { appliesToTraveller, describeAppliesWhen } from "@/lib/domain/applies-when";
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
  ruleSet: CorridorRuleSet,
  /**
   * The traveller's intake answers as canonical codes, which decide
   * which conditional documents are theirs. Optional, and an empty set
   * behaves exactly as this function did before conditions existed:
   * every conditional document is materialised with its hedge intact.
   *
   * Codes, never the traveller's own words — a null code means the
   * answer matched no chip, and `appliesToTraveller` reads that as "we
   * cannot evaluate this rule" rather than as a no.
   */
  answers: Record<string, string | null | undefined> = {}
): Promise<void> {
  /**
   * The rule set, narrowed to this one traveller. Four outcomes, not
   * three — 4.8 splits the hedge in two because the halves want opposite
   * treatment.
   *
   * Matched: stops being conditional and is stored as required, because
   * for them it is.
   *
   * Not matched: dropped here, and the stale-row sweep further down
   * removes it from a checklist it had already been added to (unless
   * they have uploaded it, which that sweep protects).
   *
   * Rule exists, could not be evaluated: kept, not required, and
   * carrying its condition in the words the traveller was asked. This is
   * the only unresolved state they can act on, and showing them the
   * condition is what turns "only if it applies" into a real question.
   *
   * No rule written: dropped from the traveller's checklist entirely.
   * That is BeOrchid's unfinished curation, and putting it in front of a
   * traveller asks them to decide the exact thing this product exists to
   * decide for them. `corridorCoverageGaps` raises it on the agency side
   * instead.
   */
  const requirements = ruleSet.requirements.flatMap((r) => {
    if (r.isRequired) return [{ ...r, condition: null }];

    const verdict = appliesToTraveller(r.appliesWhen, answers);
    if (!verdict.applies) return [];

    if (verdict.certain) return [{ ...r, isRequired: true, condition: null }];
    if (verdict.reason === "unwritten") return [];

    return [
      { ...r, isRequired: false, condition: describeAppliesWhen(r.appliesWhen) },
    ];
  });

  const existing = await db
    .select({
      docKey: documents.docKey,
      state: documents.state,
      description: documents.description,
      source: documents.source,
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
      condition: r.condition,
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

  /**
   * A requirement the corridor has caught up with.
   *
   * A reviewer asks one traveller for a police certificate; a later
   * revision adds it to the corridor for everyone. The row is the
   * corridor's now, and saying so is what keeps it inside the sweep's
   * reach — left filed as the agency's, a revision that dropped the
   * requirement again could never remove it, because the sweep above
   * only ever touches `corridor` rows.
   *
   * The description goes with it. The reword pass above skips these:
   * `wording` holds whatever the reviewer typed, so a request that
   * already reads like the corridor's line would compare equal and keep
   * the agency's wording forever. Setting both here is one write either
   * way.
   */
  const requestedKeys = new Set(
    existing.filter((d) => d.source === "agency").map((d) => d.docKey)
  );
  const promoted = requirements.filter((r) => requestedKeys.has(r.docKey));

  for (const r of promoted) {
    await db
      .update(documents)
      .set({ source: "corridor", requestedBy: null, description: r.description })
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, r.docKey)
        )
      );
  }

  /**
   * Drop rows this corridor no longer asks for, unless already uploaded
   * — or unless the corridor never asked for them in the first place.
   *
   * `!wanted.has(docKey)` was a safe reading of "nobody wants this" only
   * while the corridor was the sole author of a checklist. A document a
   * reviewer asked this one traveller for is `not_started` and is not in
   * any corridor's requirements, so it matched the sweep on both counts
   * — and the requirements screen re-adopts on an ordinary visit to heal
   * a checklist-less case, so the traveller deleted the request by
   * opening the page they had been sent to. Silently: no error, and a
   * reviewer looking again just sees a case that never had the row.
   *
   * The filter is on who wrote the row, not on switching the sweep off.
   * A corridor document the corridor has stopped wanting still goes.
   */
  const wanted = new Set(requirements.map((r) => r.docKey));
  const stale = existing
    .filter(
      (d) =>
        d.source === "corridor" &&
        !wanted.has(d.docKey) &&
        d.state === "not_started"
    )
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

/**
 * Stamp the moment a traveller's required checklist first reached 100%
 * collected, and say whether this call is the one that did it.
 *
 * The brief asks for the review desk to hear about 100% completion
 * (items 9 and 11) separately from submission, and they are separate
 * moments: somebody can upload every document and never press Submit.
 * Until this existed that person was invisible to the desk, which is
 * the opposite of what a checklist at 100% should mean.
 *
 * "Collected" here means uploaded and awaiting or past review, and it
 * deliberately parted company with `completionOf` on 6 September. The
 * ring counts a flagged document, so a traveller told their passport
 * photo is blurry does not watch their progress fall backwards. This
 * does not: a flag is the reviewer saying that document is outstanding,
 * and telling them "the checklist is complete" the moment after they
 * flagged something is noise from a desk they are already sitting at.
 *
 * Not "verified" either. Waiting for verification would make this fire
 * when a reviewer finished, which is news to nobody, since a reviewer is
 * already looking. Billing does gate on verified — see
 * `markBillableIfComplete` — because that answers a different question.
 *
 * Written the way `markBillableIfComplete` is, and for the same reason:
 * completion is not monotonic, so the column is what makes one
 * traveller one notification however many times a flag-and-re-upload
 * cycle refills the checklist. The `is null` guard in the update is
 * what makes that true under concurrent uploads rather than merely
 * likely.
 *
 * It parts company with billing in one place. Billing returns early
 * without an `org_id`, because there is no business to charge; there is
 * still a reviewer to tell, so this does not.
 *
 * Authorization is the caller's job, like everything else here.
 */
export async function markChecklistCompleteIfDone(
  tx: Pick<typeof db, "select" | "update">,
  applicationId: string
): Promise<{ becameComplete: boolean }> {
  const [app] = await tx
    .select({ completeAt: applications.checklistCompleteAt })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!app || app.completeAt) return { becameComplete: false };

  const rows = await tx
    .select({ state: documents.state, isRequired: documents.isRequired })
    .from(documents)
    .where(eq(documents.applicationId, applicationId));

  // An application with no required documents has not "reached 100%" —
  // it has no checklist yet. Treating an empty set as complete would
  // announce every application the moment intake created it.
  const required = rows.filter((d) => d.isRequired);
  if (required.length === 0) return { becameComplete: false };

  const collected = required.filter(
    (d) => d.state === "checking" || d.state === "verified"
  ).length;
  if (collected < required.length) return { becameComplete: false };

  const updated = await tx
    .update(applications)
    .set({ checklistCompleteAt: new Date() })
    .where(
      and(
        eq(applications.id, applicationId),
        isNull(applications.checklistCompleteAt)
      )
    )
    .returning({ id: applications.id });

  return { becameComplete: updated.length > 0 };
}
