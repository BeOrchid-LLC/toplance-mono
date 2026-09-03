import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchPassport,
  findDestination,
  nextPassportToWarm,
  resetVisaListCache,
  splitNotes,
  toEntryRules,
  visaListProvider,
  visaListResponseSchema,
  visaRequirementSchema,
} from "@/lib/visa/visalist";
import {
  VISALIST_NIGERIA_SAMPLE,
  VISALIST_OBSERVED_COUNTRY_KEYS,
  VISALIST_OBSERVED_ENTRY_KEYS,
} from "@/lib/visa/visalist.sample";

/**
 * The VisaList schema, checked against the vendor's real response.
 *
 * `visalist.sample.ts` is a verbatim recording of a live call, so these
 * are not tests of a fixture someone wrote to match the schema — the
 * fixture came first and the schema was written to it. That order is the
 * point: `travelbuddy.ts` records what a guessed schema costs, and the
 * cost was silence, not an error.
 */
const parsed = visaListResponseSchema.parse(VISALIST_NIGERIA_SAMPLE);
const uk = findDestination(parsed, "GB")!;
const ethiopia = findDestination(parsed, "ET")!;
const ghana = findDestination(parsed, "GH")!;

describe("visaListResponseSchema", () => {
  it("parses the recorded response", () => {
    expect(parsed.visaRequirements).toHaveLength(6);
    // All four categories the vendor uses, plus two rows carried purely
    // for the rare fields they exercise — see the coverage test below.
    expect(
      new Set(parsed.visaRequirements.map((e) => e.visaCategory.name))
    ).toEqual(
      new Set(["Visa Required", "Visa Free", "Visa on Arrival", "E-visa"])
    );
  });

  /**
   * The guard against the failure mode `travelbuddy.ts` documents: a
   * field the four recorded destinations happen not to exercise is still
   * a field the vendor sends. These lists come from all 238 entries of
   * the live call, so anything the schema names must really exist.
   */
  it("names only fields the live response actually carried", () => {
    const entryKeys = new Set<string>(VISALIST_OBSERVED_ENTRY_KEYS);
    const countryKeys = new Set<string>(VISALIST_OBSERVED_COUNTRY_KEYS);

    const modelledEntry = Object.keys(visaRequirementSchema.shape);
    const modelledCountry = Object.keys(
      visaRequirementSchema.shape.destinationCountry.shape
    );

    expect(modelledEntry.filter((k) => !entryKeys.has(k))).toEqual([]);
    expect(modelledCountry.filter((k) => !countryKeys.has(k))).toEqual([]);
  });

  /**
   * The recording is a subset of the API by *rows*, and must not become
   * one by *fields*. These six destinations were picked so that between
   * them they use every key the live call returned across all 238 — so a
   * field only one row in the whole response carries (`currencySymbol`
   * appears exactly once, on Australia) is still represented here.
   */
  it("exercises every field the live response used anywhere", () => {
    const rows = VISALIST_NIGERIA_SAMPLE.visaRequirements;
    const seen = (pick: (r: (typeof rows)[number]) => object) =>
      new Set(rows.flatMap((r) => Object.keys(pick(r))));

    const entrySeen = seen((r) => r);
    const countrySeen = seen((r) => r.destinationCountry);

    expect(
      VISALIST_OBSERVED_ENTRY_KEYS.filter((k) => !entrySeen.has(k))
    ).toEqual([]);
    expect(
      VISALIST_OBSERVED_COUNTRY_KEYS.filter((k) => !countrySeen.has(k))
    ).toEqual([]);
  });

  it("rejects an empty result rather than passing it off as a corridor", () => {
    // A passport the vendor does not cover must read as "no answer", not
    // as a destination list that happens to be empty.
    expect(
      visaListResponseSchema.safeParse({ visaRequirements: [] }).success
    ).toBe(false);
  });

  it("rejects a payload missing the fields it is built on", () => {
    const broken = {
      visaRequirements: [{ id: 1, destinationCountry: { name: "Nowhere" } }],
    };
    expect(visaListResponseSchema.safeParse(broken).success).toBe(false);
  });
});

describe("toEntryRules", () => {
  it("never carries documents, whatever the destination", () => {
    // The load-bearing assertion. `canLead: true` would make these the
    // traveller's checklist, and an empty checklist has no upload slots,
    // no completion score and no route to submission.
    for (const entry of parsed.visaRequirements) {
      expect(toEntryRules(entry)?.requirements).toEqual([]);
    }
  });

  it("claims no fee and no processing window", () => {
    const rules = toEntryRules(uk)!;

    // Not in the payload. A contributor that guessed either would fill a
    // blank the merge reserves for a source that actually has one.
    expect(rules.governmentFeeMinor).toBeNull();
    expect(rules.processingWeeksMin).toBeNull();
    expect(rules.processingWeeksMax).toBeNull();
    expect(rules.passportValidity).toBeNull();
  });

  it("prefers the readable stay over the visa's own validity", () => {
    // The vendor gives "180 days" and "6 months" for the UK; a traveller
    // reads the second one more easily.
    expect(uk.duration).toBe("180 days");
    expect(uk.stayDuration).toBe("6 months");
    expect(toEntryRules(uk)!.allowedStay).toBe("6 months");
  });

  it("reports the vendor's own row date as the freshness signal", () => {
    const rules = toEntryRules(uk)!;

    // Not `now()`. The moment we asked says nothing about when the data
    // was last true, and reporting it would claim a freshness the vendor
    // never offered.
    expect(rules.lastVerifiedAt).toBe(uk.updatedAt);
    expect(rules.effectiveFrom).toBe(uk.updatedAt.slice(0, 10));
  });

  it("drops a reseller's link rather than calling it official", () => {
    // Ethiopia's declaration link is an iVisa affiliate page. Showing it
    // under "Arrival registration" would repeat the VisaHQ mistake the
    // provider list already refused.
    expect(ethiopia.destinationCountry.documentDeclarationUrl).toContain(
      "ivisa.com"
    );

    const rules = toEntryRules(ethiopia);
    expect(rules?.registrationUrl ?? null).toBeNull();
    // And the name goes with it — both or neither.
    expect(rules?.registrationName ?? null).toBeNull();
  });

  it("carries a credit while the licence terms are unconfirmed", () => {
    expect(toEntryRules(ghana)!.attribution).toBe(
      "Visa data provided by VisaList (visalist.io)."
    );
  });

  it("returns null when there is nothing worth repeating", () => {
    const empty = {
      ...uk,
      duration: "",
      stayDuration: "",
      visaProcessingUrl: "",
      destinationCountry: {
        ...uk.destinationCountry,
        embassyRegistraionUrl: undefined,
        visaOnlineUrl: undefined,
        visaProcessingUrl: undefined,
        documentDeclarationUrl: undefined,
      },
    };

    // Otherwise "VisaList" would appear on the requirements sheet beside
    // an empty list of what it supplied.
    expect(toEntryRules(empty)).toBeNull();
  });
});

/**
 * Tests of a *vendor claim*, not of our code.
 *
 * The coverage plan says VisaList sells tourism checklists and can
 * therefore lead. These walk the raw recording — deliberately not the
 * parsed object, which would be circular, since the schema drops fields
 * by design — so they answer "what did the vendor actually send?".
 *
 * Written as assertions rather than a comment: if VisaList ever does
 * ship checklists, this goes red and tells someone the plan is back on.
 */
describe("the recorded payload itself", () => {
  it("contains no document checklist anywhere", () => {
    const keys = new Set<string>();
    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
          keys.add(k);
          walk(v);
        }
      }
    };
    walk(VISALIST_NIGERIA_SAMPLE);

    const checklistish = [...keys].filter((k) =>
      /document|checklist|requiredDoc|paperwork|evidence/i.test(k)
    );

    // ...and these two are a single arrival or health declaration form,
    // not a list of papers to gather.
    expect(checklistish).toEqual([
      "documentDeclarationName",
      "documentDeclarationUrl",
    ]);
  });

  it("offers a declaration form, which is one link and not a checklist", () => {
    expect(ethiopia.destinationCountry.documentDeclarationName).toBe(
      "Traveler's Health Declaration"
    );
    // A string and a URL — and the URL is a reseller's affiliate page,
    // not the mission's. Neither is a document a traveller uploads.
    expect(ethiopia.destinationCountry.documentDeclarationUrl).toContain(
      "ivisa.com"
    );
  });

  /**
   * Evidence about accuracy, not just shape. The curated table exists
   * because a vendor figure nobody checked is not worth showing under a
   * heading promising "Nothing here is our interpretation".
   */
  it("has provenance errors a reviewer would have to catch", () => {
    // The slug describes the opposite corridor to the one it sits on:
    // this row is the UK's rules for a Nigerian passport.
    expect(uk.slug).toBe("nigeria-visa-requirements-for-uk-citizens");
    // And its exemption note cites a gov.uk page written for Indians.
    expect(uk.exemptionVisa.referenceUrl).toContain("/india/");
  });
});

describe("findDestination", () => {
  it("finds a destination by ISO code, case-insensitively", () => {
    expect(findDestination(parsed, "gh")?.destinationCountry.name).toBe("Ghana");
  });

  it("returns null for a destination the passport's list does not hold", () => {
    expect(findDestination(parsed, "JP")).toBeNull();
  });
});

describe("splitNotes", () => {
  it("splits the vendor's :: separated notes and strips the trailing colon", () => {
    expect(splitNotes(uk.notes)).toEqual([
      "Travelers need a visa to visit United Kingdom for Business or Tourism.",
      "Travelers should check transit requirements for any other countries they transit through before arriving in the United Kingdom.",
    ]);
  });

  it("ignores empty notes", () => {
    expect(splitNotes("")).toEqual([]);
  });
});

/**
 * The provider — the half that spends money.
 *
 * `fetch` is stubbed rather than called: the Basic tier meters one
 * request an hour, so a suite that hit the real endpoint would be
 * untestable by the second developer to run it. What is asserted here is
 * the behaviour that decides the bill — one call per passport per week,
 * a cached failure, and a key rejection that stops asking.
 */
describe("visaListProvider", () => {
  const NG = { nationalityIso: "ng", destinationIso: "gb", purpose: "tourism" as const };

  let calls: string[] = [];

  beforeEach(() => {
    resetVisaListCache();
    calls = [];
    process.env.VISALIST_API_KEY = "test-key";
    // Pinned off: `.env.local` may switch the recorded fallback on for
    // local development, and a suite that changed behaviour with a
    // developer's environment would be worse than no suite.
    delete process.env.VISALIST_RECORDED;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VISALIST_API_KEY;
  });

  /** A stubbed endpoint that records every URL it is asked for. */
  const stub = (respond: () => Response) =>
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return respond();
    });

  const ok = () =>
    new Response(JSON.stringify(VISALIST_NIGERIA_SAMPLE), { status: 200 });

  it("never leads, whatever it knows", () => {
    // The correction this provider exists to record. `canLead: true`
    // with no documents would materialise an empty checklist.
    expect(visaListProvider.canLead).toBe(false);
  });

  it("claims only the gap fields the payload can actually supply", () => {
    expect(visaListProvider.fills).toEqual(["allowedStay", "embassyUrl"]);
    // Travel Buddy stays in the list precisely because of this omission.
    expect(visaListProvider.fills).not.toContain("passportValidity");
  });

  it("serves a whole passport from one call, then from cache", async () => {
    stub(ok);

    const gb = await visaListProvider.fetch(NG);
    const gh = await visaListProvider.fetch({ ...NG, destinationIso: "gh" });
    const rw = await visaListProvider.fetch({ ...NG, destinationIso: "rw" });

    expect(gb?.allowedStay).toBe("6 months");
    expect(gh?.allowedStay).toBe("3 months");
    expect(rw?.allowedStay).toBe("1 month");
    // Three corridors, one request. This is the entire economics of the
    // provider on a tier metered at one request an hour.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/country/nigeria");
  });

  it("declines a passport it has no slug for, without calling", async () => {
    stub(ok);

    expect(await visaListProvider.fetch({ ...NG, nationalityIso: "de" })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("returns null for a destination the passport list does not carry", async () => {
    stub(ok);
    // A real answer, just not about this corridor — and not a failure.
    expect(await visaListProvider.fetch({ ...NG, destinationIso: "zz" })).toBeNull();
  });

  it("remembers a failure instead of asking again on the next render", async () => {
    stub(() => new Response("nope", { status: 500 }));

    await visaListProvider.fetch(NG);
    await visaListProvider.fetch(NG);
    await visaListProvider.fetch({ ...NG, destinationIso: "gh" });

    // The bug that emptied a month of Travel Buddy's quota: an error
    // path that caches nothing is re-asked by every page view.
    expect(calls).toHaveLength(1);
  });

  it("stops asking once the key is rejected", async () => {
    stub(() => new Response("{}", { status: 401 }));

    await visaListProvider.fetch(NG);
    await visaListProvider.fetch({ ...NG, nationalityIso: "gh" });

    // A 401 cannot heal without a restart, so it stands down for the
    // process — including for passports it never tried.
    expect(calls).toHaveLength(1);
  });

  it("treats an unreadable payload as a failure, not an empty answer", async () => {
    stub(() => new Response(JSON.stringify({ visaRequirements: "not a list" }), { status: 200 }));

    expect(await visaListProvider.fetch(NG)).toBeNull();
    await visaListProvider.fetch(NG);
    expect(calls).toHaveLength(1);
  });

  it("does nothing at all without a key", async () => {
    delete process.env.VISALIST_API_KEY;
    stub(ok);

    expect(await visaListProvider.fetch(NG)).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

/**
 * The warming selector — milestone 03's actual decision.
 *
 * The route is a thin shell around this: it picks one passport, and
 * which one it picks is the whole behaviour, so that is what is tested.
 */
describe("nextPassportToWarm", () => {
  const ALL = ["ng", "gh", "ke", "za", "cm"];

  beforeEach(() => {
    resetVisaListCache();
    process.env.VISALIST_API_KEY = "test-key";
    delete process.env.VISALIST_RECORDED;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VISALIST_API_KEY;
  });

  it("picks a passport nobody has warmed yet", () => {
    expect(nextPassportToWarm(ALL)).toBe("ng");
  });

  it("skips a passport that already holds a live answer", async () => {
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify(VISALIST_NIGERIA_SAMPLE), { status: 200 })
    );
    await visaListProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "tourism",
    });

    // Warm data is not re-bought; the next passport is.
    expect(nextPassportToWarm(ALL)).toBe("gh");
  });

  it("ignores a nationality the vendor has no slug for", () => {
    // Declining is honest. Guessing a slug for a vendor that spells the
    // United Arab Emirates "United Arab Emirated" is not.
    expect(nextPassportToWarm(["de", "fr"])).toBeNull();
  });

  it("does not override a stand-down", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 429 }));
    await visaListProvider.fetch({
      nationalityIso: "ng",
      destinationIso: "gb",
      purpose: "tourism",
    });

    // A stand-down is a decision to stop asking. A warming job that
    // pushed through it is the fastest way to spend a quota on a vendor
    // that is already refusing.
    expect(nextPassportToWarm(["ng"])).toBeNull();
  });

  it("has nothing to do once every passport is warm", async () => {
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify(VISALIST_NIGERIA_SAMPLE), { status: 200 })
    );
    for (const iso of ALL) await fetchPassport(iso, { force: true });

    expect(nextPassportToWarm(ALL)).toBeNull();
  });
});

/**
 * The recorded-sample fallback.
 *
 * A convenience with three guards on it, and the guards are what is
 * worth testing — serving a recording unannounced, or in production, or
 * for a passport that was never captured, are each a different way of
 * inventing coverage.
 */
describe("the recorded fallback", () => {
  const NG = { nationalityIso: "ng", destinationIso: "gb", purpose: "tourism" as const };

  beforeEach(() => {
    resetVisaListCache();
    delete process.env.VISALIST_API_KEY;
    delete process.env.VISALIST_RECORDED;
    vi.stubGlobal("fetch", async () => {
      throw new Error("no live call should be made without a key");
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VISALIST_RECORDED;
    vi.unstubAllEnvs();
  });

  it("stays silent unless it is asked for", async () => {
    // Falling back silently would let someone believe the vendor is
    // wired up when it is not.
    expect(await visaListProvider.fetch(NG)).toBeNull();
  });

  it("serves the recording when switched on", async () => {
    vi.stubEnv("VISALIST_RECORDED", "1");

    const rules = await visaListProvider.fetch(NG);
    expect(rules?.allowedStay).toBe("6 months");
    expect(rules?.provider).toBe("visalist");
    // Still no documents — a recording of a checklist-less API is still
    // checklist-less.
    expect(rules?.requirements).toEqual([]);
  });

  it("refuses in a production build, whatever the flag says", async () => {
    vi.stubEnv("VISALIST_RECORDED", "1");
    vi.stubEnv("NODE_ENV", "production");

    // Hard-coded rather than configurable: a variable that leaks into a
    // deployed environment must not be able to serve month-old data.
    expect(await visaListProvider.fetch(NG)).toBeNull();
  });

  it("cannot invent a passport it never recorded", async () => {
    vi.stubEnv("VISALIST_RECORDED", "1");

    // The capture was a Nigerian passport. Ghana still reaches the gap
    // screen rather than being served Nigeria's rules.
    expect(
      await visaListProvider.fetch({ ...NG, nationalityIso: "gh" })
    ).toBeNull();
  });

  it("still declines a destination outside the recording", async () => {
    vi.stubEnv("VISALIST_RECORDED", "1");

    // Six destinations were recorded; the other 232 are honestly absent.
    expect(await visaListProvider.fetch({ ...NG, destinationIso: "fr" })).toBeNull();
  });
});
