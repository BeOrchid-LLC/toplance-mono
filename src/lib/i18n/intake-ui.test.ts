import { describe, expect, it } from "vitest";

import { INTAKE_UI } from "@/lib/i18n/intake-ui";
import { LOCALES } from "@/lib/i18n/locales";

/**
 * The intake grew from ten questions to more than ten when the visa
 * refusal follow-ups were added, and any copy that had baked the number
 * in would have started lying that day. Nothing does — the two strings
 * that mention a count interpolate the real one — and this is what
 * keeps it that way.
 */
describe("the intake copy", () => {
  const interpolated = new Set(["srAllAnswered", "srQuestionOf"]);

  it("never states a question count as a literal", () => {
    for (const [key, value] of Object.entries(INTAKE_UI)) {
      if (interpolated.has(key)) continue;
      if (typeof value !== "object" || value === null) continue;

      for (const locale of LOCALES) {
        const text = (value as Record<string, string>)[locale.code];
        if (typeof text !== "string") continue;
        expect(
          /\b\d+\s*(questions?|tambayoyi|ìbéèrè|ajụjụ|perguntas|maswali|أسئلة|nsɛmmisa|imibuzo)\b/i.test(
            text
          ),
          `${key}.${locale.code} states a fixed question count: "${text}"`
        ).toBe(false);
      }
    }
  });

  it("still interpolates rather than hard-coding in the two that count", () => {
    for (const locale of LOCALES) {
      expect(INTAKE_UI.srQuestionOf[locale.code]).toContain("{total}");
      expect(INTAKE_UI.srAllAnswered[locale.code]).toContain("{n}");
    }
  });
});
