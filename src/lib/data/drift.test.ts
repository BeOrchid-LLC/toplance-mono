import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

import { contentHash } from "@/lib/data/drift";

/**
 * Drift detection, against the real database.
 *
 * The rule under test is the one that would be catastrophic to get
 * wrong: **a changed source page must never rewrite what a traveller is
 * currently being served.** It raises a dark copy for an owner instead.
 * A job that silently corrected live data would be the invented
 * checklist the engine refuses, with nobody having asked for it.
 *
 * Skipped without a database. Run `npm run db:up` to include them.
 */
describe("contentHash", () => {
  it("ignores markup so a template change is not a paperwork change", () => {
    const a = contentHash("<div class='a'><p>Bring a passport.</p></div>");
    const b = contentHash("<section id='x'>  Bring a passport.  </section>");

    expect(a).toBe(b);
  });

  it("ignores a rotating script bundle", () => {
    const a = contentHash("<p>Fee: 819</p><script>var v='abc123'</script>");
    const b = contentHash("<p>Fee: 819</p><script>var v='zzz999'</script>");

    expect(a).toBe(b);
  });

  it("notices the words actually changing", () => {
    expect(contentHash("<p>Fee: 719</p>")).not.toBe(contentHash("<p>Fee: 819</p>"));
  });
});

describe.skipIf(!process.env.DATABASE_URL)("recheckCorridors", async () => {
  const { db } = await import("@/lib/db/client");
  const { corridorRequirements, corridors } = await import("@/lib/db/schema");
  const { recheckCorridors } = await import("@/lib/data/drift");
  const { curatedProvider } = await import("@/lib/visa/curated");

  const QUERY = {
    nationalityIso: "zd",
    destinationIso: "ze",
    purpose: "work" as const,
  };
  const SOURCE = "https://example.invalid/checklist";
  const ids: string[] = [];

  const PAGE_OLD = "<html><body><p>Bring a passport.</p></body></html>";
  const PAGE_NEW = "<html><body><p>Bring a passport and a TB test.</p></body></html>";

  async function liveCorridor(sourceHash: string | null) {
    const [row] = await db
      .insert(corridors)
      .values({
        ...QUERY,
        visaName: "Drift Test Visa",
        version: 1,
        isLive: true,
        reviewState: "approved",
        sourceUrl: SOURCE,
        sourceHash,
        governmentFeeMinor: 71900,
        governmentFeeCurrency: "GBP",
      })
      .returning({ id: corridors.id });

    await db.insert(corridorRequirements).values({
      corridorId: row.id,
      docKey: "passport",
      name: "Passport",
      sortOrder: 1,
      sourceUrl: SOURCE,
    });

    ids.push(row.id);
    return row.id;
  }

  const serve = (html: string) =>
    vi.stubGlobal("fetch", async () => new Response(html, { status: 200 }));

  beforeEach(() => {
    serve(PAGE_OLD);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    const all = await db
      .select({ id: corridors.id })
      .from(corridors)
      .where(eq(corridors.nationalityIso, QUERY.nationalityIso));
    if (all.length) {
      await db.delete(corridors).where(inArray(corridors.id, all.map((r) => r.id)));
    }
    ids.length = 0;
  });

  /** Only the rows this suite created, whatever else the table holds. */
  async function versions() {
    return db
      .select()
      .from(corridors)
      .where(eq(corridors.nationalityIso, QUERY.nationalityIso))
      .orderBy(corridors.version);
  }

  it("records a baseline on first sighting rather than crying drift", async () => {
    await liveCorridor(null);

    const result = await recheckCorridors({ only: ids });

    // A corridor nobody has hashed is not a corridor that changed. The
    // seeded four are in exactly this state, and reporting them all as
    // drifted on the first sweep would be noise, not signal.
    expect(result.baselined).toBe(1);
    expect(result.drifted.filter((d) => ids.includes(d.corridorId))).toEqual([]);
    expect((await versions())[0].sourceHash).toBe(contentHash(PAGE_OLD));
  });

  it("does nothing when the page has not moved", async () => {
    await liveCorridor(contentHash(PAGE_OLD));

    const result = await recheckCorridors({ only: ids });

    expect(result.drifted.filter((d) => ids.includes(d.corridorId))).toEqual([]);
    expect(await versions()).toHaveLength(1);
  });

  it("raises a dark copy when the page changes, and leaves live alone", async () => {
    const liveId = await liveCorridor(contentHash(PAGE_OLD));
    serve(PAGE_NEW);

    const result = await recheckCorridors({ only: ids });

    expect(result.drifted.map((d) => d.corridorId)).toContain(liveId);

    const rows = await versions();
    expect(rows).toHaveLength(2);

    const [live, draft] = rows;
    // The live row still serves, untouched apart from its hash moving
    // forward so the next sweep does not raise the same change again.
    expect(live.id).toBe(liveId);
    expect(live.isLive).toBe(true);
    expect(live.reviewState).toBe("approved");
    expect(live.sourceHash).toBe(contentHash(PAGE_NEW));

    // The copy is dark and awaiting a person.
    expect(draft.version).toBe(2);
    expect(draft.isLive).toBe(false);
    expect(draft.reviewState).toBe("pending");

    // And a traveller still resolves to the live version, not the draft.
    expect((await curatedProvider.fetch(QUERY))?.corridorId).toBe(liveId);
  });

  it("never forges an approver on the copy it raises", async () => {
    await liveCorridor(contentHash(PAGE_OLD));
    serve(PAGE_NEW);
    await recheckCorridors({ only: ids });

    const draft = (await versions())[1];
    // Carrying the live row's approver across would be a signature
    // nobody wrote — the corridor's whole accountability claim.
    expect(draft.approvedBy).toBeNull();
    expect(draft.approvedAt).toBeNull();
    expect(draft.lastVerifiedAt).toBeNull();
  });

  it("copies the requirements so the draft is reviewable", async () => {
    await liveCorridor(contentHash(PAGE_OLD));
    serve(PAGE_NEW);
    await recheckCorridors({ only: ids });

    const draft = (await versions())[1];
    const copied = await db
      .select()
      .from(corridorRequirements)
      .where(eq(corridorRequirements.corridorId, draft.id));

    // An empty draft could not be approved at all — `approveCorridorTx`
    // refuses one, so a copy with no requirements would be a dead end.
    expect(copied.map((r) => r.docKey)).toEqual(["passport"]);
    expect(copied[0].sourceUrl).toBe(SOURCE);
  });

  it("treats an unreachable source as unknown, not as changed", async () => {
    const liveId = await liveCorridor(contentHash(PAGE_OLD));
    vi.stubGlobal("fetch", async () => new Response("down", { status: 503 }));

    const result = await recheckCorridors({ only: ids });

    // A source that is down is not a source that changed. Nothing is
    // written, so the next run simply tries again.
    expect(result.failed.map((f) => f.corridorId)).toContain(liveId);
    expect(await versions()).toHaveLength(1);
  });

  it("does not raise a second copy for the same change", async () => {
    await liveCorridor(contentHash(PAGE_OLD));
    serve(PAGE_NEW);

    await recheckCorridors({ only: ids });
    await recheckCorridors({ only: ids });

    // The live row's hash moved forward on the first pass, so the
    // review queue gets one item per change rather than one per sweep.
    expect(await versions()).toHaveLength(2);
  });
});
