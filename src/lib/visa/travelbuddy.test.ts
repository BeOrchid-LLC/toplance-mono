import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchCountryContext,
  toCountryContext,
  toEntryRules,
} from "@/lib/visa/travelbuddy";

/**
 * The destination metadata block, with the field names the vendor
 * documents. Only the metadata matters here — the same response carries
 * entry rules, and this module deliberately never reads them.
 */
const destination = (over: Record<string, unknown> = {}) => ({
  code: "ID",
  name: "Indonesia",
  currency_code: "IDR",
  currency: "Indonesian Rupiah",
  exchange: "0.00425",
  timezone: "+08:00",
  phone_code: "+62",
  capital: "Jakarta",
  embassy_url: "https://example.gov/embassy",
  passport_validity: "3 months beyond the period of stay",
  ...over,
});

describe("toCountryContext", () => {
  it("maps a documented destination block into a country context", () => {
    const ctx = toCountryContext({ destination: destination() });

    expect(ctx).not.toBeNull();
    expect(ctx!.currencyCode).toBe("IDR");
    expect(ctx!.currencyName).toBe("Indonesian Rupiah");
    expect(ctx!.exchangeRate).toBe("0.00425");
    expect(ctx!.timezone).toBe("+08:00");
    expect(ctx!.phoneCode).toBe("+62");
    expect(ctx!.capital).toBe("Jakarta");
    expect(ctx!.embassyUrl).toBe("https://example.gov/embassy");
  });

  /**
   * The response shape could not be verified against a live call before
   * this was written — the vendor publishes field names but not an
   * envelope. Both readings are therefore supported and pinned, so
   * whichever one production turns out to send, the mapper reads it.
   */
  it("reads the metadata whether nested or at the top level", () => {
    const nested = toCountryContext({ destination: destination() });
    const flat = toCountryContext(destination());

    expect(flat).toEqual(nested);
  });

  /**
   * The itinerary prompt's standing rule is that it never states visa or
   * entry requirements — those belong to the requirements screen, from
   * curated data someone checked against the mission. `passport_validity`
   * is an entry requirement wearing country-metadata clothing, so this
   * module drops it along with the rules proper: the only consumer is a
   * prompt that is forbidden from saying it.
   */
  it("never carries an entry requirement, only destination metadata", () => {
    const ctx = toCountryContext({
      destination: destination(),
      visa: { requirement: "visa_required", allowed_stay: "30 days" },
    });

    const serialised = JSON.stringify(ctx);
    expect(serialised).not.toContain("visa_required");
    expect(serialised).not.toContain("30 days");
    expect(serialised).not.toContain("passport");
    expect(serialised).not.toContain("beyond the period of stay");
  });

  it("keeps absent fields null rather than guessing them", () => {
    const ctx = toCountryContext({
      destination: destination({
        exchange: null,
        embassy_url: null,
        capital: undefined,
      }),
    });

    expect(ctx!.currencyCode).toBe("IDR");
    expect(ctx!.exchangeRate).toBeNull();
    expect(ctx!.embassyUrl).toBeNull();
    expect(ctx!.capital).toBeNull();
  });

  it("answers null rather than throwing on a reshaped payload", () => {
    expect(toCountryContext({ nonsense: true })).toBeNull();
    expect(toCountryContext(null)).toBeNull();
    expect(toCountryContext("<html>")).toBeNull();
  });

  /**
   * A block whose every field is absent carries nothing the prompt could
   * ground a fact on, and a context of all-nulls would still flip the
   * prompt into its "verified facts" branch — claiming a source for
   * nothing. Null keeps the itinerary on its ungrounded wording.
   */
  it("answers null for a block with nothing worth grounding", () => {
    expect(toCountryContext({ destination: { code: "ID", name: "Indonesia" } })).toBeNull();
  });

  /**
   * The embassy link is rendered as an `href` and handed to the
   * itinerary prompt as a sourced fact. A vendor field is not a
   * trusted URL, and a `javascript:` scheme in an `href` runs in our
   * origin — so it must not survive the parse.
   */
  it("drops an embassy link that is not http(s)", () => {
    const ctx = toCountryContext(
      destination({ embassy_url: "javascript:alert(document.cookie)" })
    );

    expect(ctx!.embassyUrl).toBeNull();
    // The rest of the block is still perfectly good grounding.
    expect(ctx!.capital).toBe("Jakarta");
  });
});

describe("fetchCountryContext gates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is inert without an API key", async () => {
    vi.stubEnv("TRAVEL_BUDDY_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchCountryContext({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts uppercased ISO codes as passport and destination", async () => {
    vi.stubEnv("TRAVEL_BUDDY_API_KEY", "test-key");
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ destination: destination() }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    vi.resetModules();
    const { fetchCountryContext: fetchFresh } = await import(
      "@/lib/visa/travelbuddy"
    );

    const ctx = await fetchFresh({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    });

    expect(ctx!.capital).toBe("Jakarta");
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      passport: "NG",
      destination: "GB",
    });
  });

  it("stands down for the process after a rejected key", async () => {
    vi.stubEnv("TRAVEL_BUDDY_API_KEY", "wrong-key");
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchSpy);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.resetModules();
    const { fetchCountryContext: fetchFresh } = await import(
      "@/lib/visa/travelbuddy"
    );

    const query = {
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "work",
    } as const;

    expect(await fetchFresh(query)).toBeNull();
    expect(await fetchFresh(query)).toBeNull();
    // One network call, one log line — not one per approval.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  /**
   * The itinerary runs inside an approval's `after()`. A vendor outage
   * must cost an approved traveller nothing, so a bad status is a null,
   * never a throw.
   */
  it("answers null rather than throwing when the vendor is broken", async () => {
    vi.stubEnv("TRAVEL_BUDDY_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("boom", { status: 500 }))
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.resetModules();
    const { fetchCountryContext: fetchFresh } = await import(
      "@/lib/visa/travelbuddy"
    );

    await expect(
      fetchFresh({
        nationalityIso: "ng",
        destinationIso: "gb",
        purpose: "work",
      })
    ).resolves.toBeNull();
    consoleSpy.mockRestore();
  });
});


/** The visa-rule half of the same payload, as the vendor documents it. */
const rules = (over: Record<string, unknown> = {}) => ({
  destination: destination(),
  visa_rules: {
    primary_rule: { name: "Visa required", duration: "5 years", color: "red" },
    secondary_rule: {
      name: "eVisa",
      duration: null,
      color: "blue",
      link: "https://example.gov/evisa",
    },
  },
  mandatory_registration: {
    name: "e-Arrival",
    color: "yellow",
    link: "https://example.gov/arrival",
  },
  ...over,
});

describe("toEntryRules", () => {
  it("maps the documented rule payload into a rule set", () => {
    const rs = toEntryRules(rules())!;

    expect(rs.provider).toBe("travelbuddy");
    expect(rs.sourceName).toBe("Travel Buddy");
    expect(rs.allowedStay).toBe("5 years");
    expect(rs.evisaUrl).toBe("https://example.gov/evisa");
    expect(rs.registrationName).toBe("e-Arrival");
    expect(rs.registrationUrl).toBe("https://example.gov/arrival");
    expect(rs.passportValidity).toBe("3 months beyond the period of stay");
    expect(rs.embassyUrl).toBe("https://example.gov/embassy");
  });

  /**
   * The whole reason this provider cannot lead. Travel Buddy returns no
   * document list, so a rule set from it carries no checklist — and
   * `canLead: false` is what stops that reaching `adoptRuleSet`.
   */
  it("carries no documents and no corridor of ours", () => {
    const rs = toEntryRules(rules())!;

    expect(rs.requirements).toEqual([]);
    expect(rs.corridorId).toBeNull();
  });

  /**
   * It has neither, and claiming otherwise would let it fill a figure
   * the curated table is the only real source for.
   */
  it("never claims a fee or a decision time", () => {
    const rs = toEntryRules(rules())!;

    expect(rs.governmentFeeMinor).toBeNull();
    expect(rs.governmentFeeCurrency).toBeNull();
    expect(rs.processingWeeksMin).toBeNull();
    expect(rs.processingWeeksMax).toBeNull();
  });

  it("survives a payload with no registration and no secondary rule", () => {
    const rs = toEntryRules(
      rules({ mandatory_registration: null, visa_rules: {
        primary_rule: { name: "Visa free", duration: "90 days", color: "green" },
      } })
    )!;

    expect(rs.allowedStay).toBe("90 days");
    expect(rs.evisaUrl).toBeNull();
    expect(rs.registrationName).toBeNull();
    expect(rs.registrationUrl).toBeNull();
  });

  it("answers null rather than throwing on a reshaped payload", () => {
    expect(toEntryRules({ nonsense: true })).toBeNull();
    expect(toEntryRules(null)).toBeNull();
    expect(toEntryRules("<html>")).toBeNull();
  });

  /**
   * Nothing to contribute is not a contribution. A payload carrying none
   * of the six figures would otherwise put "Travel Buddy" on the sheet
   * beside an empty list of what it supplied.
   */
  it("answers null when it has no entry rule worth adding", () => {
    expect(
      toEntryRules({
        destination: { code: "ID", name: "Indonesia" },
        visa_rules: {},
        mandatory_registration: null,
      })
    ).toBeNull();
  });

  it("drops every link that is not http(s)", () => {
    const rs = toEntryRules(
      rules({
        destination: destination({ embassy_url: "javascript:alert(1)" }),
        visa_rules: {
          primary_rule: { name: "Visa required", duration: "5 years" },
          secondary_rule: { name: "eVisa", link: "data:text/html,<script>" },
        },
        mandatory_registration: { name: "e-Arrival", link: "/app/documents" },
      })
    )!;

    expect(rs.embassyUrl).toBeNull();
    expect(rs.sourceUrl).toBeNull();
    expect(rs.evisaUrl).toBeNull();
    // Half a registration is worse than none — see the mapper.
    expect(rs.registrationName).toBeNull();
    expect(rs.registrationUrl).toBeNull();
    // Still a rule set: the stay and validity it carries are unaffected.
    expect(rs.allowedStay).toBe("5 years");
  });
});
