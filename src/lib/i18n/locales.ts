/**
 * The languages the interface itself speaks.
 *
 * The set now maps cleanly onto the five origin nationalities in
 * `NATIONALITY_ISO` (`src/lib/domain/corridors.ts`): Nigeria speaks Hausa,
 * Yoruba and Igbo; Ghana speaks Twi; Kenya speaks Swahili; South Africa
 * speaks isiZulu; and Cameroon speaks French. Portuguese and Arabic remain
 * the two forward-looking corridor languages — lusophone Africa and the
 * Gulf — that are not yet an origin nationality here. Every string in
 * `HERO` and `INTAKE_QUESTIONS` is a `Record<Locale, string>`, so adding a
 * code here is a compile error until that language is actually written.
 * That is deliberate: a locale in the menu that falls back to English is
 * worse than one that is not offered, because the reader has already told
 * us they cannot read it.
 *
 * NEEDS NATIVE REVIEW before launch. The four added on 2026-09-05, and the
 * two (`tw`, `zu`) added after them, were translated in-house from the
 * English, like the `slots` strings before them; only the original English
 * is client-supplied copy.
 */
export const LOCALES = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "ha", label: "Hausa", native: "Hausa", dir: "ltr" },
  { code: "yo", label: "Yoruba", native: "Yorùbá", dir: "ltr" },
  { code: "ig", label: "Igbo", native: "Ìgbò", dir: "ltr" },
  { code: "fr", label: "French", native: "Français", dir: "ltr" },
  { code: "pt", label: "Portuguese", native: "Português", dir: "ltr" },
  { code: "sw", label: "Swahili", native: "Kiswahili", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
  { code: "tw", label: "Twi", native: "Twi", dir: "ltr" },
  { code: "zu", label: "isiZulu", native: "isiZulu", dir: "ltr" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && LOCALES.some((l) => l.code === value);
}

/**
 * Which way the page runs.
 *
 * Arabic is the first right-to-left language here, and `dir` on `<html>`
 * is what makes the layout follow it: the styles are written in logical
 * properties (`ms-`, `pe-`, `start-`), which mirror themselves off this
 * attribute and would otherwise stay pinned to the left.
 */
export function dirOf(locale: Locale): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === locale)?.dir ?? "ltr";
}
