import { describe, expect, it } from "vitest";

import {
  itinerarySchema,
  itinerarySections,
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
