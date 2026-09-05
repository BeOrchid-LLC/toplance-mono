import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAdvisories, newAdvisoryFetch } from "@/lib/safety/fetch-advisories";

const FCDO_BODY = {
  base_path: "/foreign-travel-advice/germany",
  public_updated_at: "2026-07-24T15:52:23+01:00",
  details: { change_description: "Updated information about border checks." },
};

const RSS_BODY = `<rss><channel><item>
  <title>Germany - Level 2: Exercise Increased Caution</title>
  <link>https://travel.state.gov/germany.html</link>
  <pubDate>Tue, 13 May 2025</pubDate>
</item></channel></rss>`;

/** Route each stubbed request by host, so a test says what each source did. */
function stubFetch(
  handler: (url: string) => { ok: boolean; body: string } | "throw"
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const result = handler(url);
      if (result === "throw") throw new Error("network down");
      return new Response(result.body, { status: result.ok ? 200 : 404 });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAdvisories", () => {
  it("returns both sources when both answer", async () => {
    stubFetch((url) =>
      url.includes("gov.uk")
        ? { ok: true, body: JSON.stringify(FCDO_BODY) }
        : { ok: true, body: RSS_BODY }
    );

    const advisories = await fetchAdvisories("de");
    expect(advisories.map((a) => a.source).sort()).toEqual([
      "UK FCDO",
      "US State Department",
    ]);
  });

  it("returns the State Department advisory alone for the UK", async () => {
    // No FCDO page exists for the UK, so no request is made for one.
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      // The only request made is the feed one; asserted here as well as
      // by the call count below, so a regression names itself.
      expect(String(input)).toContain("travel.state.gov");
      return new Response(
          `<rss><channel><item>
            <title>United Kingdom - Level 2: Exercise Increased Caution</title>
            <link>https://travel.state.gov/uk.html</link>
            <pubDate>Thu, 08 May 2025</pubDate>
          </item></channel></rss>`,
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchSpy);

    const advisories = await fetchAdvisories("gb");
    expect(advisories).toHaveLength(1);
    expect(advisories[0].source).toBe("US State Department");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain("gov.uk");
  });

  it("keeps the source that answered when the other fails", async () => {
    stubFetch((url) => (url.includes("gov.uk") ? "throw" : { ok: true, body: RSS_BODY }));

    const advisories = await fetchAdvisories("de");
    expect(advisories).toHaveLength(1);
    expect(advisories[0].source).toBe("US State Department");
  });

  it("returns nothing rather than throwing when every source fails", async () => {
    // This feeds a side panel. It must never be the reason the companion
    // page — whose real content is the arrival checklist — fails to render.
    stubFetch(() => "throw");
    await expect(fetchAdvisories("de")).resolves.toEqual([]);
  });

  it("ignores a source that answers with an error status", async () => {
    stubFetch((url) =>
      url.includes("gov.uk") ? { ok: false, body: "Not found" } : { ok: true, body: RSS_BODY }
    );

    const advisories = await fetchAdvisories("de");
    expect(advisories.map((a) => a.source)).toEqual(["US State Department"]);
  });

  it("ignores a source that answers with something unreadable", async () => {
    stubFetch((url) =>
      url.includes("gov.uk")
        ? { ok: true, body: "<html>maintenance</html>" }
        : { ok: true, body: RSS_BODY }
    );

    const advisories = await fetchAdvisories("de");
    expect(advisories.map((a) => a.source)).toEqual(["US State Department"]);
  });

  it("returns nothing for a destination this product does not curate", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchAdvisories("zz")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reads the shared State Department feed once per sweep", async () => {
    // The feed is a single ~1 MB document covering every country, so it
    // is the same bytes for every traveller in a batch. Fetched per
    // traveller, a full cron run pulled tens of megabytes and ran a
    // full-document regex scan for each one inside one function timeout.
    // Next's fetch cache does not cover this: the request carries an
    // `AbortSignal` and the caller is a route handler.
    stubFetch((url) =>
      url.includes("gov.uk")
        ? { ok: true, body: JSON.stringify(FCDO_BODY) }
        : { ok: true, body: RSS_BODY }
    );

    const memo = newAdvisoryFetch();
    await fetchAdvisories("de", memo);
    await fetchAdvisories("ca", memo);
    await fetchAdvisories("us", memo);

    const calls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    const feedCalls = calls.filter((url) => url.includes("travel.state.gov"));

    expect(feedCalls).toHaveLength(1);
    // The per-destination source is still read per destination — only the
    // shared document is memoised.
    expect(calls.filter((url) => url.includes("gov.uk"))).toHaveLength(3);
  });

  it("does not carry a feed between sweeps", async () => {
    // The memo is per invocation and passed in, never module-level. A
    // long-lived process must not serve a day-old advisory feed because
    // an earlier request happened to warm a global.
    stubFetch(() => ({ ok: true, body: RSS_BODY }));

    await fetchAdvisories("de");
    await fetchAdvisories("de");

    const calls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(calls.filter((url) => url.includes("travel.state.gov"))).toHaveLength(2);
  });
});
