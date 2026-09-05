import { describe, expect, it } from "vitest";

import {
  SPEECH_CHUNK_LIMIT,
  itinerarySchema,
  itinerarySections,
  itinerarySpeechChunks,
  itinerarySpeechScript,
  type ItineraryPayload,
} from "@/lib/domain/itinerary";

/**
 * A payload built by hand, not by calling the model — this suite pins
 * the agreement between `itinerarySchema` (what the generator produces)
 * and `itinerarySections` (what the profile page renders), not the
 * model's obedience to either.
 */
const FULL_PAYLOAD: ItineraryPayload = {
  flights_guidance: "Book into the main international terminal; land in daylight if you can.",
  airport_transfer: "Pre-book a licensed transfer — search \"[city] airport official taxi\".",
  accommodation: "Your booked stay covers the first two weeks; extend from there.",
  first_seven_days: [
    "Day 1 — Arrive, settle in, rest.",
    "Day 2 — Register your address, as required.",
    "Day 3 — Open a local bank account.",
    "Day 4 — Buy a local SIM and set up transport.",
    "Day 5 — Locate the nearest embassy and clinic.",
    "Day 6 — Explore your neighbourhood on foot.",
    "Day 7 — Rest and plan week two.",
  ],
  local_transport: "A prepaid transit card covers buses and trains.",
  emergency_and_embassy: "Search \"Nigerian embassy [city]\" and save the number.",
  healthcare_and_insurance: "Register with a local clinic in your first week.",
  money_and_currency: "Carry a small amount of cash; card acceptance is high.",
  cultural_notes: "Tipping is not expected in most settings.",
  packing_list: ["Passport and copies", "Weather-appropriate clothing", "Adapter plug"],
};

// Type-level: `ItineraryPayload` (the schema's inferred type) must be
// assignable to what `itinerarySections` accepts — `unknown` today, so
// this compiles as long as the parameter stays that wide or wider.
const _typeCheck: Parameters<typeof itinerarySections>[0] = FULL_PAYLOAD;
void _typeCheck;

describe("itinerarySections", () => {
  it("parses cleanly against the schema it renders against", () => {
    expect(itinerarySchema.safeParse(FULL_PAYLOAD).success).toBe(true);
  });

  it("renders one section per key in a full payload", () => {
    const sections = itinerarySections(FULL_PAYLOAD);
    expect(sections).toHaveLength(Object.keys(FULL_PAYLOAD).length);
  });

  it("titles each section from its key", () => {
    const sections = itinerarySections(FULL_PAYLOAD);
    expect(sections.map((s) => s.label)).toEqual(
      expect.arrayContaining([
        "Flights guidance",
        "Airport transfer",
        "Accommodation",
        "First seven days",
        "Local transport",
        "Emergency and embassy",
        "Healthcare and insurance",
        "Money and currency",
        "Cultural notes",
        "Packing list",
      ])
    );
  });

  it("renders the seven-day plan as a joined list, not raw JSON", () => {
    const section = itinerarySections(FULL_PAYLOAD).find(
      (s) => s.label === "First seven days"
    );
    expect(section?.text).toBe(FULL_PAYLOAD.first_seven_days.join(" · "));
  });

  it("renders a string array section by joining its entries", () => {
    const section = itinerarySections(FULL_PAYLOAD).find(
      (s) => s.label === "Packing list"
    );
    expect(section?.text).toBe(FULL_PAYLOAD.packing_list.join(" · "));
  });

  it("produces nothing for an empty payload", () => {
    expect(itinerarySections({})).toEqual([]);
  });

  it("produces nothing for null", () => {
    expect(itinerarySections(null)).toEqual([]);
  });

  it("produces nothing for a non-object payload", () => {
    expect(itinerarySections("not an itinerary")).toEqual([]);
    expect(itinerarySections(42)).toEqual([]);
  });

  it("skips keys whose value is neither a string nor a string array", () => {
    expect(
      itinerarySections({
        flights_guidance: "Fine.",
        packing_list: null,
        cultural_notes: { nested: "garbage" },
        local_transport: 7,
      })
    ).toEqual([{ label: "Flights guidance", text: "Fine." }]);
  });

  it("skips a string array whose entries are not strings", () => {
    expect(itinerarySections({ packing_list: [1, 2, 3] })).toEqual([]);
  });

  it("skips an empty string and an empty array", () => {
    expect(
      itinerarySections({ flights_guidance: "", packing_list: [] })
    ).toEqual([]);
  });
});

/**
 * The spoken form of the same payload.
 *
 * `itinerarySections` renders for the eye and `itinerarySpeechScript`
 * for the ear, so they differ exactly where that distinction bites: a
 * " · " separator is a visual device that a voice reads as nothing at
 * all, running seven days into one breathless sentence. Both draw from
 * the same payload and neither may add a word that is not in it.
 */
describe("itinerarySpeechScript", () => {
  it("reads each section as its heading followed by its text", () => {
    const script = itinerarySpeechScript(FULL_PAYLOAD);
    expect(script).toContain(
      "Flights guidance. Book into the main international terminal; land in daylight if you can."
    );
  });

  it("covers every section the page renders", () => {
    const script = itinerarySpeechScript(FULL_PAYLOAD)!;
    for (const { label } of itinerarySections(FULL_PAYLOAD)) {
      expect(script).toContain(label);
    }
  });

  it("reads the seven-day plan as sentences, never as a interpunct-joined run-on", () => {
    const script = itinerarySpeechScript(FULL_PAYLOAD)!;
    expect(script).not.toContain(" · ");
    expect(script).toContain(
      "First seven days. Day 1 — Arrive, settle in, rest. Day 2 — Register your address, as required."
    );
  });

  it("terminates a list entry that carries no punctuation of its own", () => {
    // Without this a voice reads "Passport and copies weather-appropriate
    // clothing adapter plug" as one item.
    const script = itinerarySpeechScript(FULL_PAYLOAD)!;
    expect(script).toContain(
      "Packing list. Passport and copies. Weather-appropriate clothing. Adapter plug."
    );
  });

  it("does not double the punctuation of an entry that already ends in one", () => {
    const script = itinerarySpeechScript({
      cultural_notes: "Tipping is not expected.",
      flights_guidance: "Land in daylight!",
      accommodation: "Is the stay booked?",
    })!;
    expect(script).not.toMatch(/[.!?]\./);
  });

  it("separates sections so a voice pauses between them", () => {
    const script = itinerarySpeechScript({
      flights_guidance: "Land in daylight.",
      accommodation: "Two weeks are covered.",
    });
    expect(script).toBe(
      "Flights guidance. Land in daylight.\n\nAccommodation. Two weeks are covered."
    );
  });

  it("has nothing to say for an empty payload", () => {
    expect(itinerarySpeechScript({})).toBeNull();
  });

  it("has nothing to say for null or a non-object", () => {
    expect(itinerarySpeechScript(null)).toBeNull();
    expect(itinerarySpeechScript("not an itinerary")).toBeNull();
    expect(itinerarySpeechScript(42)).toBeNull();
  });

  it("skips what the renderer skips, rather than voicing garbage", () => {
    const script = itinerarySpeechScript({
      flights_guidance: "Fine.",
      packing_list: null,
      cultural_notes: { nested: "garbage" },
      local_transport: 7,
    });
    expect(script).toBe("Flights guidance. Fine.");
  });

  it("skips a string array whose entries are not strings", () => {
    expect(itinerarySpeechScript({ packing_list: [1, 2, 3] })).toBeNull();
  });
});

/**
 * Chunking exists for one reason: the speech API takes at most a few
 * thousand characters per call, and a ten-section itinerary with a
 * seven-day plan and a packing list can pass that. Truncating would
 * hand the richest plans the shortest audio, and silently — so the
 * script is split instead, and every chunk is spoken.
 */
describe("itinerarySpeechChunks", () => {
  const longSection = (n: number) => "A".repeat(n);

  it("returns the whole script as one chunk when it fits", () => {
    expect(itinerarySpeechChunks(FULL_PAYLOAD)).toEqual([
      itinerarySpeechScript(FULL_PAYLOAD),
    ]);
  });

  it("never returns a chunk longer than the limit", () => {
    const payload = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`section_${i}`, longSection(500)])
    );
    for (const chunk of itinerarySpeechChunks(payload)) {
      expect(chunk.length).toBeLessThanOrEqual(SPEECH_CHUNK_LIMIT);
    }
  });

  it("splits between sections, losing nothing", () => {
    const payload = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`section_${i}`, longSection(500)])
    );
    const chunks = itinerarySpeechChunks(payload);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("\n\n")).toBe(itinerarySpeechScript(payload));
  });

  it("splits a single oversized section rather than dropping it", () => {
    // One section longer than the limit has no section boundary to break
    // on. It still has to be spoken.
    const payload = { flights_guidance: `${longSection(9000)}.` };
    const chunks = itinerarySpeechChunks(payload);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(SPEECH_CHUNK_LIMIT);
    }
    expect(chunks.join("").replace(/\s+/g, "")).toContain(longSection(9000));
  });

  it("has nothing to speak for a payload with nothing sayable", () => {
    expect(itinerarySpeechChunks({})).toEqual([]);
    expect(itinerarySpeechChunks(null)).toEqual([]);
  });
});
