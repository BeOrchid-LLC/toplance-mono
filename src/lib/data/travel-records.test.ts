import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

/**
 * A traveller's past trips — the travel history a visa form asks for.
 * Rows are keyed on the traveller, not the application, and every
 * mutation is scoped to the owner's id: there is no way to name someone
 * else's record.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("travel records", async () => {
  const { db } = await import("@/lib/db/client");
  const { profiles } = await import("@/lib/db/schema");
  const { addTravelRecord, listTravelRecords, removeTravelRecord } =
    await import("@/lib/data/travel-records");

  const TRAVELLER = "test_history_traveller";
  const STRANGER = "test_history_stranger";

  beforeEach(async () => {
    await db.insert(profiles).values({
      id: TRAVELLER,
      email: "history@test.invalid",
      fullName: "Ada",
    });
    await db.insert(profiles).values({
      id: STRANGER,
      email: "stranger@test.invalid",
      fullName: "Mallory",
    });
  });

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, TRAVELLER));
    await db.delete(profiles).where(eq(profiles.id, STRANGER));
  });

  it("records a trip in the traveller's own words", async () => {
    const result = await addTravelRecord(TRAVELLER, {
      country: "Ghana",
      purpose: "Family visit",
      startedOn: "2024-06-01",
      endedOn: "2024-06-20",
    });

    expect(result).toEqual({ ok: true });
    const records = await listTravelRecords(TRAVELLER);
    expect(records).toHaveLength(1);
    expect(records[0].country).toBe("Ghana");
    expect(records[0].purpose).toBe("Family visit");
  });

  it("needs only a country — dates and purpose are the traveller's to offer", async () => {
    const result = await addTravelRecord(TRAVELLER, { country: "Benin" });

    expect(result).toEqual({ ok: true });
    expect(await listTravelRecords(TRAVELLER)).toHaveLength(1);
  });

  it("refuses a trip with no country", async () => {
    const result = await addTravelRecord(TRAVELLER, { country: "  " });

    expect(result).toHaveProperty("error");
    expect(await listTravelRecords(TRAVELLER)).toHaveLength(0);
  });

  it("refuses a trip that ends before it starts", async () => {
    const result = await addTravelRecord(TRAVELLER, {
      country: "Ghana",
      startedOn: "2024-06-20",
      endedOn: "2024-06-01",
    });

    expect(result).toHaveProperty("error");
  });

  it("refuses a date that is not a date", async () => {
    const result = await addTravelRecord(TRAVELLER, {
      country: "Ghana",
      startedOn: "June last year",
    });

    expect(result).toHaveProperty("error");
  });

  it("lists most recent trips first, undated trips last", async () => {
    await addTravelRecord(TRAVELLER, { country: "Undated" });
    await addTravelRecord(TRAVELLER, {
      country: "Older",
      startedOn: "2019-01-01",
    });
    await addTravelRecord(TRAVELLER, {
      country: "Newer",
      startedOn: "2024-01-01",
    });

    const records = await listTravelRecords(TRAVELLER);
    expect(records.map((r) => r.country)).toEqual([
      "Newer",
      "Older",
      "Undated",
    ]);
  });

  it("removes the traveller's own record", async () => {
    await addTravelRecord(TRAVELLER, { country: "Ghana" });
    const [record] = await listTravelRecords(TRAVELLER);

    const result = await removeTravelRecord(TRAVELLER, record.id);

    expect(result).toEqual({ ok: true });
    expect(await listTravelRecords(TRAVELLER)).toHaveLength(0);
  });

  it("never removes someone else's record", async () => {
    await addTravelRecord(TRAVELLER, { country: "Ghana" });
    const [record] = await listTravelRecords(TRAVELLER);

    const result = await removeTravelRecord(STRANGER, record.id);

    expect(result).toHaveProperty("error");
    expect(await listTravelRecords(TRAVELLER)).toHaveLength(1);
  });
});
