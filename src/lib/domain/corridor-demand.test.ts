import { describe, expect, it } from "vitest";

import {
  rankRequestedRoutes,
  routeKey,
  routeName,
  type RequestedEvent,
} from "@/lib/domain/corridor-demand";

/** One `analytics_events` group, as the SQL rollup hands it over. */
function asked(props: unknown, count = 1): RequestedEvent {
  return { props, count };
}

/** The coded shape — `resolveRuleSet` found nothing for a mapped triple. */
const coded = (nationalityIso: string, destinationIso: string, purpose: string) =>
  asked({ nationalityIso, destinationIso, purpose });

/** The free-text shape — an answer no chip matched. */
const typed = (nationality: string, destination: string, purpose: string) =>
  asked({ nationality, destination, purpose });

describe("routeKey", () => {
  it("is the same string whichever end builds it", () => {
    // The data layer keys live corridors with this, and the ranking keys
    // requests with it. If the two ever formatted differently, every
    // route would look unbuilt and the panel would recommend curating
    // corridors that already exist.
    expect(routeKey("gh", "ca", "study")).toBe(routeKey("GH", "Ca", "Study"));
  });

  it("keeps the three parts apart", () => {
    // A naive join would let "g|hca" and "gh|ca" collide.
    expect(routeKey("g", "hca", "study")).not.toBe(routeKey("gh", "ca", "study"));
  });
});

describe("rankRequestedRoutes", () => {
  it("has nothing to show before the first traveller asks", () => {
    expect(rankRequestedRoutes([], new Set(), 6)).toEqual([]);
  });

  it("puts the most-asked-for route first", () => {
    const ranked = rankRequestedRoutes(
      [coded("gh", "ca", "study"), asked({ nationalityIso: "ke", destinationIso: "gb", purpose: "work" }, 9)],
      new Set(),
      6
    );

    expect(ranked.map((r) => r.count)).toEqual([9, 1]);
    expect(ranked[0].nationality).toBe("ke");
  });

  it("counts the two recorded shapes as one route", () => {
    // `intake.ts` emits this event from two branches: a mapped triple
    // records ISO codes, an unmatched answer records what the traveller
    // typed. Left unnormalised, Ghana→Canada would sit on the list twice
    // at half its real weight and lose to a route nobody wants more.
    const ranked = rankRequestedRoutes(
      [coded("gh", "ca", "study"), typed("Ghana", "Canada", "Study")],
      new Set(),
      6
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0].count).toBe(2);
    expect(ranked[0]).toMatchObject({
      nationality: "gh",
      destination: "ca",
      purpose: "study",
    });
  });

  it("drops a route somebody has since curated", () => {
    // The whole point of the panel is what to build next. A corridor
    // approved last week is not a gap any more, and leaving it top of
    // the list sends a reviewer to build something that already serves
    // travellers.
    const ranked = rankRequestedRoutes(
      [coded("gh", "ca", "study"), coded("ke", "gb", "work")],
      new Set([routeKey("gh", "ca", "study")]),
      6
    );

    expect(ranked.map((r) => r.destination)).toEqual(["gb"]);
  });

  it("keeps an answer no country list could map, under what was typed", () => {
    // "Senegal" is real demand even though nothing maps it. Dropping
    // unmappable answers would silently hide exactly the corridors this
    // product does not know about yet — the ones worth hearing about.
    const ranked = rankRequestedRoutes([typed("Senegal", "Canada", "Work")], new Set(), 6);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ nationality: "Senegal", destination: "ca" });
  });

  it("orders ties by key so the page does not reshuffle itself", () => {
    // Same discipline as `topCounts`: Postgres may return groups in any
    // order it likes, and a list that reorders between two reloads reads
    // as a page somebody changed.
    const rows = [coded("ke", "gb", "work"), coded("gh", "ca", "study")];

    expect(rankRequestedRoutes(rows, new Set(), 6).map((r) => r.key)).toEqual(
      rankRequestedRoutes([...rows].reverse(), new Set(), 6).map((r) => r.key)
    );
  });

  it("skips a row that names no route", () => {
    // `props` is `jsonb`, so it is `unknown` at this boundary — a null,
    // a string, or a triple with a blank answer must not reach the page
    // as a route called "undefined".
    const ranked = rankRequestedRoutes(
      [
        asked(null),
        asked("nonsense"),
        asked({ nationalityIso: "gh" }),
        typed("Ghana", "", "Study"),
        coded("gh", "ca", "study"),
      ],
      new Set(),
      6
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0].destination).toBe("ca");
  });

  it("returns no more than the limit asks for", () => {
    const ranked = rankRequestedRoutes(
      [coded("gh", "ca", "study"), coded("ke", "gb", "work"), coded("cm", "fr", "work")],
      new Set(),
      2
    );

    expect(ranked).toHaveLength(2);
  });
});

describe("routeName", () => {
  const route = (nationality: string, destination: string, purpose = "work") =>
    rankRequestedRoutes([asked({ nationality, destination, purpose })], new Set(), 1)[0];

  it("names a mapped code the way the rest of the console does", () => {
    expect(routeName(route("gh", "gb"))).toEqual({
      from: "Ghana",
      to: "United Kingdom",
      purpose: "work",
    });
  });

  it("keeps an unmapped answer as the traveller wrote it", () => {
    // Not "SENEGAL". This is a person's own word for their country, and
    // shouting it back reads as a formatting bug rather than as the gap
    // in our coverage that it actually is.
    expect(routeName(route("Senegal", "Canada")).from).toBe("Senegal");
  });

  it("falls back to the bare code when nothing maps it", () => {
    // A two-letter answer is a code, not a name — upper-casing it reads
    // as a code, and inventing a country for it would be worse.
    expect(routeName(route("zz", "gb")).from).toBe("ZZ");
  });
});
