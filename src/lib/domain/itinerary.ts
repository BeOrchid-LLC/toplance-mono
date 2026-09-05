import { z } from "zod";

/**
 * The shape a generated itinerary must satisfy — every value a plain
 * string or a string array, because that is exactly what
 * `itinerarySections` below knows how to render. Owned by this module
 * rather than `@/lib/ai/itinerary` so the schema and the renderer that
 * reads its output can never drift out of agreement: a key added to one
 * without the other is a type error, not a silent gap on the profile
 * page.
 */
export const itinerarySchema = z.object({
  flights_guidance: z.string(),
  airport_transfer: z.string(),
  accommodation: z.string(),
  /** Seven entries, one per day — each "Day N — ...". */
  first_seven_days: z.array(z.string()).length(7),
  local_transport: z.string(),
  emergency_and_embassy: z.string(),
  healthcare_and_insurance: z.string(),
  money_and_currency: z.string(),
  cultural_notes: z.string(),
  packing_list: z.array(z.string()),
});

export type ItineraryPayload = z.infer<typeof itinerarySchema>;

function labelFor(key: string): string {
  const label = key.replace(/[_-]+/g, " ");
  return label[0].toUpperCase() + label.slice(1);
}

/**
 * The payload's keys reduced to the strings that read as prose, in the
 * order the payload carries them — one part for a plain string, one per
 * entry for a string array, and the key dropped entirely for anything
 * else. Shared so the two renderers below can never disagree about
 * which sections exist; they differ only in how they join what is here.
 */
function proseParts(payload: unknown): { label: string; parts: string[] }[] {
  if (!payload || typeof payload !== "object") return [];
  return Object.entries(payload as Record<string, unknown>).flatMap(
    ([key, value]) => {
      if (Array.isArray(value)) {
        const parts = value.filter((v): v is string => typeof v === "string");
        return [{ label: labelFor(key), parts }];
      }
      if (typeof value === "string") return [{ label: labelFor(key), parts: [value] }];
      return [];
    }
  );
}

/**
 * Whatever shape a generated itinerary lands in, show the parts that
 * read as prose and skip the rest — never invent a section an empty
 * payload does not have.
 */
export function itinerarySections(payload: unknown): { label: string; text: string }[] {
  return proseParts(payload).flatMap(({ label, parts }) => {
    const text = parts.join(" · ");
    if (!text) return [];
    return [{ label, text }];
  });
}

/** Sentence-ending punctuation, so a voice knows to stop. */
const ENDS_A_SENTENCE = /[.!?…:;]$/;

/**
 * The same itinerary, written to be heard.
 *
 * It reads out an itinerary that a person has already had generated for
 * them and can see on the page — so, like `itinerarySections`, it may
 * reorder and punctuate but never add a word the payload does not
 * contain. Nothing here goes near a model.
 *
 * It differs from the visual renderer exactly where the eye and the ear
 * differ. A " · " between the seven days is a visual device that a
 * voice reads as nothing at all, turning a week's plan into one
 * breathless sentence; here each entry is closed with a full stop
 * instead. Sections are separated by a blank line, which every
 * text-to-speech engine hears as a pause.
 *
 * Returns null when the payload has nothing sayable in it, so a caller
 * can decline to offer audio rather than synthesise silence.
 */
export function itinerarySpeechScript(payload: unknown): string | null {
  const sections = proseParts(payload).flatMap(({ label, parts }) => {
    const spoken = parts
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => (ENDS_A_SENTENCE.test(part) ? part : `${part}.`))
      .join(" ");
    if (!spoken) return [];
    return [`${label}. ${spoken}`];
  });

  return sections.length ? sections.join("\n\n") : null;
}

/**
 * How much text one speech call may carry.
 *
 * OpenAI's speech endpoint rejects an input past roughly four thousand
 * characters, and a ten-section itinerary carrying a seven-day plan and
 * a packing list can reach that. Truncating would give the travellers
 * with the fullest plans the shortest audio, and give it to them
 * silently, so the script is split and every piece is spoken.
 */
export const SPEECH_CHUNK_LIMIT = 4096;

/** Split an over-long section on sentence ends, then, if it still will not fit, on spaces. */
function splitOversized(section: string, limit: number): string[] {
  const pieces: string[] = [];
  let rest = section;

  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    // Prefer a sentence end, then a word boundary, and only cut mid-word
    // when the text offers neither — a single unbroken run past the
    // limit is not something a plan should contain, but it must still
    // be spoken rather than dropped.
    const at = Math.max(window.lastIndexOf(". "), window.lastIndexOf(" "));
    const cut = at > 0 ? at + 1 : limit;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * The spoken script, cut into pieces small enough to synthesise.
 *
 * Sections are kept whole and in order wherever they fit, so a chunk
 * boundary lands where a listener already hears a pause. Joining the
 * result back with a blank line reproduces `itinerarySpeechScript`
 * exactly, except where one section was itself too long to fit — the
 * only case in which this cuts inside a section, and it splits on a
 * sentence end when the text offers one.
 *
 * Returns an empty array when there is nothing to say.
 */
export function itinerarySpeechChunks(
  payload: unknown,
  limit: number = SPEECH_CHUNK_LIMIT
): string[] {
  const script = itinerarySpeechScript(payload);
  if (!script) return [];

  const chunks: string[] = [];
  let current = "";

  for (const section of script.split("\n\n")) {
    for (const piece of section.length > limit
      ? splitOversized(section, limit)
      : [section]) {
      const joined = current ? `${current}\n\n${piece}` : piece;
      if (joined.length <= limit) {
        current = joined;
        continue;
      }
      if (current) chunks.push(current);
      current = piece;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
