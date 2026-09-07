import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * The traveller ↔ agency thread on a case. Like `case-notes.ts`, these
 * functions decide nothing about access — callers guard with
 * `canWriteMessages` / `canReadMessages` first.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("messages", async () => {
  const { db } = await import("@/lib/db/client");
  const { seedTestAgency } = await import("@/lib/db/test-agency");
  const { applications, profiles } = await import("@/lib/db/schema");
  const {
    listMessages,
    markThreadRead,
    sendMessageRow,
    sideOf,
    unreadCountFor,
  } = await import("@/lib/data/messages");

  const TRAVELLER = "test_messages_traveller";
  const STAFF = "test_messages_staff";

  /** Every case belongs to an agency since v1.3. */
  const TEST_AGENCY = "00000000-0000-4000-8000-0000000c0010";

  let applicationId = "";

  beforeEach(async () => {
    await seedTestAgency(TEST_AGENCY);
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "messages-traveller@test.invalid",
      fullName: "Ada",
    });
    await db.insert(profiles).values({
      id: STAFF,
      email: "messages-staff@test.invalid",
      fullName: "Grace",
      role: "staff",
    });

    const [app] = await db
      .insert(applications)
      .values({ orgId: TEST_AGENCY, travelerId: TRAVELLER, intakeComplete: true })
      .returning({ id: applications.id });
    applicationId = app.id;
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(profiles).where(eq(profiles.id, STAFF));
  });

  it("records a message with its sender", async () => {
    const result = await sendMessageRow(
      applicationId,
      TRAVELLER,
      "traveler",
      "When will my passport be checked?"
    );

    expect(result).toEqual({ ok: true });
    const thread = await listMessages(applicationId);
    expect(thread).toHaveLength(1);
    expect(thread[0].body).toBe("When will my passport be checked?");
    expect(thread[0].senderName).toBe("Ada");
    expect(thread[0].side).toBe("traveler");
  });

  it("refuses an empty message", async () => {
    const result = await sendMessageRow(applicationId, TRAVELLER, "traveler", "   ");

    expect(result).toHaveProperty("error");
    expect(await listMessages(applicationId)).toHaveLength(0);
  });

  it("refuses a message over 2,000 characters", async () => {
    const result = await sendMessageRow(
      applicationId,
      TRAVELLER,
      "traveler",
      "a".repeat(2001)
    );

    expect(result).toHaveProperty("error");
    expect(await listMessages(applicationId)).toHaveLength(0);
  });

  it("refuses a message on an application that does not exist", async () => {
    const result = await sendMessageRow(
      "00000000-0000-0000-0000-000000000000",
      TRAVELLER,
      "traveler",
      "Orphan message."
    );

    expect(result).toHaveProperty("error");
  });

  it("returns messages oldest first — a thread reads in order", async () => {
    await sendMessageRow(applicationId, TRAVELLER, "traveler", "First.");
    await sendMessageRow(applicationId, STAFF, "agency", "Second.");

    const thread = await listMessages(applicationId);
    expect(thread.map((m) => m.body)).toEqual(["First.", "Second."]);
  });

  it("keeps the message but drops the name when the sender is deleted", async () => {
    await sendMessageRow(applicationId, STAFF, "agency", "Kept after the sender goes.");
    await db.delete(profiles).where(eq(profiles.id, STAFF));

    const thread = await listMessages(applicationId);
    expect(thread).toHaveLength(1);
    expect(thread[0].senderName).toBeNull();
  });

  /**
   * Rows written before #51, when the agency's half of the thread was
   * BeOrchid's. They are the reason the sides are defined by the
   * traveller rather than by naming the agency's own role: `staff` is
   * still in the column, and it was never the traveller talking.
   */
  it("reads a message stored under the old staff role as the agency's", async () => {
    const { messages } = await import("@/lib/db/schema");
    await db.insert(messages).values({
      applicationId,
      senderId: STAFF,
      senderRole: "staff",
      body: "Written before the review boundary moved.",
    });

    const thread = await listMessages(applicationId);
    expect(thread[0].side).toBe("agency");
    expect(sideOf("staff")).toBe("agency");
    expect(sideOf("org_member")).toBe("agency");
    expect(sideOf("traveler")).toBe("traveler");
  });

  it("counts a legacy staff row as unread for the traveller, not for the agency", async () => {
    const { messages } = await import("@/lib/db/schema");
    await db.insert(messages).values({
      applicationId,
      senderId: STAFF,
      senderRole: "staff",
      body: "Still waiting to be read.",
    });

    // The bug this replaces: `ne(senderRole, readerRole)` counted the
    // agency's own legacy message as unread *for the agency*.
    expect(await unreadCountFor(applicationId, "traveler")).toBe(1);
    expect(await unreadCountFor(applicationId, "agency")).toBe(0);
  });

  describe("markThreadRead", () => {
    it("flips only the counterpart's unread rows when the agency reads the thread", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "From the traveller.");
      await sendMessageRow(applicationId, STAFF, "agency", "From staff.");

      await markThreadRead(applicationId, "agency");

      const thread = await listMessages(applicationId);
      const fromTraveller = thread.find((m) => m.side === "traveler");
      const fromAgency = thread.find((m) => m.side === "agency");
      expect(fromTraveller?.readAt).not.toBeNull();
      expect(fromAgency?.readAt).toBeNull();
    });

    it("flips only the counterpart's unread rows when the traveller reads the thread", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "From the traveller.");
      await sendMessageRow(applicationId, STAFF, "agency", "From staff.");

      await markThreadRead(applicationId, "traveler");

      const thread = await listMessages(applicationId);
      const fromTraveller = thread.find((m) => m.side === "traveler");
      const fromAgency = thread.find((m) => m.side === "agency");
      expect(fromAgency?.readAt).not.toBeNull();
      expect(fromTraveller?.readAt).toBeNull();
    });

    it("is idempotent — reading twice does not error or move the timestamp", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "From the traveller.");

      await markThreadRead(applicationId, "agency");
      const [firstRead] = await listMessages(applicationId);

      await markThreadRead(applicationId, "agency");
      const [secondRead] = await listMessages(applicationId);

      expect(secondRead.readAt).toEqual(firstRead.readAt);
    });
  });

  describe("unreadCountFor", () => {
    it("counts only the counterpart's unread messages, per role", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "One.");
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "Two.");
      await sendMessageRow(applicationId, STAFF, "agency", "Reply.");

      expect(await unreadCountFor(applicationId, "agency")).toBe(2);
      expect(await unreadCountFor(applicationId, "traveler")).toBe(1);
    });

    it("drops to zero once the thread is marked read", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "One.");
      await markThreadRead(applicationId, "agency");

      expect(await unreadCountFor(applicationId, "agency")).toBe(0);
    });
  });
});
