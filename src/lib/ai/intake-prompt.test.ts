import { describe, expect, it } from "vitest";

import { buildIntakeSystemPrompt } from "@/lib/ai/intake-prompt";
import { INTAKE_QUESTIONS, HISTORY_NOTE } from "@/lib/domain/intake";

/**
 * The system prompt is the only place the model learns what it may say,
 * so these assertions are about the parts that would be dangerous to
 * lose silently: the language it answers in, the labels the corridor
 * table can actually match, the topic it is meant to ask next, and the
 * refusal to talk about requirements at all.
 *
 * Pure — no key, no network, no database.
 */
describe("buildIntakeSystemPrompt", () => {
  const prompt = (overrides: Partial<Parameters<typeof buildIntakeSystemPrompt>[0]> = {}) =>
    buildIntakeSystemPrompt({
      answers: {},
      locale: "en",
      firstName: "Ada",
      ...overrides,
    });

  it("names the traveller's language the way they would write it", () => {
    expect(prompt({ locale: "yo" })).toContain("Yorùbá");
    expect(prompt({ locale: "ha" })).toContain("Hausa");
  });

  it("says the traveller may answer in any language", () => {
    expect(prompt().toLowerCase()).toContain("any language");
  });

  it("carries every question, in order, with its key", () => {
    const text = prompt();
    for (const question of INTAKE_QUESTIONS) {
      expect(text).toContain(question.key);
      expect(text).toContain(question.prompt.en);
    }

    const positions = INTAKE_QUESTIONS.map((q) => text.indexOf(q.prompt.en));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("points at the first unanswered topic", () => {
    const text = prompt({
      answers: { nationality: "Nigeria", residence: "Lagos" },
    });

    expect(text).toContain("next unanswered topic is `destination`");
  });

  it("points at the first gap, not the last answer", () => {
    const text = prompt({ answers: { residence: "Lagos" } });

    expect(text).toContain("next unanswered topic is `nationality`");
  });

  it("says the intake is finished once every topic has an answer", () => {
    const answers = Object.fromEntries(
      INTAKE_QUESTIONS.map((q) => [q.key, "something"])
    );
    const text = prompt({ answers });

    expect(text).not.toContain("next unanswered topic is");
    expect(text).toContain("/app/requirements");
  });

  it("reads back the answers already recorded", () => {
    const text = prompt({ answers: { nationality: "Ghana" } });

    expect(text).toContain("nationality: Ghana");
  });

  it("lists the canonical labels the corridor table is keyed on", () => {
    const text = prompt();

    expect(text).toContain("United Arab Emirates");
    expect(text).toContain("South Africa");
    expect(text).toContain("Relocation");
  });

  it("says to record the traveller's own words when nothing matches", () => {
    expect(prompt().toLowerCase()).toContain("verbatim");
  });

  it("forbids talking about requirements, fees or eligibility", () => {
    const text = prompt().toLowerCase();

    expect(text).toContain("never");
    expect(text).toContain("requirements");
    expect(text).toContain("fees");
    expect(text).toContain("processing times");
    expect(text).toContain("eligibility");
  });

  it("forbids inventing an answer", () => {
    expect(prompt().toLowerCase()).toContain("never invent");
  });

  it("keeps the reassurance the scripted flow shows beside the refusal question", () => {
    expect(prompt()).toContain(HISTORY_NOTE);
  });

  it("greets the traveller by the name they gave", () => {
    expect(prompt({ firstName: "Chidi" })).toContain("Chidi");
  });
});
