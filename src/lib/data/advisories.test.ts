import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("advisory cache", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, companionUpdates, corridors, profiles } = await import(
    "@/lib/db/schema"
  );
  const { approvedTravellersForAdvisories, refreshAdvisoriesIfStale } =
    await import("@/lib/data/advisories");

  const APPROVED = "test_adv_approved";
  const PENDING = "test_adv_pending";
  const NO_CORRIDOR = "test_adv_no_corridor";
  const IDS = [APPROVED, PENDING, NO_CORRIDOR];

  let corridorId = "";
  let approvedAppId = "";

  /** The State Department feed, with a pubDate the test controls. */
  const rss = (pubDate: string) => `<rss><channel><item>
    <title>Germany - Level 2: Exercise Increased Caution</title>
    <link>https://travel.state.gov/germany.html</link>
    <pubDate>${pubDate}</pubDate>
  </item></channel></rss>`;

  /** Only the State Department answers; FCDO is treated as unavailable. */
  function stubSources(pubDate: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("gov.uk")) return new Response("", { status: 404 });
        return new Response(rss(pubDate), { status: 200 });
      })
    );
  }

  /**
   * The corridor is created once for the whole file rather than per test.
   *
   * `applications` carries no index on `corridor_id`, so deleting a
   * corridor makes Postgres scan that table to null out any referencing
   * row — which blocks against other suites inserting applications
   * concurrently and times them out. One delete instead of six keeps this
   * file from destabilising `schema.test.ts` alongside it.
   */
  afterAll(async () => {
    if (corridorId) await db.delete(corridors).where(eq(corridors.id, corridorId));
  });

  beforeEach(async () => {
    // Created on the first test rather than in `beforeAll`, and reused by
    // the rest — `is_live: false` so this fixture can never reach a
    // marketing surface or a traveller's checklist, and a version nobody
    // else uses so the corridor uniqueness constraint cannot collide
    // with seeded rows.
    if (!corridorId) {
      // Cleared first, then inserted. An interrupted run can leave this
      // row behind — the query still commits server-side after a hook
      // times out client-side — and a leaked fixture would then fail
      // every later run on the uniqueness constraint rather than on
      // anything real.
      await db
        .delete(corridors)
        .where(
          and(
            eq(corridors.nationalityIso, "ng"),
            eq(corridors.destinationIso, "de"),
            eq(corridors.version, 9999)
          )
        );

      const [corridor] = await db
        .insert(corridors)
        .values({
          nationalityIso: "ng",
          destinationIso: "de",
          purpose: "work",
          visaName: "Test advisory corridor",
          version: 9999,
          isLive: false,
        })
        .returning({ id: corridors.id });
      corridorId = corridor.id;
    }

    await db.insert(profiles).values(
      IDS.map((id) => ({
        id,
        email: `${id.replace(/_/g, "-")}@test.invalid`,
        fullName: "Ada",
      }))
    );

    const rows = await db
      .insert(applications)
      .values([
        { travelerId: APPROVED, status: "approved", corridorId },
        { travelerId: PENDING, status: "under_review", corridorId },
        { travelerId: NO_CORRIDOR, status: "approved", corridorId: null },
      ])
      .returning({ id: applications.id, travelerId: applications.travelerId });

    approvedAppId = rows.find((r) => r.travelerId === APPROVED)!.id;
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await db.delete(applications).where(inArray(applications.travelerId, IDS));
    await db.delete(profiles).where(inArray(profiles.id, IDS));
  });

  describe("refreshAdvisoriesIfStale", () => {
    it("stores what it read and reports no change on the first look", async () => {
      // Rolling this out must not alert every approved traveller about
      // advice that has sat unchanged for a year.
      stubSources("Tue, 13 May 2025");

      const result = await refreshAdvisoriesIfStale(approvedAppId, "de");

      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].level).toBe("Level 2: Exercise Increased Caution");
      expect(result.changed).toEqual([]);

      const [row] = await db
        .select()
        .from(companionUpdates)
        .where(eq(companionUpdates.applicationId, approvedAppId));
      expect(row.kind).toBe("safety_advisory");
    });

    it("reports the advisory as changed once the source's date moves", async () => {
      stubSources("Tue, 13 May 2025");
      await refreshAdvisoriesIfStale(approvedAppId, "de");

      // Force the cache to look stale, then answer with newer advice.
      await db
        .update(companionUpdates)
        .set({ generatedAt: new Date("2020-01-01T00:00:00Z") })
        .where(eq(companionUpdates.applicationId, approvedAppId));

      stubSources("Thu, 04 Sep 2026");
      const result = await refreshAdvisoriesIfStale(approvedAppId, "de");

      expect(result.changed).toHaveLength(1);
      expect(result.changed[0].source).toBe("US State Department");
    });

    it("does not call out to a source while the cache is fresh", async () => {
      stubSources("Tue, 13 May 2025");
      await refreshAdvisoriesIfStale(approvedAppId, "de");

      const secondFetch = vi.fn();
      vi.stubGlobal("fetch", secondFetch);

      const result = await refreshAdvisoriesIfStale(approvedAppId, "de");

      expect(secondFetch).not.toHaveBeenCalled();
      expect(result.advisories).toHaveLength(1);
      expect(result.changed).toEqual([]);
    });

    it("serves the cached advisory when every source is unreachable", async () => {
      stubSources("Tue, 13 May 2025");
      await refreshAdvisoriesIfStale(approvedAppId, "de");

      await db
        .update(companionUpdates)
        .set({ generatedAt: new Date("2020-01-01T00:00:00Z") })
        .where(eq(companionUpdates.applicationId, approvedAppId));

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("network down");
        })
      );

      const result = await refreshAdvisoriesIfStale(approvedAppId, "de");

      // Stale but true beats empty: the traveller still sees the last
      // advisory we actually read, and nobody is alerted about nothing.
      expect(result.advisories).toHaveLength(1);
      expect(result.changed).toEqual([]);
    });
  });

  describe("approvedTravellersForAdvisories", () => {
    it("returns approved travellers with a resolved destination", async () => {
      const rows = await approvedTravellersForAdvisories(100);
      const mine = rows.filter((r) => IDS.includes(r.travelerId));

      expect(mine).toHaveLength(1);
      expect(mine[0].travelerId).toBe(APPROVED);
      expect(mine[0].destinationIso).toBe("de");
    });

    it("skips applications that are not approved or have no corridor", async () => {
      const rows = await approvedTravellersForAdvisories(100);
      const names = rows.map((r) => r.travelerId);

      expect(names).not.toContain(PENDING);
      expect(names).not.toContain(NO_CORRIDOR);
    });

    /**
     * A travel advisory is news somebody may reasonably not want emailed.
     *
     * `visa_expiring` deliberately ignores preferences — a deadline on
     * someone's leave to remain is not a digest — and says so where it
     * is queried. This one has no such argument: a traveller who has
     * turned the companion off has said what they want, and an
     * advisory is exactly the kind of update they turned off.
     */
    it("skips a traveller who has turned companion updates off", async () => {
      await db
        .update(profiles)
        .set({ notificationPrefs: { companionDigest: "off" } })
        .where(eq(profiles.id, APPROVED));

      try {
        const rows = await approvedTravellersForAdvisories(100);
        expect(rows.map((r) => r.travelerId)).not.toContain(APPROVED);
      } finally {
        await db
          .update(profiles)
          .set({ notificationPrefs: {} })
          .where(eq(profiles.id, APPROVED));
      }
    });

    it("includes a traveller who has never touched the setting", async () => {
      // `notificationPrefs` defaults to `{}`. An absent key is the
      // documented default, not "off" — the same trap `digest.ts` names:
      // `!= 'off'` evaluates to NULL against a missing key and silently
      // excludes everyone who never opened the setting.
      const rows = await approvedTravellersForAdvisories(100);
      expect(rows.map((r) => r.travelerId)).toContain(APPROVED);
    });
  });
});
