/**
 * What changed between the version travellers are being served and the
 * one an owner is about to publish.
 *
 * Exists because approval is only meaningful if it is *possible*. A
 * revision to a twenty-line checklist where one fee moved is, read as a
 * whole, twenty lines of things to re-verify — so an approver either
 * reads it all again or waves it through, and the second is what
 * actually happens. Showing the three rows that moved is what keeps the
 * gate real.
 *
 * Pure and structural: this decides what changed, never how it looks.
 */

export type FieldChange = {
  label: string;
  before: string | null;
  after: string | null;
};

export type RequirementChange =
  | { kind: "added"; docKey: string; name: string }
  | { kind: "removed"; docKey: string; name: string }
  | { kind: "changed"; docKey: string; name: string; fields: FieldChange[] };

export type CorridorDiff = {
  /** True when there is no live version to compare against. */
  isFirstVersion: boolean;
  fields: FieldChange[];
  requirements: RequirementChange[];
};

/** The corridor-level facts worth diffing, as the screen labels them. */
type Comparable = {
  visaName: string;
  effectiveFrom: string;
  sourceName: string | null;
  sourceUrl: string | null;
  processingWeeksMin: number | null;
  processingWeeksMax: number | null;
  governmentFeeMinor: number | null;
  governmentFeeCurrency: string | null;
  requirements: {
    docKey: string;
    name: string;
    description: string | null;
    category: string;
    isRequired: boolean;
    sourceUrl: string | null;
  }[];
};

const show = (value: string | number | boolean | null): string | null => {
  if (value === null) return null;
  if (typeof value === "boolean") return value ? "Required" : "Only if it applies";
  return String(value);
};

function compare(
  label: string,
  before: string | number | boolean | null,
  after: string | number | boolean | null
): FieldChange | null {
  if (before === after) return null;
  return { label, before: show(before), after: show(after) };
}

/**
 * `live` is null for a corridor's first version, and the caller shows
 * the full list instead — there is nothing to diff against, and a first
 * draft has to be read in full anyway.
 */
export function corridorDiff(
  draft: Comparable,
  live: Comparable | null
): CorridorDiff {
  if (!live) {
    return { isFirstVersion: true, fields: [], requirements: [] };
  }

  const fields = [
    compare("Visa name", live.visaName, draft.visaName),
    compare("In effect from", live.effectiveFrom, draft.effectiveFrom),
    compare("Source", live.sourceName, draft.sourceName),
    compare("Source link", live.sourceUrl, draft.sourceUrl),
    compare("Government fee", live.governmentFeeMinor, draft.governmentFeeMinor),
    compare(
      "Fee currency",
      live.governmentFeeCurrency,
      draft.governmentFeeCurrency
    ),
    compare(
      "Decision time (min weeks)",
      live.processingWeeksMin,
      draft.processingWeeksMin
    ),
    compare(
      "Decision time (max weeks)",
      live.processingWeeksMax,
      draft.processingWeeksMax
    ),
  ].filter((c): c is FieldChange => c !== null);

  const liveByKey = new Map(live.requirements.map((r) => [r.docKey, r]));
  const draftByKey = new Map(draft.requirements.map((r) => [r.docKey, r]));

  const requirements: RequirementChange[] = [];

  for (const r of draft.requirements) {
    const was = liveByKey.get(r.docKey);
    if (!was) {
      requirements.push({ kind: "added", docKey: r.docKey, name: r.name });
      continue;
    }

    const changed = [
      compare("Name", was.name, r.name),
      compare("Guidance", was.description, r.description),
      compare("Category", was.category, r.category),
      compare("Requirement", was.isRequired, r.isRequired),
      compare("Source link", was.sourceUrl, r.sourceUrl),
    ].filter((c): c is FieldChange => c !== null);

    if (changed.length) {
      requirements.push({
        kind: "changed",
        docKey: r.docKey,
        name: r.name,
        fields: changed,
      });
    }
  }

  // Removals last: they are the ones that strand a traveller who already
  // uploaded something, so they read better as a closing warning than
  // buried among additions.
  for (const r of live.requirements) {
    if (!draftByKey.has(r.docKey)) {
      requirements.push({ kind: "removed", docKey: r.docKey, name: r.name });
    }
  }

  return { isFirstVersion: false, fields, requirements };
}

/** Nothing moved — worth saying out loud, since it usually means a mistake. */
export function isUnchanged(diff: CorridorDiff): boolean {
  return (
    !diff.isFirstVersion &&
    diff.fields.length === 0 &&
    diff.requirements.length === 0
  );
}
