import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

/**
 * The one piece of `postSupportMessage` that is not an insert: a staff
 * reply takes an unclaimed request. Skipped without a database — the
 * rule about *who may post* is `support-thread.test.ts`, which runs
 * everywhere.
 */
describe.skipIf(!process.env.DATABASE_URL)("support threads", async () => {
  const { db } = await import("@/lib/db/client");
  const { organisations, profiles, supportRequests } = await import("@/lib/db/schema");
  const { listSupportMessages, postSupportMessage, raiseSupportRequest } = await import(
    "@/lib/data/support"
  );

  const orgIds: string[] = [];
  const userIds: string[] = [];

  async function seed() {
    const [org] = await db
      .insert(organisations)
      .values({ name: "Support Thread Agency" })
      .returning({ id: organisations.id });
    orgIds.push(org.id);

    for (const id of ["test_support_agency", "test_support_staff"]) {
      await db
        .insert(profiles)
        .values({ id, email: `${id}@test.invalid`, fullName: id })
        .onConflictDoNothing();
      userIds.push(id);
    }

    const requestId = await raiseSupportRequest({
      orgId: org.id,
      raisedBy: "test_support_agency",
      subject: "A suspended agency cannot open its cases",
      body: "We were suspended this morning.",
    });

    return { orgId: org.id, requestId };
  }

  afterEach(async () => {
    await db.delete(profiles).where(inArray(profiles.id, userIds));
    await db.delete(organisations).where(inArray(organisations.id, orgIds));
    orgIds.length = 0;
    userIds.length = 0;
  });

  it("puts a staff reply on the thread after the agency's opening message", async () => {
    const { requestId } = await seed();

    await postSupportMessage({
      requestId,
      authorId: "test_support_staff",
      fromStaff: true,
      body: "We have lifted the suspension.",
    });

    const thread = await listSupportMessages(requestId);
    expect(thread).toHaveLength(1);
    expect(thread[0].fromStaff).toBe(true);
    expect(thread[0].body).toBe("We have lifted the suspension.");
  });

  it("claims an open request for whoever answers it", async () => {
    // Answering somebody is taking the request. Leaving it unclaimed
    // after writing to the agency invites a colleague to answer twice.
    const { requestId } = await seed();

    await postSupportMessage({
      requestId,
      authorId: "test_support_staff",
      fromStaff: true,
      body: "Looking into this now.",
    });

    const [row] = await db
      .select({ state: supportRequests.state, assigneeId: supportRequests.assigneeId })
      .from(supportRequests)
      .where(eq(supportRequests.id, requestId));

    expect(row.state).toBe("claimed");
    expect(row.assigneeId).toBe("test_support_staff");
  });

  it("does not take a request off the colleague already holding it", async () => {
    const { requestId } = await seed();
    await postSupportMessage({
      requestId,
      authorId: "test_support_staff",
      fromStaff: true,
      body: "Mine.",
    });

    // A second member of staff adds to the same thread.
    await db
      .insert(profiles)
      .values({ id: "test_support_staff2", email: "s2@test.invalid", fullName: "Second" })
      .onConflictDoNothing();
    userIds.push("test_support_staff2");

    await postSupportMessage({
      requestId,
      authorId: "test_support_staff2",
      fromStaff: true,
      body: "Adding a note.",
    });

    const [row] = await db
      .select({ assigneeId: supportRequests.assigneeId })
      .from(supportRequests)
      .where(eq(supportRequests.id, requestId));

    expect(row.assigneeId).toBe("test_support_staff");
  });

  it("leaves the request alone when the agency writes back", async () => {
    const { requestId } = await seed();

    await postSupportMessage({
      requestId,
      authorId: "test_support_agency",
      fromStaff: false,
      body: "Any news?",
    });

    const [row] = await db
      .select({ state: supportRequests.state, assigneeId: supportRequests.assigneeId })
      .from(supportRequests)
      .where(eq(supportRequests.id, requestId));

    expect(row.state).toBe("open");
    expect(row.assigneeId).toBeNull();
  });
});

/**
 * The check that stops one agency naming another's traveller on a
 * support request. Database-gated, because ownership is a row.
 */
describe.skipIf(!process.env.DATABASE_URL)("applicationBelongsToOrg", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, organisations, profiles } = await import("@/lib/db/schema");
  const { applicationBelongsToOrg } = await import("@/lib/data/support");

  it("says yes only for the agency that holds the case", async () => {
    const [mine] = await db
      .insert(organisations)
      .values({ name: "Case Owner Agency" })
      .returning({ id: organisations.id });
    const [theirs] = await db
      .insert(organisations)
      .values({ name: "Other Agency" })
      .returning({ id: organisations.id });

    await db
      .insert(profiles)
      .values({
        id: "test_case_traveller",
        email: "case@test.invalid",
        fullName: "Case Traveller",
      })
      .onConflictDoNothing();

    const [app] = await db
      .insert(applications)
      .values({ travelerId: "test_case_traveller", orgId: mine.id })
      .returning({ id: applications.id });

    expect(await applicationBelongsToOrg(app.id, mine.id)).toBe(true);
    expect(await applicationBelongsToOrg(app.id, theirs.id)).toBe(false);

    await db.delete(applications).where(eq(applications.id, app.id));
    await db.delete(profiles).where(eq(profiles.id, "test_case_traveller"));
    await db
      .delete(organisations)
      .where(inArray(organisations.id, [mine.id, theirs.id]));
  });
});
