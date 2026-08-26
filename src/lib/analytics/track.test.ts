import { afterEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, isNull } from "drizzle-orm";

/**
 * Skipped without a database. Run `npm run db:up` to include these.
 *
 * Every read here is scoped to this file's own actor. `analytics_events`
 * is one table shared by every suite that exercises a code path which
 * emits — `recordIntakeAnswer` writes `corridor_requested` too — and
 * Vitest runs those files at the same time, against the same database.
 */
describe.skipIf(!process.env.DATABASE_URL)("track", async () => {
  const { db } = await import("@/lib/db/client");
  const { analyticsEvents, profiles } = await import("@/lib/db/schema");
  const { track } = await import("@/lib/analytics/track");

  const USER = "test_track_user";

  afterEach(async () => {
    await db
      .delete(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.name, "toplance.corridor_requested"),
          isNull(analyticsEvents.userId)
        )
      );
    await db.delete(profiles).where(inArray(profiles.id, [USER]));
    vi.restoreAllMocks();
  });

  it("records the name, the props and who acted", async () => {
    await db
      .insert(profiles)
      .values({ id: USER, email: "track@test.invalid", fullName: "Ada" });

    await track("toplance.corridor_requested", { destinationIso: "jp" }, USER);

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
    expect(row.props).toEqual({ destinationIso: "jp" });
    expect(row.userId).toBe(USER);
  });

  it("records an event with no user attached", async () => {
    await track("toplance.corridor_requested", { destinationIso: "jp" });

    const [row] = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.name, "toplance.corridor_requested"),
          isNull(analyticsEvents.userId)
        )
      );

    expect(row.userId).toBeNull();
  });

  it("swallows a write failure instead of breaking the caller", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    // No such profile, so the foreign key rejects the insert. A traveller
    // must not lose a passport scan because a metrics write failed.
    await expect(
      track("toplance.corridor_requested", {}, "no_such_user")
    ).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalledOnce();
  });
});
