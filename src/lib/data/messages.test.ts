import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * The traveller ↔ staff thread on a case. Like `case-notes.ts`, these
 * functions decide nothing about access — callers guard with
 * `canWriteMessages` / `canReadMessages` first.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("messages", async () => {
  const { db } = await import("@/lib/db/client");
  const { applications, profiles } = await import("@/lib/db/schema");
  const {
    listMessages,
    markThreadRead,
    sendMessageRow,
    unreadCountFor,
  } = await import("@/lib/data/messages");

  const TRAVELLER = "test_messages_traveller";
  const STAFF = "test_messages_staff";
  let applicationId = "";

  beforeEach(async () => {
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
      .values({ travelerId: TRAVELLER, intakeComplete: true })
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
    expect(thread[0].senderRole).toBe("traveler");
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
    await sendMessageRow(applicationId, STAFF, "staff", "Second.");

    const thread = await listMessages(applicationId);
    expect(thread.map((m) => m.body)).toEqual(["First.", "Second."]);
  });

  it("keeps the message but drops the name when the sender is deleted", async () => {
    await sendMessageRow(applicationId, STAFF, "staff", "Kept after the sender goes.");
    await db.delete(profiles).where(eq(profiles.id, STAFF));

    const thread = await listMessages(applicationId);
    expect(thread).toHaveLength(1);
    expect(thread[0].senderName).toBeNull();
  });

  describe("markThreadRead", () => {
    it("flips only the counterpart's unread rows when staff reads the thread", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "From the traveller.");
      await sendMessageRow(applicationId, STAFF, "staff", "From staff.");

      await markThreadRead(applicationId, "staff");

      const thread = await listMessages(applicationId);
      const fromTraveller = thread.find((m) => m.senderRole === "traveler");
      const fromStaff = thread.find((m) => m.senderRole === "staff");
      expect(fromTraveller?.readAt).not.toBeNull();
      expect(fromStaff?.readAt).toBeNull();
    });

    it("flips only the counterpart's unread rows when the traveller reads the thread", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "From the traveller.");
      await sendMessageRow(applicationId, STAFF, "staff", "From staff.");

      await markThreadRead(applicationId, "traveler");

      const thread = await listMessages(applicationId);
      const fromTraveller = thread.find((m) => m.senderRole === "traveler");
      const fromStaff = thread.find((m) => m.senderRole === "staff");
      expect(fromStaff?.readAt).not.toBeNull();
      expect(fromTraveller?.readAt).toBeNull();
    });

    it("is idempotent — reading twice does not error or move the timestamp", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "From the traveller.");

      await markThreadRead(applicationId, "staff");
      const [firstRead] = await listMessages(applicationId);

      await markThreadRead(applicationId, "staff");
      const [secondRead] = await listMessages(applicationId);

      expect(secondRead.readAt).toEqual(firstRead.readAt);
    });
  });

  describe("unreadCountFor", () => {
    it("counts only the counterpart's unread messages, per role", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "One.");
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "Two.");
      await sendMessageRow(applicationId, STAFF, "staff", "Reply.");

      expect(await unreadCountFor(applicationId, "staff")).toBe(2);
      expect(await unreadCountFor(applicationId, "traveler")).toBe(1);
    });

    it("drops to zero once the thread is marked read", async () => {
      await sendMessageRow(applicationId, TRAVELLER, "traveler", "One.");
      await markThreadRead(applicationId, "staff");

      expect(await unreadCountFor(applicationId, "staff")).toBe(0);
    });
  });
});
