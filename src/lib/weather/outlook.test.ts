import { describe, expect, it } from "vitest";

import { capitalFor, toOutlook } from "@/lib/weather/outlook";

/**
 * The shape below was read off a live
 * `api.open-meteo.com/v1/forecast` response on 2026-09-05, trimmed to
 * the fields this mapper reads.
 */
const response = (over: Record<string, unknown> = {}) => ({
  latitude: 51.5,
  longitude: -0.13,
  timezone: "GMT",
  daily_units: { temperature_2m_max: "°C", temperature_2m_min: "°C" },
  daily: {
    time: [
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ],
    temperature_2m_max: [21.4, 22.8, 19.1, 17.6, 18.2, 20.0, 23.3],
    temperature_2m_min: [12.1, 13.4, 11.8, 10.2, 9.9, 11.5, 14.0],
  },
  ...over,
});

describe("capitalFor", () => {
  it("gives the curated city and coordinates for a covered destination", () => {
    const capital = capitalFor("gb");
    expect(capital).not.toBeNull();
    expect(capital!.city).toBe("London");
    expect(capital!.latitude).toBeCloseTo(51.5, 0);
  });

  it("is case-insensitive on the destination code", () => {
    expect(capitalFor("DE")).toEqual(capitalFor("de"));
  });

  it("has no coordinates for a destination this product does not curate", () => {
    // Deliberately not derived from a geocoding lookup. Resolving a
    // country by name returns its geographic centroid — Canada's sits in
    // the Northwest Territories, a couple of thousand kilometres from
    // anyone who has just moved to Toronto. A missing panel is honest;
    // confidently wrong weather is not.
    expect(capitalFor("fr")).toBeNull();
    expect(capitalFor("zz")).toBeNull();
  });
});

describe("toOutlook", () => {
  it("summarises the week's range from a live forecast response", () => {
    const outlook = toOutlook(response());

    expect(outlook).not.toBeNull();
    expect(outlook!.highC).toBe(23);
    expect(outlook!.lowC).toBe(10);
    expect(outlook!.days).toBe(7);
  });

  it("reports the unit the source used rather than assuming celsius", () => {
    const outlook = toOutlook(response());
    expect(outlook!.unit).toBe("°C");
  });

  it("rejects a response with no daily block", () => {
    expect(toOutlook({ latitude: 51.5 })).toBeNull();
    expect(toOutlook(null)).toBeNull();
  });

  it("rejects a response whose temperature arrays are empty", () => {
    const outlook = toOutlook(
      response({
        daily: { time: [], temperature_2m_max: [], temperature_2m_min: [] },
      })
    );
    expect(outlook).toBeNull();
  });

  it("ignores gaps rather than letting a null collapse the range to zero", () => {
    // Open-Meteo sends null for a day it has no value for. Treated as a
    // number that would read as a 0°C low in the middle of a warm week.
    const outlook = toOutlook(
      response({
        daily: {
          time: ["2026-09-05", "2026-09-06"],
          temperature_2m_max: [21.4, null],
          temperature_2m_min: [null, 13.4],
        },
      })
    );

    expect(outlook!.highC).toBe(21);
    expect(outlook!.lowC).toBe(13);
    expect(outlook!.days).toBe(2);
  });
});
