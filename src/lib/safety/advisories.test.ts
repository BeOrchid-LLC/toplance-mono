import { describe, expect, it } from "vitest";

import {
  advisoryChanged,
  fcdoSlugFor,
  parseStateDeptFeed,
  stateDeptAdvisoryFor,
  toFcdoAdvisory,
} from "@/lib/safety/advisories";

/**
 * Both shapes below were read off live responses on 2026-09-05:
 * `gov.uk/api/content/foreign-travel-advice/united-arab-emirates` and
 * `travel.state.gov/_res/rss/TAsTWs.xml`. They are trimmed to the fields
 * these mappers actually read — a mapper loose enough to accept a shape
 * the source does not send cannot tell "I understood nothing" from
 * "there was nothing to understand", which is the failure
 * `toCountryContext` was rewritten to avoid.
 */
const fcdoResponse = (over: Record<string, unknown> = {}) => ({
  base_path: "/foreign-travel-advice/united-arab-emirates",
  title: "United Arab Emirates travel advice",
  public_updated_at: "2026-07-24T15:52:23+01:00",
  updated_at: "2026-08-31T14:17:29+01:00",
  details: {
    alert_status: [],
    change_description:
      "Updated information about regional tensions, including information about recent strikes and retaliatory attacks by Iran ('Warnings insurance') page.  ",
    reviewed_at: "2026-07-24T14:52:23Z",
  },
  ...over,
});

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>United Arab Emirates - Level 3: Reconsider Travel</title>
    <link>https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/united-arab-emirates-travel-advisory.html</link>
    <pubDate>Sat, 29 Aug 2026</pubDate>
    <description><![CDATA[<p>Updated to reflect regional tensions.</p>]]></description>
  </item>
  <item>
    <title>United Kingdom - Level 2: Exercise Increased Caution</title>
    <link>https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/united-kingdom-travel-advisory.html</link>
    <pubDate>Thu, 08 May 2025</pubDate>
    <description><![CDATA[<p>There were no changes to the advisory level.</p>]]></description>
  </item>
  <item>
    <title>Guinea-Bissau - Level 3: Reconsider Travel</title>
    <link>https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/guinea-bissau-travel-advisory.html</link>
    <pubDate>Mon, 02 Jun 2025</pubDate>
    <description><![CDATA[<p>Nothing to report.</p>]]></description>
  </item>
</channel></rss>`;

describe("toFcdoAdvisory", () => {
  it("maps a live FCDO response into an advisory", () => {
    const advisory = toFcdoAdvisory(fcdoResponse());

    expect(advisory).not.toBeNull();
    expect(advisory!.source).toBe("UK FCDO");
    expect(advisory!.url).toBe(
      "https://www.gov.uk/foreign-travel-advice/united-arab-emirates"
    );
  });

  it("takes the date the advice materially changed, not the date the page was edited", () => {
    // `updated_at` moves for a typo fix; `public_updated_at` moves when
    // the advice itself changed. Alerting on the former would mail every
    // traveller about a corrected apostrophe.
    const advisory = toFcdoAdvisory(fcdoResponse());
    expect(advisory!.updatedAt).toBe("2026-07-24T15:52:23+01:00");
  });

  it("quotes the source's own change note, trimmed but never reworded", () => {
    const advisory = toFcdoAdvisory(fcdoResponse());
    expect(advisory!.changeNote).toBe(
      "Updated information about regional tensions, including information about recent strikes and retaliatory attacks by Iran ('Warnings insurance') page."
    );
  });

  it("has no level of its own — FCDO does not publish one", () => {
    // The numbered level comes from the State Department feed. Inventing
    // one here would attribute a judgement to FCDO it never made.
    expect(toFcdoAdvisory(fcdoResponse())!.level).toBeNull();
  });

  it("rejects a response with no material-change timestamp", () => {
    expect(toFcdoAdvisory(fcdoResponse({ public_updated_at: null }))).toBeNull();
  });

  it("rejects anything that is not an FCDO response", () => {
    expect(toFcdoAdvisory(null)).toBeNull();
    expect(toFcdoAdvisory({})).toBeNull();
    expect(toFcdoAdvisory({ details: { change_description: "x" } })).toBeNull();
  });

  it("survives a response carrying no change note", () => {
    const advisory = toFcdoAdvisory(
      fcdoResponse({ details: { alert_status: [] } })
    );
    expect(advisory).not.toBeNull();
    expect(advisory!.changeNote).toBeNull();
  });
});

describe("parseStateDeptFeed", () => {
  it("reads each item's country and advisory level", () => {
    const rows = parseStateDeptFeed(RSS);
    expect(rows).toHaveLength(3);

    const uae = rows.find((r) => r.country === "United Arab Emirates");
    expect(uae).toBeDefined();
    expect(uae!.advisory.source).toBe("US State Department");
    expect(uae!.advisory.level).toBe("Level 3: Reconsider Travel");
    expect(uae!.advisory.url).toContain("united-arab-emirates");
  });

  it("splits on the level marker, not the first hyphen", () => {
    // "Guinea-Bissau" would lose half its name to a naive split.
    const rows = parseStateDeptFeed(RSS);
    expect(rows.map((r) => r.country)).toContain("Guinea-Bissau");
  });

  it("keeps the publication date as the advisory's timestamp", () => {
    const rows = parseStateDeptFeed(RSS);
    const uk = rows.find((r) => r.country === "United Kingdom")!;
    expect(uk.advisory.updatedAt.slice(0, 10)).toBe("2025-05-08");
  });

  it("respects an explicit timezone when the feed supplies one", () => {
    // A pubDate carrying a time carries its own zone; the zoneless fix
    // must not be applied on top of it.
    const withZone = RSS.replace(
      "<pubDate>Thu, 08 May 2025</pubDate>",
      "<pubDate>Thu, 08 May 2025 23:30:00 +0100</pubDate>"
    );
    const uk = parseStateDeptFeed(withZone).find(
      (r) => r.country === "United Kingdom"
    )!;
    expect(uk.advisory.updatedAt).toBe("2025-05-08T22:30:00.000Z");
  });

  it("returns nothing for a feed it cannot read rather than throwing", () => {
    expect(parseStateDeptFeed("")).toEqual([]);
    expect(parseStateDeptFeed("<rss><channel></channel></rss>")).toEqual([]);
  });
});

describe("stateDeptAdvisoryFor", () => {
  it("finds the advisory for a destination by its curated country name", () => {
    const advisory = stateDeptAdvisoryFor(RSS, "gb");
    expect(advisory).not.toBeNull();
    expect(advisory!.level).toBe("Level 2: Exercise Increased Caution");
  });

  it("covers the United Kingdom, which FCDO never publishes about itself", () => {
    // The reason this source exists at all: gb is the largest corridor
    // and has no FCDO row.
    expect(fcdoSlugFor("gb")).toBeNull();
    expect(stateDeptAdvisoryFor(RSS, "gb")).not.toBeNull();
  });

  it("returns null for a destination the feed does not name", () => {
    expect(stateDeptAdvisoryFor(RSS, "de")).toBeNull();
  });

  /**
   * The feed writes some countries under a different name than this
   * product's curated list does. Every alias below was read off the live
   * feed on 2026-09-05 rather than guessed — matching by name is only
   * safe if the names are the source's own.
   *
   * Six of fifty curated destinations missed before this: four had a
   * different name in the feed, and two are not in it at all.
   */
  const ALIASED = `<rss><channel>
    <item><title>Turkey - Level 2: Exercise Increased Caution</title>
      <link>https://travel.state.gov/turkey</link>
      <pubDate>Thu, 08 May 2025</pubDate></item>
    <item><title>Cote d Ivoire - Level 2: Exercise Increased Caution</title>
      <link>https://travel.state.gov/cote-d-ivoire</link>
      <pubDate>Thu, 08 May 2025</pubDate></item>
    <item><title>Kingdom of Denmark - Level 2: Exercise Increased Caution</title>
      <link>https://travel.state.gov/denmark</link>
      <pubDate>Thu, 08 May 2025</pubDate></item>
    <item><title>Mexico Travel Advisory - Level 2: Exercise Increased Caution</title>
      <link>https://travel.state.gov/mexico</link>
      <pubDate>Thu, 08 May 2025</pubDate></item>
    <item><title>Mainland China, Hong Kong &amp; Macau - See Summaries - Level 2: Exercise Increased Caution</title>
      <link>https://travel.state.gov/china</link>
      <pubDate>Thu, 08 May 2025</pubDate></item>
    <item><title>Ghana - Level 1: Exercise Normal Precautions</title>
      <link>https://travel.state.gov/ghana</link>
      <pubDate>Thu, 08 May 2025</pubDate></item>
  </channel></rss>`;

  it("finds Türkiye under the feed's spelling of it", () => {
    expect(stateDeptAdvisoryFor(ALIASED, "tr")?.url).toContain("turkey");
  });

  it("finds Ivory Coast under Cote d Ivoire", () => {
    expect(stateDeptAdvisoryFor(ALIASED, "ci")?.url).toContain("cote-d-ivoire");
  });

  it("finds Denmark under the Kingdom of Denmark", () => {
    expect(stateDeptAdvisoryFor(ALIASED, "dk")?.url).toContain("denmark");
  });

  it("finds Mexico under its 'Travel Advisory' suffix", () => {
    expect(stateDeptAdvisoryFor(ALIASED, "mx")?.url).toContain("mexico");
  });

  it("has nothing to say about the United States", () => {
    // Not an alias, and pinned here so its absence from the table above
    // is not mistaken for an oversight: the feed carries no United
    // States entry at all, because a government does not advise its own
    // citizens about home. Exact matching already answers null.
    expect(stateDeptAdvisoryFor(ALIASED, "us")).toBeNull();
  });

  it("declines China rather than pick one of two levels for it", () => {
    // The feed carries no entry for China alone — it publishes
    // "Mainland China, Hong Kong & Macau - See Summaries" twice, at
    // Level 2 and Level 3. Reporting either as China's advisory would be
    // choosing one, which is not this product's to choose. FCDO still
    // covers the corridor.
    expect(stateDeptAdvisoryFor(ALIASED, "cn")).toBeNull();
  });

  it("still matches an unaliased destination by its curated name", () => {
    expect(stateDeptAdvisoryFor(ALIASED, "gh")?.url).toContain("ghana");
  });
});

describe("fcdoSlugFor", () => {
  it("derives the published slug from the curated destination name", () => {
    expect(fcdoSlugFor("ae")).toBe("united-arab-emirates");
    expect(fcdoSlugFor("de")).toBe("germany");
  });

  it("has no slug for the United Kingdom", () => {
    expect(fcdoSlugFor("gb")).toBeNull();
  });

  it("has no slug for a destination this product does not curate", () => {
    expect(fcdoSlugFor("zz")).toBeNull();
  });
});

describe("advisoryChanged", () => {
  const at = (iso: string) => ({ updatedAt: iso });

  it("is false the first time we see an advisory", () => {
    // Rolling this out must not mail every approved traveller an "alert"
    // about advice that has not changed — the first read is a baseline.
    expect(advisoryChanged(null, at("2026-07-24T00:00:00Z"))).toBe(false);
  });

  it("is true once the source's own timestamp moves forward", () => {
    expect(
      advisoryChanged(at("2026-07-24T00:00:00Z"), at("2026-08-30T00:00:00Z"))
    ).toBe(true);
  });

  it("is false when nothing moved", () => {
    expect(
      advisoryChanged(at("2026-07-24T00:00:00Z"), at("2026-07-24T00:00:00Z"))
    ).toBe(false);
  });

  it("is false when the timestamp goes backwards", () => {
    // A source that republishes an older revision is not new news.
    expect(
      advisoryChanged(at("2026-08-30T00:00:00Z"), at("2026-07-24T00:00:00Z"))
    ).toBe(false);
  });

  it("is false when either timestamp is unreadable", () => {
    expect(advisoryChanged(at("not a date"), at("2026-08-30T00:00:00Z"))).toBe(false);
    expect(advisoryChanged(at("2026-07-24T00:00:00Z"), at("nonsense"))).toBe(false);
  });
});
