/**
 * The two things a checklist row can say beneath a document's name, and
 * the rule that they are not alternatives.
 *
 * `reason` is what happened to the file this traveller sent — written by
 * the pre-check or by a reviewer. `description` is what the document is,
 * curated once per requirement in `corridor_requirements`. The row used
 * to render one *or* the other, which meant a flagged document lost its
 * instructions at the exact moment the traveller was being asked to try
 * again: told the file was wrong, and no longer told what a right one
 * looks like.
 *
 * Kept here rather than inline in the row because the row is a client
 * component in a `.tsx` file, and this test suite runs `.ts` in Node —
 * a rule worth pinning is a rule worth putting somewhere it can be.
 */
export type DocumentGuidance = {
  /** What went wrong with the file on this row, if anything has. */
  rejection: string | null;
  /** What the document is, and what an acceptable one looks like. */
  guidance: string | null;
};

/**
 * A cleared textarea posts `""`, not `null`, so both fields arrive blank
 * rather than absent often enough that treating blank as present renders
 * an empty paragraph — which reads as a broken page rather than as
 * nothing to say.
 */
function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function documentGuidance(input: {
  reason: string | null | undefined;
  description: string | null | undefined;
}): DocumentGuidance {
  return {
    rejection: present(input.reason),
    guidance: present(input.description),
  };
}
