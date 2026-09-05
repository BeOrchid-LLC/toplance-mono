import { describe, expect, it } from "vitest";

import { intakeAnswerSchema } from "@/lib/ai/intake-tool";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";

/**
 * Both intake agents record answers through this schema, so what it
 * accepts is the whole contract between a model and the intake table.
 * These are the properties that would be dangerous to lose quietly: the
 * key set tracking the questions, and the cap that stops a model writing
 * an essay into a row the traveller will read back on their profile.
 *
 * Pure — no key, no network, no database.
 */
describe("intakeAnswerSchema", () => {
  it("accepts every question the intake actually asks", () => {
    for (const question of INTAKE_QUESTIONS) {
      const parsed = intakeAnswerSchema.safeParse({
        questionKey: question.key,
        value: "Nigeria",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("offers exactly the intake's keys, in order", () => {
    expect(intakeAnswerSchema.shape.questionKey.options).toEqual(
      INTAKE_QUESTIONS.map((q) => q.key)
    );
  });

  it("rejects a key that is not a question", () => {
    expect(
      intakeAnswerSchema.safeParse({ questionKey: "salary", value: "x" }).success
    ).toBe(false);
  });

  it("rejects an empty answer", () => {
    expect(
      intakeAnswerSchema.safeParse({ questionKey: "budget", value: "" }).success
    ).toBe(false);
  });

  it("caps an answer at 500 characters", () => {
    const key = INTAKE_QUESTIONS[0].key;
    expect(
      intakeAnswerSchema.safeParse({ questionKey: key, value: "a".repeat(500) })
        .success
    ).toBe(true);
    expect(
      intakeAnswerSchema.safeParse({ questionKey: key, value: "a".repeat(501) })
        .success
    ).toBe(false);
  });
});
