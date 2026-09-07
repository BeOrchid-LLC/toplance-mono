import { describe, expect, it, beforeEach } from "vitest";
import { eq } from "drizzle-orm";

/**
 * The landing page's demo form, end to end from `FormData` to a row.
 *
 * `requestDemo` writes before it notifies, so what these assert is the
 * row — not the email, which `sendEmail` deliberately swallows the
 * failure of. `RESEND_API_KEY` is deleted up front for the same reason
 * `notify.test.ts` does it: a developer's own `.env.local` might carry a
 * real one, and no test should reach resend.com.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe.skipIf(!process.env.DATABASE_URL)("requestDemo", async () => {
  delete process.env.RESEND_API_KEY;

  const { db } = await import("@/lib/db/client");
  const { demoRequests } = await import("@/lib/db/schema");
  const { requestDemo } = await import("./actions");

  /** A distinct address per run, so one suite cannot poison the next. */
  const address = () => `bola+${crypto.randomUUID()}@sunwaytravel.ng`;

  function form(overrides: Record<string, string> = {}): FormData {
    const data = new FormData();
    const fields: Record<string, string> = {
      full_name: "Bola Adeyemi",
      email: address(),
      company_name: "Sunway Travel",
      job_title: "Operations Lead",
      preferred_local: "2026-09-15T14:00",
      preferred_tz: "Africa/Lagos",
      locale: "en",
      ...overrides,
    };
    for (const [key, value] of Object.entries(fields)) data.append(key, value);
    return data;
  }

  const rowsFor = (email: string) =>
    db.select().from(demoRequests).where(eq(demoRequests.email, email));

  beforeEach(async () => {
    await db.delete(demoRequests).where(eq(demoRequests.companyName, "Sunway Travel"));
  });

  it("writes one row carrying what was submitted", async () => {
    const email = address();
    const result = await requestDemo(form({ email }));

    expect(result).toEqual({ ok: true });

    const rows = await rowsFor(email);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fullName: "Bola Adeyemi",
      email,
      companyName: "Sunway Travel",
      jobTitle: "Operations Lead",
      preferredTz: "Africa/Lagos",
      locale: "en",
    });
    // 14:00 in Lagos is 13:00 UTC — the instant, not the wall clock.
    expect(rows[0].preferredAt).toEqual(new Date("2026-09-15T13:00:00Z"));
  });

  it("refuses a submission missing a required field, and writes nothing", async () => {
    const email = address();
    const result = await requestDemo(form({ email, job_title: "  " }));

    expect(result).toHaveProperty("error");
    expect(await rowsFor(email)).toHaveLength(0);
  });

  /**
   * A bot that fills every input it finds is told the same thing a
   * person is. Anything else — an error, a different shape, a slower
   * reply — is a signal it can tune against.
   */
  it("tells a honeypot submission it succeeded, and writes nothing", async () => {
    const email = address();
    const result = await requestDemo(form({ email, website: "http://spam.example" }));

    expect(result).toEqual({ ok: true });
    expect(await rowsFor(email)).toHaveLength(0);
  });

  it("refuses a second request from the same address within a day", async () => {
    const email = address();

    expect(await requestDemo(form({ email }))).toEqual({ ok: true });

    const second = await requestDemo(form({ email }));
    expect(second).toHaveProperty("error");
    expect(await rowsFor(email)).toHaveLength(1);
  });

  it("lets a different person at the same agency ask separately", async () => {
    const first = address();
    const second = address();

    expect(await requestDemo(form({ email: first }))).toEqual({ ok: true });
    expect(await requestDemo(form({ email: second }))).toEqual({ ok: true });
  });

  it("matches the duplicate guard on the address as stored, not as typed", async () => {
    const email = address();

    expect(await requestDemo(form({ email }))).toEqual({ ok: true });

    const shouting = await requestDemo(form({ email: email.toUpperCase() }));
    expect(shouting).toHaveProperty("error");
    expect(await rowsFor(email)).toHaveLength(1);
  });

  it("records an unknown locale rather than refusing the lead over it", async () => {
    const email = address();
    const result = await requestDemo(form({ email, locale: "" }));

    expect(result).toEqual({ ok: true });
    expect((await rowsFor(email))[0].locale).toBe("en");
  });
});
