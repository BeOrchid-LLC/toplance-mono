import { INTAKE_QUESTIONS } from "@/lib/domain/intake";

/**
 * When a conditional document actually applies to one traveller.
 *
 * The 01/09 review's objection, in the client's words: "We shouldn't give
 * the travellers a list with 'only if it applies'. That's exactly the
 * thing we exist to solve — telling them what applies." This module is
 * the mechanism for removing that hedge — a rule an approver writes
 * against the intake answers, so the product can say *this* document is
 * yours rather than *some* of these might be.
 *
 * Pure, and deliberately small. The rule language is one shape:
 *
 *   [{ answer: "companions", in: ["Partner", "Partner and children"] }]
 *
 * Every clause must match — clauses are ANDed, alternatives go in `in`.
 * There is no `or`, no negation and no nesting, and that is a decision
 * rather than an unfinished job: an approver has to be able to read a
 * rule and be sure what it does, and every real requirement seen so far
 * ("married applicants", "travelling with children", "students") is a
 * membership test on one answer. A rule nobody can check is worse than
 * the hedge it replaces.
 */

export type AppliesWhenClause = {
  /** An `INTAKE_QUESTIONS` key — `companions`, `purpose`, `history`. */
  answer: string;
  /** The answers that make this document apply. Matched case-insensitively. */
  in: string[];
};

export type AppliesWhen = AppliesWhenClause[];

const QUESTION_KEYS = new Set(INTAKE_QUESTIONS.map((q) => q.key));

/**
 * Read a rule off a `jsonb` column, or null.
 *
 * Null for anything malformed, and that is the safe direction: an
 * unreadable rule leaves the document where it started, as a conditional
 * one a traveller is asked about, rather than silently deciding it does
 * not apply to them. The column is `jsonb`, so this is the only place
 * that trusts its shape.
 */
export function parseAppliesWhen(value: unknown): AppliesWhen | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const clauses: AppliesWhen = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;

    const { answer, in: options } = raw as { answer?: unknown; in?: unknown };
    if (typeof answer !== "string" || !QUESTION_KEYS.has(answer)) return null;
    if (!Array.isArray(options) || options.length === 0) return null;
    if (options.some((o) => typeof o !== "string" || !o.trim())) return null;

    clauses.push({ answer, in: options as string[] });
  }

  return clauses;
}

export type AppliesResult =
  /** A rule exists and this traveller matches it. */
  | { applies: true; certain: true }
  /** A rule exists and this traveller does not match it. */
  | { applies: false; certain: true }
  /** No rule, or a rule we could not answer — offer it with a hedge. */
  | { applies: true; certain: false };

/**
 * Whether one conditional document applies to one traveller.
 *
 * Three outcomes rather than a boolean, because "we do not know" is a
 * real state and the screen renders it differently: a certain yes joins
 * the checklist, a certain no disappears, and an uncertain one stays in
 * the "only if it applies" list until somebody writes the rule.
 *
 * An answer that is missing from the intake yields the uncertain
 * outcome, not a no. Intake is complete before a checklist exists, so a
 * missing answer means the rule names a topic this traveller was never
 * asked — a data problem — and dropping a document over it is how
 * somebody arrives at a mission without their marriage certificate.
 */
export function appliesToTraveller(
  rule: AppliesWhen | null,
  answers: Record<string, string | undefined>
): AppliesResult {
  if (!rule || rule.length === 0) return { applies: true, certain: false };

  for (const clause of rule) {
    const given = answers[clause.answer];
    if (given == null || !given.trim()) return { applies: true, certain: false };

    const match = clause.in.some(
      (option) => option.trim().toLowerCase() === given.trim().toLowerCase()
    );

    if (!match) return { applies: false, certain: true };
  }

  return { applies: true, certain: true };
}

/**
 * The rule as an approver reads it back — "Only if Who is coming with
 * you is Partner or Partner and children".
 *
 * Built from `INTAKE_QUESTIONS` so it always names the topic the way the
 * traveller was actually asked it, rather than repeating the key.
 */
export function describeAppliesWhen(rule: AppliesWhen | null): string | null {
  if (!rule || rule.length === 0) return null;

  return rule
    .map((clause) => {
      const question = INTAKE_QUESTIONS.find((q) => q.key === clause.answer);
      const topic = question ? question.prompt.en : clause.answer;
      const options =
        clause.in.length === 1
          ? clause.in[0]
          : `${clause.in.slice(0, -1).join(", ")} or ${clause.in.at(-1)}`;

      return `${topic} — ${options}`;
    })
    .join("; and ");
}
