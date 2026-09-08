import { describe, expect, it } from "vitest";

import { ACCEPTED_FORMATS, MAX_UPLOAD_LABEL } from "@/lib/domain/uploads";
import { UPLOADS } from "@/lib/i18n/uploads";
import { fill } from "@/lib/i18n/fill";
import { LOCALES } from "@/lib/i18n/locales";

/**
 * The guidance above the upload table.
 *
 * It was one English template literal in `@/lib/domain/uploads`, printed
 * on the screen the whole product funnels into, in an interface that
 * offers ten languages. `Record<Locale, string>` makes a missing
 * language a compile error; these tests cover what the type cannot.
 */
describe("UPLOADS", () => {
  it("says something in every language", () => {
    for (const [key, record] of Object.entries(UPLOADS)) {
      for (const { code } of LOCALES) {
        const text = record[code];
        expect(text, `${key}.${code}`).toBeTypeOf("string");
        expect(text.trim(), `${key}.${code}`).not.toBe("");
      }
    }
  });

  /**
   * Both tokens carry a fact the sentence exists to deliver — which
   * formats are accepted, and how large a file may be. A translation
   * that drops one reads fine and tells the traveller nothing, then
   * costs them the round trip this paragraph was written to prevent.
   */
  it("keeps both placeholders in every translation of the guidance", () => {
    for (const { code } of LOCALES) {
      expect(UPLOADS.guidance[code], `guidance.${code}`).toContain("{formats}");
      expect(UPLOADS.guidance[code], `guidance.${code}`).toContain("{size}");
    }
  });

  /**
   * The drift guard, and the reason the format tokens stayed in
   * `@/lib/domain/uploads` while the sentence around them moved here.
   *
   * `ACCEPT` filters the picker and `isAcceptedType` polices the server;
   * this list is what the traveller is *told*. Ten hand-written lists
   * are ten chances to promise a format the server refuses — so each
   * locale may translate the conjunction and add its own noun prefixes,
   * and may not touch the names.
   */
  it("names every accepted format in every language", () => {
    for (const { code } of LOCALES) {
      for (const format of ACCEPTED_FORMATS) {
        expect(
          UPLOADS.acceptedFormats[code],
          `acceptedFormats.${code} is missing ${format}`
        ).toContain(format);
      }
    }
  });

  it("promises no format the server would refuse", () => {
    // The other direction: a translation that helpfully adds "TIFF"
    // would advertise an upload `validateUpload` sends straight back.
    const known = new Set<string>(ACCEPTED_FORMATS);
    for (const { code } of LOCALES) {
      const named = UPLOADS.acceptedFormats[code].match(/\b[A-Z]{3,4}\b/g) ?? [];
      for (const token of named) {
        expect(known.has(token), `acceptedFormats.${code} names ${token}`).toBe(true);
      }
    }
  });

  it("leaves no placeholder behind once filled", () => {
    for (const { code } of LOCALES) {
      const rendered = fill(UPLOADS.guidance[code], {
        formats: UPLOADS.acceptedFormats[code],
        size: MAX_UPLOAD_LABEL,
      });
      expect(rendered, `guidance.${code}`).not.toMatch(/\{[a-z]+\}/i);
      expect(rendered, `guidance.${code}`).toContain(MAX_UPLOAD_LABEL);
    }
  });
});
