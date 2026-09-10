import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * The read behind the "asked for, not built" panel.
 *
 * The ranking itself is tested without a database in
 * `@/lib/domain/corridor-demand`. What is left here is the wiring, and
 * it is the half a pure test cannot reach: that the query counts the
 * request event and not its neighbours, and that the live set it
 * subtracts is actually built from live corridors. Both mistakes leave
 * every pure test green and put the wrong routes on a reviewer's screen.
 *
 * Every row this file makes is deleted by id. `analytics_events` is an
 * append-only log of things that really happened — a tidy-up that
 * matched on the event *name* would take the product's own history with
 * it, and there is no undo for that.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("requestedRoutes", async () => {
  const { db } = await import("@/lib/db/client");
  const { analyticsEvents, corridors } = await import("@/lib/db/schema");
  const { requestedRoutes } = await import("@/lib/data/corridor-demand");
  const { routeKey } = await import("@/lib/domain/corridor-demand");

  // Codes no real corridor uses, so these rows cannot be confused with
  // the curated ones this database already holds.
  const NAT = "zz";
  const BUILT = "zy";
  const UNBUILT = "zx";

  const eventIds: number[] = [];
  const corridorIds: string[] = [];

  /** Insert events and remember them, so cleanup never guesses. */
  async function record(...props: Record<string, unknown>[]) {
    const rows = await db
      .insert(analyticsEvents)
      .values(props.map((p) => ({ name: "toplance.corridor_requested", props: p })))
      .returning({ id: analyticsEvents.id });

    eventIds.push(...rows.map((r) => r.id));
  }

  async function curate(destinationIso: string, isLive: boolean) {
    const [row] = await db
      .insert(corridors)
      .values({
        nationalityIso: NAT,
        destinationIso,
        purpose: "work",
        visaName: "Corridor demand test route",
        isLive,
      })
      .returning({ id: corridors.id });

    corridorIds.push(row.id);
  }

  /** Only the routes this test made, so parallel files cannot upset it. */
  const mine = async () =>
    (await requestedRoutes(50)).routes.filter((r) => r.nationality === NAT);

  afterEach(async () => {
    if (eventIds.length) {
      await db.delete(analyticsEvents).where(inArray(analyticsEvents.id, eventIds));
      eventIds.length = 0;
    }
    if (corridorIds.length) {
      await db.delete(corridors).where(inArray(corridors.id, corridorIds));
      corridorIds.length = 0;
    }
  });

  it("counts the request event and leaves its neighbours alone", async () => {
    // `corridor_resolved` is the opposite fact — a route that worked —
    // and it carries a near-identical props bag. Reading it here would
    // report the product's best-served corridors as its biggest gaps.
    await record({ nationalityIso: NAT, destinationIso: UNBUILT, purpose: "work" });

    const [resolved] = await db
      .insert(analyticsEvents)
      .values({
        name: "toplance.corridor_resolved",
        props: { nationalityIso: NAT, destinationIso: UNBUILT, purpose: "work" },
      })
      .returning({ id: analyticsEvents.id });
    eventIds.push(resolved.id);

    const routes = await mine();

    expect(routes).toHaveLength(1);
    expect(routes[0].count).toBe(1);
  });

  it("leaves out a route that is already live", async () => {
    await curate(BUILT, true);
    await record(
      { nationalityIso: NAT, destinationIso: BUILT, purpose: "work" },
      { nationalityIso: NAT, destinationIso: UNBUILT, purpose: "work" }
    );

    const routes = await mine();

    expect(routes.map((r) => r.destination)).toEqual([UNBUILT]);
  });

  it("still counts a route whose only version is a dark draft", async () => {
    // A draft serves nobody. `curatedProvider` reads `is_live`, so a
    // pending version leaves the traveller with the same empty checklist
    // as no corridor at all — and dropping it from this list would hide
    // demand behind work that has not shipped.
    await curate(UNBUILT, false);
    await record({ nationalityIso: NAT, destinationIso: UNBUILT, purpose: "work" });

    expect(await mine()).toHaveLength(1);
  });

  it("adds up the two shapes the intake records for one route", async () => {
    await record(
      { nationalityIso: NAT, destinationIso: "ca", purpose: "study" },
      { nationality: NAT, destination: "Canada", purpose: "Study" }
    );

    const routes = (await requestedRoutes(50)).routes.filter(
      (r) => r.key === routeKey(NAT, "ca", "study")
    );

    expect(routes).toHaveLength(1);
    expect(routes[0].count).toBe(2);
  });

  it("has nothing to report when nobody has asked", async () => {
    expect(await mine()).toEqual([]);
  });

  it("counts every unbuilt route, not only the ones it shows", async () => {
    // The counter beside the panel reads this. Reporting the length of a
    // capped list would peg it at the cap for ever: a console showing
    // "6" whether six routes are missing or sixty tells a director the
    // one thing that is never true.
    await record(
      { nationalityIso: NAT, destinationIso: "aa", purpose: "work" },
      { nationalityIso: NAT, destinationIso: "ab", purpose: "work" },
      { nationalityIso: NAT, destinationIso: "ac", purpose: "work" }
    );

    const asked = await requestedRoutes(2);

    expect(asked.routes).toHaveLength(2);
    expect(asked.total).toBeGreaterThanOrEqual(3);
  });

  it("reads the live set from every live corridor, not a sample", async () => {
    // A `limit` on the coverage query would be invisible here and wrong
    // everywhere: the routes it failed to fetch would all report as
    // gaps. Asserted against a corridor this database already serves.
    const [live] = await db
      .select({
        nationalityIso: corridors.nationalityIso,
        destinationIso: corridors.destinationIso,
        purpose: corridors.purpose,
      })
      .from(corridors)
      .where(eq(corridors.isLive, true))
      .limit(1);

    if (!live) return;

    await record({
      nationalityIso: live.nationalityIso,
      destinationIso: live.destinationIso,
      purpose: live.purpose,
    });

    const key = routeKey(live.nationalityIso, live.destinationIso, live.purpose);
    expect((await requestedRoutes(500)).routes.map((r) => r.key)).not.toContain(key);
  });
});
