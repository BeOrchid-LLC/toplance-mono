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

/**
 * Transcribing a published visa checklist into a drafted corridor —
 * `scripts/draft-corridor.mts`.
 *
 * The full model rather than mini, and deliberately so. Every other AI
 * job here is either recoverable by the traveller (intake) or reviewed
 * before it counts (pre-check flags a human then confirms). This one
 * writes reference data that, once an owner approves it, is what every
 * traveller on the corridor is told to bring. The approval gate is the
 * real safeguard, but a draft that arrives closer to its source is a
 * gate a person can actually hold.
 */
export const CORRIDOR_DRAFT_MODEL = "gpt-5.4";

/**
 * Reading an itinerary aloud — `/api/itinerary/speech`.
 *
 * The mini speech model on purpose. Every other entry here names a model
 * that decides something; this one only pronounces a text that a person
 * has already been shown on the page, so the quality that matters is
 * how it sounds, not how well it reasons. Nothing it produces is new
 * information, and it is given no latitude to add any.
 */
export const SPEECH_MODEL = "gpt-4o-mini-tts";

/**
 * Which voice reads it. `alloy` is the neutral one — this is somebody's
 * relocation plan, not a performance.
 */
export const SPEECH_VOICE = "alloy";

export const aiEnabled = () => !!process.env.OPENAI_API_KEY;
