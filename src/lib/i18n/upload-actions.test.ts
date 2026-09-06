import { describe, expect, it } from "vitest";

import { UPLOAD_ACTIONS } from "@/lib/i18n/upload-actions";
import { LOCALES } from "@/lib/i18n/locales";

/**
 * What `uploadDocument` says when it refuses a file.
 *
 * These four messages were string literals in the server action, which
 * meant the one part of the product that speaks to a traveller at the
 * moment something has gone wrong spoke only English — in an interface
 * that offers ten languages and whose whole audience was chosen for not
 * being served in English by anybody else.
 *
 * `Record<Locale, string>` makes a missing language a compile error, so
 * these tests cover what the type cannot: a key present but empty, and
 * a placeholder that survived into a translation.
 */
describe("UPLOAD_ACTIONS", () => {
  const entries = Object.entries(UPLOAD_ACTIONS);

  it("says something in every language", () => {
    for (const [key] of entries) {
      for (const { code } of LOCALES) {
        const text = message[code];
        expect(text, `${key}.${code}`).toBeTypeOf("string");
        expect(text.trim(), `${key}.${code}`).not.toBe("");
      }
    }
  });

  /**
   * `tooLarge` interpolates the size limit at the call site. Every
   * locale has to carry the token, or a translated string silently drops
   * the one number the sentence exists to convey.
   */
  it("keeps the size placeholder in every translation of tooLarge", () => {
    for (const { code } of LOCALES) {
      expect(UPLOAD_ACTIONS.tooLarge[code], `tooLarge.${code}`).toContain("{size}");
    }
  });

  it("leaves no placeholder unaccounted for anywhere else", () => {
    for (const [key] of entries) {
      if (key === "tooLarge") continue;
      for (const { code } of LOCALES) {
        expect(UPLOAD_ACTIONS[key as keyof typeof UPLOAD_ACTIONS][code]).not.toMatch(
          /\{[a-z]+\}/i
        );
      }
    }
  });

  it("covers every way an upload can be refused", () => {
    // The keys `validateUpload` can return, plus the two failures that
    // are only discoverable server-side.
    expect(Object.keys(UPLOAD_ACTIONS).sort()).toEqual(
      ["empty", "notOnChecklist", "tooLarge", "uploadFailed", "unsupportedType"].sort()
    );
  });
});
