import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  DESTINATION_ISO,
  LIVE_CORRIDORS,
  NATIONALITY_ISO,
  PURPOSE_ISO,
  PURPOSES,
  corridorMrz,
  countryFromIso2,
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
/**
 * The live set as actually exported from a working database, written by
 * `npm run corridors:export` beside the SQL it describes.
 *
 * This used to parse `seed.sql` with a regex. That stopped telling the
 * truth once corridors were *drafted* and approved rather than
 * hand-written: China was approved through the review gate, lived in the
 * database, and appeared in no seed file — so the assertion passed while
 * the board said "Soon" for a corridor we serve. A generated manifest
 * cannot silently match nothing, which is what the guard below was
 * defending against.
 */
const liveCorridors: { nationalityIso: string; destinationIso: string; purpose: string }[] =
  JSON.parse(readFileSync(new URL("../db/corridors.live.json", import.meta.url), "utf8"));

const key = (c: { nationalityIso: string; destinationIso: string; purpose: string }) =>
  `${c.nationalityIso}->${c.destinationIso}:${c.purpose}`;

/**
 * A destination on the menu that no live corridor serves, found rather
 * than named.
 *
 * This assertion has gone stale twice. It was `jp`, which was approved;
 * it was then `us`, picked because it was "obviously" unserved, and that
 * was approved too. Naming a destination here asserts the roadmap, not
 * the behaviour — so the destination is derived from the same export
 * `LIVE_CORRIDORS` is checked against, and the test survives the next
 * approval batch.
 */
const unserved = Object.keys(DESTINATION_ISO).find(
  (name) =>
    !liveCorridors.some((c) => c.destinationIso === DESTINATION_ISO[name])
);

if (!unserved) {
  // Every destination on the menu is served — a good problem, and one
  // that makes the two assertions below meaningless rather than wrong.
  throw new Error(
    "No unserved destination left in DESTINATION_ISO; rewrite the " +
      "gap assertions in this file rather than deleting them."
  );
}

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
  it("finds corridors in the export to compare against", () => {
    // A manifest that came back empty would make every assertion below
    // vacuously true.
    expect(liveCorridors.length).toBeGreaterThan(0);
  });

  it("matches the corridors the database actually serves live", () => {
    // The declaration and the export are two hands writing the same
    // fact. This is the only thing keeping them in agreement.
    expect(LIVE_CORRIDORS.map(key).sort()).toEqual(
      liveCorridors.map(key).sort()
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
    // One per early return in `isCorridorLive`: an unmapped nationality,
    // an unmapped destination, an unmapped purpose. Each is a name a
    // caller can genuinely produce — the intake agent is a model — and
    // none of them may throw on the way to "not live".
    expect(isCorridorLive("Senegal", "United Kingdom", "Work")).toBe(false);
    expect(isCorridorLive("Nigeria", "Iceland", "Work")).toBe(false);
    expect(isCorridorLive("Nigeria", "United Kingdom", "Pilgrimage")).toBe(false);
  });

  it("is false for a destination we recognise but do not serve", () => {
    // Not live for any purpose — the state the dead-end screen exists
    // for. See `unserved` above for why the destination is derived.
    for (const purpose of PURPOSES) {
      expect(isCorridorLive("Nigeria", unserved, purpose)).toBe(false);
    }
  });
});

describe("livePurposesFor", () => {
  it("lists the purposes a corridor is actually built for", () => {
    expect(livePurposesFor("Nigeria", "Canada")).toEqual(["Study"]);
    // Ordered by `PURPOSES`, not by the corridor table — the UK is
    // curated for relocation, study and work, and reads back in the
    // order the intake agent offered them.
    expect(livePurposesFor("Nigeria", "United Kingdom")).toEqual([
      "Work",
      "Study",
      "Relocation",
    ]);
  });

  it("is empty for a destination nobody is served for yet", () => {
    expect(livePurposesFor("Nigeria", unserved)).toEqual([]);
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
    // Derived from the export rather than restated, for the same reason
    // `liveNationalities` is below: a hand-written list here is a third
    // copy of the live set, and it goes stale on every approval batch —
    // which is how this assertion came to name five destinations while
    // the engine served eighteen. The derivation is not circular: it
    // reaches the names through the manifest and `countryFromIso2`,
    // where the function under test walks `DESTINATION_ISO` against
    // `LIVE_CORRIDORS`.
    const expected = [
      ...new Set(
        liveCorridors
          .filter((c) => c.nationalityIso === NATIONALITY_ISO.Nigeria)
          .map((c) => countryFromIso2(c.destinationIso)?.name)
      ),
    ];

    // A destination whose alpha-3 is missing drops out of `BY_ISO2`
    // entirely, so an undefined here is a real gap in the maps, not a
    // quirk of the derivation.
    expect(expected).not.toContain(undefined);
    expect(liveDestinationsFor("Nigeria").sort()).toEqual(expected.sort());
  });

  it("names each destination once, however many purposes it serves", () => {
    // Singapore is curated for six purposes and South Africa for six
    // more; the picker must offer each of them one row.
    const destinations = liveDestinationsFor("Nigeria");

    expect(new Set(destinations).size).toBe(destinations.length);
    expect(destinations).toContain("Singapore");
    expect(destinations).toContain("United Kingdom");
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

describe("business as a purpose", () => {
  it("is offered by the intake agent and maps to the enum value", () => {
    // The agent reads `PURPOSE_ISO` for what it will accept, so a
    // purpose absent here is one a traveller cannot express at all.
    expect(PURPOSE_ISO.Business).toBe("business");
    expect(PURPOSES).toContain("Business");
  });

  it("is offered next to Work rather than beside Tourism", () => {
    // Travellers here are sponsored by an organisation; a trip for
    // meetings belongs with employment, not with holidays.
    expect(PURPOSES.indexOf("Business")).toBe(PURPOSES.indexOf("Work") + 1);
  });

  it("keeps every purpose label mapping to a distinct code", () => {
    const codes = Object.values(PURPOSE_ISO);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

/**
 * `BY_ISO2` is built with an `if (three)` guard, so a name missing from
 * `ISO3` is not a missing alpha-3 code — the destination drops out of
 * the lookup entirely. `DESTINATION_ISO` widened from 8 to 50 while
 * `ISO3` stayed at 17, which left 34 destinations resolving to null:
 * the ops corridor heading rendered "Nigeria → IN" rather than
 * "Nigeria → India", and `corridorMrz` returned null so the traveller's
 * MRZ band vanished instead of degrading.
 *
 * Asserted over the maps themselves rather than a written-down list, so
 * widening the menu again fails here rather than in the UI.
 */
describe("every code the menus offer resolves to a country", () => {
  it.each(Object.entries(DESTINATION_ISO))(
    "resolves %s (%s) to a name and an alpha-3",
    (name, code) => {
      const country = countryFromIso2(code);
      expect(country, `${name} (${code}) has no ISO3 entry`).not.toBeNull();
      expect(country?.name).toBe(name);
      expect(country?.iso3).toMatch(/^[A-Z]{3}$/);
    }
  );

  it.each(Object.entries(NATIONALITY_ISO))(
    "resolves the %s passport (%s)",
    (name, code) => {
      expect(countryFromIso2(code), `${name} has no ISO3 entry`).not.toBeNull();
    }
  );

  it("builds an MRZ for a corridor to a newly added destination", () => {
    // India was one of the 34. A null here is the MRZ band disappearing.
    expect(corridorMrz("ng", "in", "business")).not.toBeNull();
    expect(corridorMrz("ng", "in", "business")).toContain("NGA");
    expect(corridorMrz("ng", "in", "business")).toContain("IND");
  });

  it("still refuses a code no menu offers, rather than inventing one", () => {
    // `iso3()` falls back to the first three letters for marketing copy;
    // this path must not, or an unknown `xx` prints as `XX` on a
    // traveller's own data page.
    expect(countryFromIso2("xx")).toBeNull();
    expect(corridorMrz("ng", "xx", "business")).toBeNull();
  });
});
