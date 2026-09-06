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
  /**
   * The canonical chip values that make this document apply. Matched
   * against the *code* `normaliseAnswer` derived, not against whatever
   * the traveller typed.
   */
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
  /**
   * Unresolved, and which kind matters — 4.8 splits them because they
   * want opposite treatment.
   *
   * `unwritten`: nobody has written a rule for this requirement yet.
   * That is BeOrchid's unfinished curation, and putting it in front of a
   * traveller asks them to decide the exact thing the product exists to
   * decide for them. It is hidden from the traveller and raised on the
   * agency side as a coverage gap.
   *
   * `unevaluable`: a rule exists, and this traveller's answer could not
   * be matched to it — they wrote something free-text, or were never
   * asked the topic it names. That one IS theirs to resolve, and they
   * can, if the screen shows them the condition in plain language.
   */
  | { applies: true; certain: false; reason: "unwritten" | "unevaluable" };

/**
 * Whether one conditional document applies to one traveller.
 *
 * Three outcomes rather than a boolean, because "we do not know" is a
 * real state and the screen renders it differently: a certain yes joins
 * the checklist, a certain no disappears, and an uncertain one stays in
 * the "only if it applies" list until somebody writes the rule.
 *
 * `answers` are **codes**, from `normaliseAnswer` — not the traveller's
 * own words. That is the whole of the fix to the defect this used to
 * carry. Free text is allowed on every question, so this once compared
 * rules against whatever somebody typed: a traveller who wrote "my wife
 * and our son" rather than tapping *Partner and children* matched
 * nothing and was resolved as a certain NO, which dropped the marriage
 * certificate off their checklist and recorded that as certain.
 *
 * A null code is now the uncertain outcome, and so is a missing answer.
 * Both mean the rule could not be evaluated for this traveller, and an
 * unevaluable rule leaves the requirement hedged rather than hidden. The
 * asymmetry is deliberate: a hedge is a worse screen, and a wrongly
 * hidden document is a refused visa.
 *
 * Matching is exact. `normaliseAnswer` owns every bit of lenience about
 * what a traveller's words mean, because two files deciding that can
 * disagree and only one of them is tested against the chips.
 */
export function appliesToTraveller(
  rule: AppliesWhen | null,
  answers: Record<string, string | null | undefined>
): AppliesResult {
  if (!rule || rule.length === 0) {
    return { applies: true, certain: false, reason: "unwritten" };
  }

  for (const clause of rule) {
    const code = answers[clause.answer];
    if (code == null || !code.trim()) {
      return { applies: true, certain: false, reason: "unevaluable" };
    }

    if (!clause.in.includes(code)) return { applies: false, certain: true };
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
