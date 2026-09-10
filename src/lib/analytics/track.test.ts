import { afterEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";

/**
 * Skipped without a database. Run `npm run db:up` to include these.
 *
 * Every read AND every delete here is scoped to this file's own rows.
 * `analytics_events` is one table shared by every suite that exercises a
 * code path which emits — `recordIntakeAnswer` writes
 * `corridor_requested` too — and Vitest runs those files at the same
 * time, against the same database.
 *
 * The scoping used to be `name = 'toplance.corridor_requested' and
 * user_id is null`, which is not this file's rows: it is *everybody's*
 * anonymous requests. That deleted the demand seeded by
 * `corridors:seed-demand` on every run, so the "asked for, not built"
 * panels emptied themselves whenever anyone ran the tests — and it read
 * back an arbitrary one of those rows to assert against. Marking the
 * rows and matching on the mark fixes both.
 */
describe.skipIf(!process.env.DATABASE_URL)("track", async () => {
  const { db } = await import("@/lib/db/client");
  const { analyticsEvents, profiles } = await import("@/lib/db/schema");
  const { track } = await import("@/lib/analytics/track");

  const USER = "test_track_user";
  /** On every props bag this file writes, and on nobody else's. */
  const MARK = "track_test";

  const mine = sql`${analyticsEvents.props} ->> 'test' = ${MARK}`;

  afterEach(async () => {
    // Before the profile, not after. `user_id` is `on delete set null`,
    // so removing the profile first would orphan this file's own event
    // into exactly the anonymous pile the old filter then swept up.
    await db.delete(analyticsEvents).where(mine);
    await db.delete(profiles).where(inArray(profiles.id, [USER]));
    vi.restoreAllMocks();
  });

  it("records the name, the props and who acted", async () => {
    await db
      .insert(profiles)
      .values({ id: USER, email: "track@test.invalid", fullName: "Ada" });

    await track(
      "toplance.corridor_requested",
      { destinationIso: "jp", test: MARK },
      USER
    );

    const [row] = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.name, "toplance.corridor_requested"),
          eq(analyticsEvents.userId, USER)
        )
      );

    expect(row.name).toBe("toplance.corridor_requested");
    expect(row.props).toEqual({ destinationIso: "jp", test: MARK });
    expect(row.userId).toBe(USER);
  });

  it("records an event with no user attached", async () => {
    await track("toplance.corridor_requested", { destinationIso: "jp", test: MARK });

    // Matched on this file's mark, not on "any anonymous request": the
    // seeded route demand is a pile of anonymous requests, and reading
    // `[0]` out of it asserted against a row this test never wrote.
    const [row] = await db.select().from(analyticsEvents).where(mine);

    expect(row.userId).toBeNull();
  });

  it("swallows a write failure instead of breaking the caller", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    // No such profile, so the foreign key rejects the insert. A traveller
    // must not lose a passport scan because a metrics write failed.
    await expect(
      track("toplance.corridor_requested", { test: MARK }, "no_such_user")
    ).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalledOnce();
  });
});
