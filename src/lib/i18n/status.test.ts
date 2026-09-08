import { describe, expect, it } from "vitest";

import {
  DOC_STATE_VARIANT,
  INVITATION_STATUS_VARIANT,
  STATUS_VARIANT,
} from "@/lib/domain/status";
import {
  DOC_STATE_COPY,
  INVITATION_STATUS_COPY,
  STATUS_COPY,
  VERIFIED_MEANS,
} from "@/lib/i18n/status";
import { LOCALES } from "@/lib/i18n/locales";

/**
 * The words on every status pill.
 *
 * These were plain `string`s on `STATUS`, `DOC_STATE` and
 * `INVITATION_STATUS` in `@/lib/domain/status`, so a traveller who had
 * chosen Hausa still read "Under review" on their own dashboard, their
 * documents screen and their case history.
 *
 * `Record<Locale, string>` makes a *missing* language a compile error.
 * These tests cover what the type cannot: a key present but empty, and
 * the two halves drifting apart once a status is added to the enum.
 */
const MAPS = [
  ["STATUS_COPY", STATUS_COPY, STATUS_VARIANT],
  ["DOC_STATE_COPY", DOC_STATE_COPY, DOC_STATE_VARIANT],
  ["INVITATION_STATUS_COPY", INVITATION_STATUS_COPY, INVITATION_STATUS_VARIANT],
] as const;

describe("status copy", () => {
  it("says something in every language", () => {
    for (const [mapName, copy] of MAPS) {
      for (const [key, fields] of Object.entries(copy)) {
        for (const [field, record] of Object.entries(fields)) {
          for (const { code } of LOCALES) {
            const text = (record as Record<string, string>)[code];
            const where = `${mapName}.${key}.${field}.${code}`;
            expect(text, where).toBeTypeOf("string");
            expect(text.trim(), where).not.toBe("");
          }
        }
      }
    }
  });

  /**
   * Colour lives in `@/lib/domain/status` and the words live here, which
   * is what keeps a locale argument out of a module the browser bundle
   * imports. The cost of that split is two maps that can drift, so this
   * is the test that says they may not: a status with a colour and no
   * words renders a blank pill, and words with no colour do not render
   * at all.
   */
  it("covers exactly the statuses that have a colour", () => {
    for (const [mapName, copy, variant] of MAPS) {
      expect(Object.keys(copy).sort(), mapName).toEqual(Object.keys(variant).sort());
    }
  });

  /**
   * The short label is what the roster and the case-history header show,
   * where a full "Additional documents needed" would wrap a table cell.
   * A translation that ignores the distinction is not wrong, but one
   * longer than the full label means somebody filled the wrong field in.
   */
  it("keeps every short label no longer than its full one", () => {
    for (const [status, copy] of Object.entries(STATUS_COPY)) {
      for (const { code } of LOCALES) {
        expect(
          copy.short[code].length,
          `${status}.short.${code} is longer than ${status}.label.${code}`
        ).toBeLessThanOrEqual(copy.label[code].length);
      }
    }
  });

  it("leaves no interpolation placeholder in a pill", () => {
    // Nothing here is a template — a pill is a fixed word. A `{token}`
    // would mean copy was pasted in from a sentence that had one.
    for (const [, copy] of MAPS) {
      for (const fields of Object.values(copy)) {
        for (const record of Object.values(fields)) {
          for (const { code } of LOCALES) {
            expect((record as Record<string, string>)[code]).not.toMatch(/\{[a-z]+\}/i);
          }
        }
      }
    }
  });
});

/**
 * The sentence that stops a green pill from reading as a decision.
 *
 * Wording agreed with the client: verified means accepted for review,
 * never a promise of approval. It sits directly under the pill on two
 * traveller screens, so it has to hold in the language the pill is in —
 * an English disclaimer under a Hausa badge disclaims nothing.
 */
describe("VERIFIED_MEANS", () => {
  it("says something in every language", () => {
    for (const { code } of LOCALES) {
      expect(VERIFIED_MEANS[code], code).toBeTypeOf("string");
      expect(VERIFIED_MEANS[code].trim(), code).not.toBe("");
    }
  });

  /**
   * The sentence exists to explain one word — the word on the pill. If a
   * translation defines some *other* word, the reader is told what a
   * badge they are not looking at means.
   */
  it("quotes its own verified label in every language", () => {
    for (const { code } of LOCALES) {
      expect(
        VERIFIED_MEANS[code],
        `${code} does not contain its own DOC_STATE_COPY.verified label`
      ).toContain(DOC_STATE_COPY.verified.label[code]);
    }
  });
});
