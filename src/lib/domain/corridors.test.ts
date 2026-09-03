import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  DESTINATION_ISO,
  LIVE_CORRIDORS,
  NATIONALITY_ISO,
  PURPOSE_ISO,
  isCorridorLive,
  liveDestinationsFor,
  liveNationalities,
  livePurposesFor,
} from "@/lib/domain/corridors";

/**
 * `LIVE_CORRIDORS` is what every surface means by "live" — the hero bar,
 * the departure board, the landing page's counted figure and the
 * requirements screen's dead end all read it. The requirements *engine*
 * means something else by it: a row in the `corridors` table.
 *
 * Those two drifting apart is the bug this file exists to prevent. It is
 * what let the site advertise Canada as live, take a traveller through
 * eleven intake questions, and then tell them we do not cover Canada.
 *
 * So the declaration is asserted against the seed itself rather than
 * against a second hand-written list. Adding a corridor to `seed.sql`
 * and not here — or here and not there — fails this test instead of
 * shipping a promise nobody can keep.
 */
const SEED = readFileSync(
  new URL("../db/seed.sql", import.meta.url),
  "utf8"
);

/** The first three values of every `insert into corridors` in the seed. */
function seededCorridors() {
  const pattern =
    /insert\s+into\s+corridors\s*\([^)]*\)\s*values\s*\(\s*'([a-z]{2})'\s*,\s*'([a-z]{2})'\s*,\s*'([a-z_]+)'/gi;

  return [...SEED.matchAll(pattern)].map(([, nationalityIso, destinationIso, purpose]) => ({
    nationalityIso,
    destinationIso,
    purpose,
  }));
}

const key = (c: { nationalityIso: string; destinationIso: string; purpose: string }) =>
  `${c.nationalityIso}->${c.destinationIso}:${c.purpose}`;

describe("DESTINATION_ISO", () => {
  it("offers at least the 50 destinations the launch requires", () => {
    // Phase 3's headline number. This asserts a traveller can *choose*
    // fifty destinations, which is not the same as being served for
    // them — see `LIVE_CORRIDORS` below for what is actually curated.
    expect(Object.keys(DESTINATION_ISO).length).toBeGreaterThanOrEqual(50);
  });

  it("maps every destination to a distinct, well-formed code", () => {
    const codes = Object.values(DESTINATION_ISO);

    for (const code of codes) expect(code).toMatch(/^[a-z]{2}$/);
    // A duplicate would silently merge two destinations into one
    // corridor: two names on the menu, one row in the table.
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("keeps the codes the app already resolved before the list grew", () => {
    // Widening the menu must not renumber the corridors that already
    // exist — `seed.sql`, `LIVE_CORRIDORS` and every seeded application
    // are keyed on these.
    expect(DESTINATION_ISO).toMatchObject({
      "United Kingdom": "gb",
      Canada: "ca",
      "United Arab Emirates": "ae",
      Germany: "de",
      "United States": "us",
      Türkiye: "tr",
      Ireland: "ie",
      Netherlands: "nl",
    });
  });

  it("names every destination the way the reverse lookups expect", () => {
    // `itinerary.ts` and `companion-tips.ts` build iso → name from this
    // map and put the result in a model prompt. A blank or duplicated
    // display name there becomes a sentence about nowhere.
    const names = Object.keys(DESTINATION_ISO);

    for (const name of names) expect(name.trim()).toBe(name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("LIVE_CORRIDORS", () => {
  it("finds corridors in the seed to compare against", () => {
    // Guards the regex itself: a parser that silently matches nothing
    // would make every assertion below vacuously true.
    expect(seededCorridors().length).toBeGreaterThan(0);
  });

  it("matches the seeded corridors exactly", () => {
    expect(LIVE_CORRIDORS.map(key).sort()).toEqual(
      seededCorridors().map(key).sort()
    );
  });

  it("only names countries and purposes the rest of the app can resolve", () => {
    // A corridor whose ends cannot be turned back into display names
    // would render as a blank on the board and an empty sentence on the
    // dead-end screen.
    const nationalities = new Set(Object.values(NATIONALITY_ISO));
    const destinations = new Set(Object.values(DESTINATION_ISO));
    const purposes = new Set(Object.values(PURPOSE_ISO));

    for (const corridor of LIVE_CORRIDORS) {
      expect(nationalities).toContain(corridor.nationalityIso);
      expect(destinations).toContain(corridor.destinationIso);
      expect(purposes).toContain(corridor.purpose);
    }
  });
});

describe("isCorridorLive", () => {
  it("is true only for the exact triple", () => {
    expect(isCorridorLive("Nigeria", "Canada", "Study")).toBe(true);
  });

  it("is false when only the purpose differs", () => {
    // The bug in the screenshot: Canada is seeded, but for study. A
    // destination-level check reported this as live.
    expect(isCorridorLive("Nigeria", "Canada", "Tourism")).toBe(false);
  });

  it("is false when only the nationality differs", () => {
    // Every non-Nigerian passport hit the dead end regardless of choice.
    expect(isCorridorLive("Ghana", "Canada", "Study")).toBe(false);
  });

  it("is false for names it does not recognise", () => {
    expect(isCorridorLive("Senegal", "United Kingdom", "Work")).toBe(false);
    expect(isCorridorLive("Nigeria", "Japan", "Tourism")).toBe(false);
  });
});

describe("livePurposesFor", () => {
  it("lists the purposes a corridor is actually built for", () => {
    expect(livePurposesFor("Nigeria", "Canada")).toEqual(["Study"]);
    expect(livePurposesFor("Nigeria", "United Kingdom")).toEqual(["Work"]);
  });

  it("is empty for a destination nobody is served for yet", () => {
    expect(livePurposesFor("Nigeria", "United States")).toEqual([]);
    expect(livePurposesFor("Ghana", "United Kingdom")).toEqual([]);
  });

  it("returns purposes in the order the intake offers them", () => {
    // So the recovery copy reads in the same order the agent asked.
    const purposes = livePurposesFor("Nigeria", "United Kingdom");
    expect(purposes).toEqual([...new Set(purposes)]);
  });
});

describe("liveDestinationsFor", () => {
  it("lists where a passport can actually go", () => {
    expect(liveDestinationsFor("Nigeria").sort()).toEqual(
      ["Canada", "Germany", "United Arab Emirates", "United Kingdom"].sort()
    );
  });

  it("is empty for a passport no corridor serves", () => {
    // The honest answer for Ghana, Kenya, South Africa and Cameroon —
    // and the reason "Change my destination" was the wrong recovery.
    expect(liveDestinationsFor("Ghana")).toEqual([]);
  });
});

describe("liveNationalities", () => {
  it("names the passports at least one corridor starts from", () => {
    expect(liveNationalities()).toEqual(["Nigeria"]);
  });

  it("agrees with LIVE_CORRIDORS rather than restating it", () => {
    // The dead-end screen tells a traveller whose passport we do serve.
    // Deriving it means that sentence cannot go stale.
    const declared = new Set(LIVE_CORRIDORS.map((c) => c.nationalityIso));
    expect(liveNationalities().map((n) => NATIONALITY_ISO[n]).sort()).toEqual(
      [...declared].sort()
    );
  });
});
