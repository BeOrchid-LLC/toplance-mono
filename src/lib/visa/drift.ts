import { z } from "zod";

/**
 * Staleness assessment for live curated corridors, from the vendor's
 * entry verdict.
 *
 * A curated corridor's standing assumption is that a visa application
 * exists for its pair — that is what having a checklist means. Travel
 * Buddy re-derives its verdict daily, so when the vendor stops saying
 * "visa required" for a pair we still maintain a checklist on, someone
 * should look. This module makes exactly that judgement and nothing
 * else: no I/O, no corridor edits, no traveller-facing output.
 *
 * Two boundaries hold its honesty:
 *
 * - **A flag, never a fix.** The vendor has no purpose parameter, so
 *   its verdict is a short-stay default. Disagreement is a prompt to
 *   re-verify a corridor with the mission, not evidence the work or
 *   study checklist is wrong — nothing downstream may edit curated
 *   data on this signal.
 * - **An allowlist, mirrored from `entry-check.ts`.** Verdicts we have
 *   not met are not silently binned: they land in `attention`, so the
 *   next unanticipated category reaches a human instead of vanishing
 *   into a default branch.
 *
 * Deliberately importable from outside the server graph — no
 * `server-only`, no `@/` aliases — because its caller is the
 * `visa:drift` runner, a plain-node script in the `seed.mts` mould.
 */

/**
 * The verified `{ data, meta }` envelope, reduced to the one field this
 * module reads. `data` is required so an unwrapped payload is rejected
 * rather than read as empty — the silent-inertness lesson recorded in
 * `travelbuddy.ts`.
 */
const envelopeSchema = z.object({
  data: z.object({
    visa_rules: z
      .object({
        primary_rule: z.object({ name: z.string().nullish() }).nullish(),
      })
      .nullish(),
  }),
});

/**
 * The vendor's verdict for a pair — `visa_rules.primary_rule.name` —
 * or null when the payload carries none or is not the shape the vendor
 * was verified to send.
 */
export function toVerdict(payload: unknown): string | null {
  const parsed = envelopeSchema.safeParse(payload);
  if (!parsed.success) return null;

  const name = parsed.data.data.visa_rules?.primary_rule?.name?.trim();
  return name ? name : null;
}

export type DriftStatus =
  | "consistent"
  | "contradicts"
  | "attention"
  | "unassessable";

export type DriftAssessment = {
  status: DriftStatus;
  /** The vendor's wording, verbatim, for the report and the event. */
  verdict: string | null;
};

/** The visa-required family — the same two verdicts `entry-check.ts`
 *  is willing to repeat to a traveller as "a visa is required". */
const CONSISTENT = new Set(["visa required", "online visa required"]);

/** The one verdict that directly contradicts maintaining a checklist. */
const CONTRADICTS = new Set(["visa not required"]);

/**
 * The vendor's verdict, judged against a live curated corridor's
 * standing assumption. Keys are lowercased and trimmed at the lookup —
 * the vendor's capitalisation varies between corridors, and case is
 * not a category.
 */
export function assessDrift(verdict: string | null): DriftAssessment {
  if (verdict == null) return { status: "unassessable", verdict: null };

  const key = verdict.trim().toLowerCase();
  if (CONSISTENT.has(key)) return { status: "consistent", verdict };
  if (CONTRADICTS.has(key)) return { status: "contradicts", verdict };
  return { status: "attention", verdict };
}
