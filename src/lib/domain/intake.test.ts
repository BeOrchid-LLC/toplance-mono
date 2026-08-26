import { describe, expect, it } from "vitest";

import { INTAKE_QUESTIONS, truncateAnswersAt } from "@/lib/domain/intake";

/**
 * `truncateAnswersAt` is the client-side shadow of what
 * `recordIntakeAnswer` does in the database, and three screens now rely
 * on it agreeing with the server: the scripted transcript, the chat
 * rail, and the voice session working out what to ask next. A rail that
 * disagrees with the checklist is a traveller uploading documents for a
 * corridor they corrected ten seconds ago.
 */
describe("truncateAnswersAt", () => {
  const full = Object.fromEntries(
    INTAKE_QUESTIONS.map((q) => [q.key, `answer to ${q.key}`])
  );

  it("keeps everything before the topic and drops the topic itself", () => {
    const kept = truncateAnswersAt(full, INTAKE_QUESTIONS[3].key);

    expect(Object.keys(kept)).toEqual(
      INTAKE_QUESTIONS.slice(0, 3).map((q) => q.key)
    );
  });

  it("clears everything when the first topic is reopened", () => {
    expect(truncateAnswersAt(full, INTAKE_QUESTIONS[0].key)).toEqual({});
  });

  it("keeps the first nine when the last is reopened", () => {
    const kept = truncateAnswersAt(full, INTAKE_QUESTIONS.at(-1)!.key);

    expect(Object.keys(kept)).toHaveLength(INTAKE_QUESTIONS.length - 1);
  });

  it("does not invent answers that were never given", () => {
    const partial = { [INTAKE_QUESTIONS[0].key]: "Nigeria" };

    expect(truncateAnswersAt(partial, INTAKE_QUESTIONS[4].key)).toEqual(partial);
  });

  it("leaves the record it was given untouched", () => {
    const before = { ...full };
    truncateAnswersAt(full, INTAKE_QUESTIONS[2].key);

    expect(full).toEqual(before);
  });

  it("changes nothing for a key the intake does not ask", () => {
    // The database refuses that write outright, so the shadow of it is
    // nothing happening. Worth an assertion because the unguarded
    // `slice(0, -1)` would instead have dropped the last answer.
    expect(truncateAnswersAt(full, "salary")).toEqual(full);
  });
});
