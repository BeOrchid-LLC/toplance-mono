import { describe, expect, it } from "vitest";

import {
  INTAKE_QUESTIONS,
  applyIntakeWrites,
  nextIntakeQuestion,
  orderIntakeWrites,
  truncateAnswersAt,
} from "@/lib/domain/intake";

const KEYS = INTAKE_QUESTIONS.map((q) => q.key);

/**
 * The live intake shows this question locally under the greeting: the
 * model only speaks once the traveller has, so without it question one
 * — or, after a reload, whichever question is next — is never asked.
 */
describe("nextIntakeQuestion", () => {
  it("opens a fresh intake with the first question", () => {
    expect(nextIntakeQuestion({})?.key).toBe("nationality");
  });

  it("resumes a part-answered intake at the first gap", () => {
    expect(
      nextIntakeQuestion({ nationality: "Nigeria", residence: "Lagos" })?.key
    ).toBe("destination");
  });

  it("returns nothing once every question is answered", () => {
    const all = Object.fromEntries(KEYS.map((key) => [key, "answered"]));
    expect(nextIntakeQuestion(all)).toBeUndefined();
  });
});

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

describe("applyIntakeWrites", () => {
  it("replays a run of answers in order", () => {
    const answers = applyIntakeWrites(
      {},
      [
        { key: KEYS[0], value: "Nigeria" },
        { key: KEYS[1], value: "Lagos" },
      ]
    );

    expect(answers).toEqual({ [KEYS[0]]: "Nigeria", [KEYS[1]]: "Lagos" });
  });

  it("truncates at each replayed answer, as the database does", () => {
    const answers = applyIntakeWrites(
      {},
      [
        { key: KEYS[0], value: "Nigeria" },
        { key: KEYS[1], value: "Lagos" },
        { key: KEYS[2], value: "Canada" },
        // A correction to the first topic clears the two after it.
        { key: KEYS[0], value: "Ghana" },
      ]
    );

    expect(answers).toEqual({ [KEYS[0]]: "Ghana" });
  });

  it("lands on the same rail when an answer is already known", () => {
    // The property the rail depends on when the server sends back a
    // record that already contains what was just recorded: replaying it
    // a second time must not move anything.
    const base = { [KEYS[0]]: "Nigeria", [KEYS[1]]: "Lagos" };
    const write = [{ key: KEYS[1], value: "Lagos" }];

    expect(applyIntakeWrites(base, write)).toEqual(base);
  });

  it("leaves the record it was given untouched", () => {
    const base = { [KEYS[0]]: "Nigeria" };
    applyIntakeWrites(base, [{ key: KEYS[1], value: "Lagos" }]);

    expect(base).toEqual({ [KEYS[0]]: "Nigeria" });
  });
});

/**
 * The screen has two writers and only one rail. These tests are the
 * regression that made the ordering explicit: replaying the spoken
 * answers last is wrong in a way that silently loses a typed one.
 */
describe("orderIntakeWrites", () => {
  it("puts a spoken answer before the typing that came after it", () => {
    const spoken = [
      { key: KEYS[0], value: "Nigeria", afterWrites: 0 },
      { key: KEYS[1], value: "Lagos", afterWrites: 0 },
    ];
    const typed = [{ key: KEYS[2], value: "Canada" }];

    expect(orderIntakeWrites(typed, spoken).map((w) => w.key)).toEqual([
      KEYS[0],
      KEYS[1],
      KEYS[2],
    ]);
  });

  it("keeps a typed answer given after a voice call", () => {
    // The bug this exists for: speak the first two, stop, type the
    // third. Replaying the spoken pair last truncated back to the first
    // topic and re-applied it, dropping the typed answer off the rail —
    // so the rail walked backwards, the agent re-asked a question, and
    // an intake the database considered finished never said so.
    const spoken = [
      { key: KEYS[0], value: "Nigeria", afterWrites: 0 },
      { key: KEYS[1], value: "Lagos", afterWrites: 0 },
    ];
    const typed = [{ key: KEYS[2], value: "Canada" }];

    const ordered = orderIntakeWrites(typed, spoken);

    expect(applyIntakeWrites({}, ordered)).toEqual({
      [KEYS[0]]: "Nigeria",
      [KEYS[1]]: "Lagos",
      [KEYS[2]]: "Canada",
    });
  });

  it("puts a spoken answer after the typing that preceded it", () => {
    const typed = [
      { key: KEYS[0], value: "Nigeria" },
      { key: KEYS[1], value: "Lagos" },
    ];
    const spoken = [{ key: KEYS[2], value: "Canada", afterWrites: 2 }];

    expect(orderIntakeWrites(typed, spoken).map((w) => w.value)).toEqual([
      "Nigeria",
      "Lagos",
      "Canada",
    ]);
  });

  it("interleaves two calls either side of some typing", () => {
    const typed = [
      { key: KEYS[1], value: "Lagos" },
      { key: KEYS[3], value: "Work" },
    ];
    const spoken = [
      { key: KEYS[0], value: "Nigeria", afterWrites: 0 },
      { key: KEYS[2], value: "Canada", afterWrites: 1 },
      { key: KEYS[4], value: "March", afterWrites: 2 },
    ];

    expect(orderIntakeWrites(typed, spoken).map((w) => w.value)).toEqual([
      "Nigeria",
      "Lagos",
      "Canada",
      "Work",
      "March",
    ]);
  });

  it("keeps every write exactly once", () => {
    const typed = [{ key: KEYS[1], value: "Lagos" }];
    const spoken = [{ key: KEYS[0], value: "Nigeria", afterWrites: 0 }];

    expect(orderIntakeWrites(typed, spoken)).toHaveLength(2);
  });

  it("handles either stream being empty", () => {
    const typed = [{ key: KEYS[0], value: "Nigeria" }];
    const spoken = [{ key: KEYS[0], value: "Ghana", afterWrites: 1 }];

    expect(orderIntakeWrites(typed, [])).toEqual(typed);
    expect(orderIntakeWrites([], spoken)).toEqual(spoken);
    expect(orderIntakeWrites([], [])).toEqual([]);
  });
});
