import { describe, expect, it } from "vitest";

import {
  INTAKE_QUESTIONS,
  applyIntakeWrites,
  intakeFrontier,
  nextIntakeQuestion,
  orderIntakeWrites,
  resolveChips,
  truncateAnswersAt,
} from "@/lib/domain/intake";
import { LOCALES } from "@/lib/i18n/locales";

const KEYS = INTAKE_QUESTIONS.map((q) => q.key);

/**
 * The live intake shows this question locally under the greeting: the
 * model only speaks once the traveller has, so without it question one
 * — or, after a reload, whichever question is next — is never asked.
 */
describe("nextIntakeQuestion", () => {
  it("opens a fresh intake with the first question", () => {
    expect(nextIntakeQuestion({})).toBe(INTAKE_QUESTIONS[0]);
  });

  it("resumes a part-answered intake at the first gap", () => {
    expect(
      nextIntakeQuestion({
        passport_name: "Adaeze Okonkwo",
        nationality: "Nigeria",
        residence_country: "Nigeria",
        residence: "Lagos",
      })?.key
    ).toBe("destination");
  });

  it("returns nothing once every question is answered", () => {
    const all = Object.fromEntries(KEYS.map((key) => [key, "answered"]));
    expect(nextIntakeQuestion(all)).toBeUndefined();
  });

  /**
   * The whole reason this is one shared function. Both agents ask at the
   * first gap; the screen used to count what was filled and index the
   * list with the total, which is the same number only while the answers
   * are a contiguous prefix. Nothing guarantees that: `record_answer`
   * accepts any of the ten keys, and the prompt tells the model to use it
   * the moment a topic is answered — so a traveller who volunteers their
   * destination while being asked their nationality leaves a hole, and a
   * count then points one question past the one being asked.
   */
  it("asks at the gap when an answer landed out of order", () => {
    const answers: Record<string, string> = { destination: "Germany" };
    const counted = INTAKE_QUESTIONS.filter((q) => answers[q.key]).length;

    expect(nextIntakeQuestion(answers)?.key).toBe("passport_name");
    expect(INTAKE_QUESTIONS[counted].key).not.toBe("passport_name");
  });
});

describe("intakeFrontier", () => {
  it("starts at the first question", () => {
    expect(intakeFrontier({})).toBe(0);
  });

  it("sits on the first gap, not on the number answered", () => {
    expect(intakeFrontier({ destination: "Germany" })).toBe(0);
    expect(
      intakeFrontier({
        passport_name: "Adaeze Okonkwo",
        nationality: "Nigeria",
        purpose: "Work",
      })
    ).toBe(2);
  });

  it("runs off the end of the list once every question is answered", () => {
    const all = Object.fromEntries(KEYS.map((key) => [key, "answered"]));
    expect(intakeFrontier(all)).toBe(INTAKE_QUESTIONS.length);
  });

  it("agrees with the question it names", () => {
    const answers = { nationality: "Nigeria", residence: "Lagos" };
    expect(INTAKE_QUESTIONS[intakeFrontier(answers)]).toBe(
      nextIntakeQuestion(answers)
    );
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

/**
 * The two topics the client's brief item 1 names and the intake did not
 * ask. Both are asserted by position rather than by count, because what
 * the brief buys is the *question being asked* — a datum collected
 * somewhere else does not satisfy it.
 */
describe("the topics brief item 1 names", () => {
  it("opens by confirming the name on the passport", () => {
    // Not "asks for a name": sign-up already captured one. A visa is
    // issued to the name the passport carries, so the opening move is
    // to check the one we hold against it.
    expect(nextIntakeQuestion({})?.key).toBe("passport_name");
  });

  it("asks which country the traveller is in, before which city", () => {
    const keys = INTAKE_QUESTIONS.map((q) => q.key);

    expect(keys.indexOf("residence_country")).toBeGreaterThan(
      keys.indexOf("nationality")
    );
    expect(keys.indexOf("residence_country")).toBeLessThan(
      keys.indexOf("residence")
    );
  });
});

/**
 * The passport question is the only one whose chip is not knowable when
 * the module loads — its whole content is the traveller's own name. The
 * substitution is a pure function so both agents share it: the scripted
 * flow stores `chip.value` verbatim, and a chip reading "Yes — {fullName}"
 * would otherwise be filed as the answer of record.
 */
describe("resolveChips", () => {
  const passport = INTAKE_QUESTIONS.find((q) => q.key === "passport_name")!;
  const nobody = { fullName: "Adaeze Okonkwo", answers: {} };

  it("puts the traveller's name in the value the scripted flow stores", () => {
    const [chip] = resolveChips(passport, nobody);

    expect(chip.value).toBe("Adaeze Okonkwo");
  });

  it("puts the name in every language's label", () => {
    const [chip] = resolveChips(passport, nobody);

    for (const locale of LOCALES) {
      expect(chip.label[locale.code]).toContain("Adaeze Okonkwo");
    }
  });

  it("offers nothing to confirm when no name is held", () => {
    // A chip reading "Yes — " confirms nothing. Free text still answers.
    expect(resolveChips(passport, { fullName: "  ", answers: {} })).toEqual([]);
  });

  it("leaves a question that names nobody exactly as it was", () => {
    const nationality = INTAKE_QUESTIONS.find((q) => q.key === "nationality")!;

    expect(resolveChips(nationality, nobody)).toEqual(nationality.chips);
  });
});

/**
 * The residence question asks for a city, and until now it offered five
 * Nigerian ones to everybody. A traveller who has just said they live in
 * Ghana being shown Lagos, Abuja and Kano has been asked a question
 * about somebody else — and the country they answered is sitting one
 * question earlier in the same rail.
 */
describe("resolveChips for the residence question", () => {
  const residence = INTAKE_QUESTIONS.find((q) => q.key === "residence")!;
  const cities = (answers: Record<string, string>) =>
    resolveChips(residence, { fullName: "Adaeze Okonkwo", answers }).map(
      (chip) => chip.value
    );

  it("offers the cities of the country the traveller just named", () => {
    expect(cities({ residence_country: "Ghana" })).toContain("Accra");
    expect(cities({ residence_country: "Kenya" })).toContain("Nairobi");
  });

  it("does not offer another country's cities", () => {
    expect(cities({ residence_country: "Ghana" })).not.toContain("Lagos");
  });

  it("still offers the Nigerian cities to a traveller in Nigeria", () => {
    // The behaviour that was always right, kept.
    expect(cities({ residence_country: "Nigeria" })).toEqual([
      "Lagos",
      "Abuja",
      "Port Harcourt",
      "Kano",
      "Ibadan",
    ]);
  });

  /**
   * Two ways to arrive here, one outcome. A traveller can type a country
   * this product does not list — Nigerians apply from Dubai and London
   * every day — and an intake recorded before the `residence_country`
   * question existed carries no country at all. Neither is a reason to
   * guess, and free text answers the question either way.
   */
  it("offers nothing when the country is one it has no cities for", () => {
    expect(cities({ residence_country: "United Arab Emirates" })).toEqual([]);
  });

  it("offers nothing when no country has been answered", () => {
    expect(cities({})).toEqual([]);
  });
});

/**
 * The budget bands were naira, in all eight languages, for everyone. The
 * fix cannot be to translate the money the way the labels are
 * translated: `applies_when` rules are a membership test on the stored
 * value, so a rule written against a naira band would silently stop
 * matching every traveller outside Nigeria — the hedge path, which shows
 * a document and says we are unsure, for a question we did have an
 * answer to. So the value stays canonical and only the label is local.
 */
describe("resolveChips for the budget question", () => {
  const budget = INTAKE_QUESTIONS.find((q) => q.key === "budget")!;
  const resolve = (residence_country?: string) =>
    resolveChips(budget, {
      fullName: "Adaeze Okonkwo",
      answers: residence_country ? { residence_country } : {},
    });

  const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "Cameroon"];

  it("stores the same value whatever country the traveller lives in", () => {
    const canonical = resolve().map((chip) => chip.value);

    for (const country of COUNTRIES) {
      expect(resolve(country).map((chip) => chip.value)).toEqual(canonical);
    }
  });

  it("shows each traveller a band in their own money", () => {
    expect(resolve("Nigeria")[0].label.en).toContain("₦");
    expect(resolve("Ghana")[0].label.en).toContain("₵");
    expect(resolve("Kenya")[0].label.en).toContain("KSh");
    expect(resolve("South Africa")[0].label.en).toContain("R");
    expect(resolve("Cameroon")[0].label.en).toContain("CFA");
  });

  it("keeps the naira bands a Nigerian traveller already saw", () => {
    // The local wording is not new copy for Nigeria — it is the copy
    // that was hardcoded for everybody, moved to where it belongs.
    expect(resolve("Nigeria").map((chip) => chip.label.en)).toEqual([
      "Under ₦2 million",
      "₦2–4 million",
      "₦4–8 million",
      "Over ₦8 million",
      "Not sure yet",
    ]);
  });

  it("falls back to the canonical bands when the country is unlisted", () => {
    // Not naira. A traveller in Dubai reading a naira band is being
    // shown somebody else's money as if it were theirs.
    for (const chip of resolve("United Arab Emirates")) {
      expect(chip.label.en).not.toContain("₦");
    }
    expect(resolve("United Arab Emirates")[0].label.en).toContain("US$");
  });

  it("labels every band in every language, for every country", () => {
    for (const country of [...COUNTRIES, undefined]) {
      for (const chip of resolve(country)) {
        for (const locale of LOCALES) {
          expect(chip.label[locale.code]).toBeTruthy();
        }
      }
    }
  });
});
