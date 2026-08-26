import { describe, expect, it } from "vitest";

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

  it("does not count flagged or failed documents — they need action", () => {
    const { pct } = completionOf([doc("flagged"), doc("checking")]);
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
