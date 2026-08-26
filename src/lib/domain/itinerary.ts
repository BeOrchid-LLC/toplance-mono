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

/**
 * Whatever shape a generated itinerary lands in, show the parts that
 * read as prose and skip the rest — never invent a section an empty
 * payload does not have.
 */
export function itinerarySections(payload: unknown): { label: string; text: string }[] {
  if (!payload || typeof payload !== "object") return [];
  return Object.entries(payload as Record<string, unknown>).flatMap(
    ([key, value]) => {
      const text = Array.isArray(value)
        ? value.filter((v) => typeof v === "string").join(" · ")
        : typeof value === "string"
          ? value
          : null;
      if (!text) return [];
      const label = key.replace(/[_-]+/g, " ");
      return [{ label: label[0].toUpperCase() + label.slice(1), text }];
    }
  );
}
