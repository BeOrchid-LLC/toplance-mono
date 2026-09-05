import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOutlook } from "@/lib/weather/fetch-outlook";

const BODY = JSON.stringify({
  daily_units: { temperature_2m_max: "°C" },
  daily: {
    time: ["2026-09-05", "2026-09-06"],
    temperature_2m_max: [21.4, 22.8],
    temperature_2m_min: [12.1, 13.4],
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOutlook", () => {
  it("returns the week's range and the city it was read for", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(BODY, { status: 200 })));

    const result = await fetchOutlook("gb");
    expect(result).not.toBeNull();
    expect(result!.city).toBe("London");
    expect(result!.outlook.highC).toBe(23);
  });

  it("asks the source for the curated capital's coordinates", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        seen.push(String(input));
        return new Response(BODY, { status: 200 });
      })
    );

    await fetchOutlook("de");

    expect(seen[0]).toContain("latitude=52.52");
    expect(seen[0]).toContain("longitude=13.405");
  });

  it("makes no request at all for a destination with no curated capital", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchOutlook("fr")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns nothing rather than throwing when the source is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(fetchOutlook("gb")).resolves.toBeNull();
  });

  it("returns nothing when the source answers with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    await expect(fetchOutlook("gb")).resolves.toBeNull();
  });

  it("returns nothing when the source answers with something unreadable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>maintenance</html>", { status: 200 }))
    );
    await expect(fetchOutlook("gb")).resolves.toBeNull();
  });
});
