import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { completionOf, type DocumentRow } from "@/lib/data/applications";

/**
 * The ring answers "how much of the collecting is done", and collecting
 * ends when the file is uploaded — not when a reviewer signs it off.
 * Counting only `verified` froze the ring at 0% for every traveller,
 * because review happens later (and, before the ops actions existed, not
 * at all). `verified` is still reported separately: submission gates on
 * it, the ring does not.
 */
describe("completionOf", () => {
  const doc = (
    state: DocumentRow["state"],
    isRequired = true
  ): DocumentRow => ({ state, isRequired }) as DocumentRow;

  it("counts an uploaded (checking) document toward the percentage", () => {
    const { pct } = completionOf([doc("checking"), doc("not_started")]);
    expect(pct).toBe(50);
  });

  it("counts verified documents toward the percentage", () => {
    const { pct } = completionOf([doc("verified"), doc("checking")]);
    expect(pct).toBe(100);
  });

  it("counts a flagged document as collected — the file is in", () => {
    // The ring measures collecting, and a flagged document has been
    // collected: the traveller uploaded it and a reviewer looked. Taking
    // it back out dropped the ring the moment somebody was told their
    // passport photo was blurry, which reads as losing work they did.
    // `verified` still excludes it, and that is what the submit gate
    // reads.
    const { pct, verified } = completionOf([doc("flagged"), doc("checking")]);
    expect(pct).toBe(100);
    expect(verified).toBe(0);
  });

  it("does not count a failed document — nothing was stored", () => {
    // `failed` is an upload that never landed, not a verdict on one.
    const { pct } = completionOf([doc("failed"), doc("checking")]);
    expect(pct).toBe(50);
  });

  it("still reports the verified count on its own, for the submit gate", () => {
    const { verified, total } = completionOf([
      doc("verified"),
      doc("checking"),
      doc("not_started"),
    ]);
    expect(verified).toBe(1);
    expect(total).toBe(3);
  });

  it("ignores optional documents entirely", () => {
    const { pct, total } = completionOf([
      doc("verified"),
      doc("not_started", false),
    ]);
    expect(pct).toBe(100);
    expect(total).toBe(1);
  });

  it("reads an empty checklist as 0%, not 100%", () => {
    expect(completionOf([]).pct).toBe(0);
  });
});

/**
 * Suspension, from the access side.
 *
 * Removing an agency means suspending it, never deleting it: every
 * application, document and message stays intact and reversible on the
 * day they pay. What suspension takes away is the agency's reach, and
 * this is where it is taken. Filtering the memberships that reach
 * `Actor.orgIds` means `isAgencyFor` returns false for every policy at
 * once, rather than each surface remembering to check.
 *
 * The traveller is untouched. `ownsApplication` does not consult the
 * agency, so somebody whose interview is in nine days can still open
 * their own case while their agency is in a billing dispute.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("liveOrgIdsFor", async () => {
  const { inArray } = await import("drizzle-orm");
  const { db } = await import("@/lib/db/client");
  const { orgMembers, organisations, profiles } = await import("@/lib/db/schema");
  const { liveOrgIdsFor } = await import("@/lib/data/applications");

  const MEMBER = "test_suspend_member";
  // `…d0011` / `…d0012`, not `…d0001` / `…d0002`: `tenants.test.ts`
  // claims that pair for its own agencies, vitest runs the two files in
  // parallel against one database, and the loser of the race either
  // collides on the primary key or has its rows deleted mid-test by the
  // other file's `afterEach`. Fixture ids in this suite are global, so a
  // uuid used twice is two tests sharing a row.
  const LIVE = "00000000-0000-4000-8000-0000000d0011";
  const SUSPENDED = "00000000-0000-4000-8000-0000000d0012";

  beforeEach(async () => {
    await db
      .insert(profiles)
      .values({ id: MEMBER, email: "suspend@test.invalid", fullName: "Chidi" });
    await db.insert(organisations).values([
      { id: LIVE, name: "Live Agency" },
      { id: SUSPENDED, name: "Suspended Agency", suspendedAt: new Date() },
    ]);
    await db.insert(orgMembers).values([
      { orgId: LIVE, userId: MEMBER, role: "reviewer" },
      { orgId: SUSPENDED, userId: MEMBER, role: "owner" },
    ]);
  });

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, [MEMBER]));
    await db.delete(organisations).where(inArray(organisations.id, [LIVE, SUSPENDED]));
  });

  it("returns a membership of a live agency", async () => {
    expect(await liveOrgIdsFor(MEMBER)).toEqual([LIVE]);
  });

  it("drops a membership of a suspended agency, whatever the role", async () => {
    // Owner of the suspended one, reviewer of the live one — seniority
    // inside a suspended tenant buys nothing.
    expect(await liveOrgIdsFor(MEMBER)).not.toContain(SUSPENDED);
  });

  it("returns the membership again once the agency is reinstated", async () => {
    await db
      .update(organisations)
      .set({ suspendedAt: null })
      .where(inArray(organisations.id, [SUSPENDED]));

    expect((await liveOrgIdsFor(MEMBER)).sort()).toEqual([LIVE, SUSPENDED].sort());
  });
});
