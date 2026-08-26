/**
 * Which model does which job, in one place — swapping a model is a
 * one-line edit here rather than a search across every feature that
 * calls one.
 *
 * `aiEnabled` is the single switch every AI feature degrades on. Without
 * a key the intake agent falls back to its scripted question list, which
 * is a complete product on its own: a traveller on a local checkout, or
 * on an environment whose key has been pulled, still finishes intake and
 * still gets a checklist.
 */
export const INTAKE_MODEL = "gpt-5.4-mini";
export const PRECHECK_MODEL = "gpt-5.4-mini";
export const ITINERARY_MODEL = "gpt-5.4";
export const REALTIME_MODEL = "gpt-realtime-mini";
/**
 * Local orientation tips for the post-arrival companion — plain
 * markdown, no structured output, and lower stakes than the itinerary
 * (no first-seven-days plan, no packing list). Its own export rather
 * than reusing `PRECHECK_MODEL` even though the value is identical
 * today: the two jobs have nothing to do with each other, and giving
 * "which model does the companion's tips" its own name is what lets it
 * move independently later without touching an unrelated document
 * pre-check.
 */
export const COMPANION_MODEL = "gpt-5.4-mini";

export const aiEnabled = () => !!process.env.OPENAI_API_KEY;
