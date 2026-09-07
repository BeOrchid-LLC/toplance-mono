import { describe, expect, it } from "vitest";

import {
  BUFFERED_KINDS,
  EMAIL_BUFFER_MS,
  emailDueFor,
} from "@/lib/notifications/email-buffer";

const NOW = new Date("2026-09-07T12:00:00.000Z");

describe("emailDueFor", () => {
  it("holds a flagged document back by the buffer", () => {
    expect(emailDueFor("document_flagged", NOW)).toEqual(
      new Date(NOW.getTime() + EMAIL_BUFFER_MS)
    );
  });

  it("holds a received message back by the buffer", () => {
    expect(emailDueFor("message_received", NOW)).toEqual(
      new Date(NOW.getTime() + EMAIL_BUFFER_MS)
    );
  });

  /**
   * The buffer only makes sense where there is an in-app moment to
   * miss. A visa expiring in thirty days arrives while the traveller is
   * elsewhere entirely; delaying it buys nothing and costs the notice.
   */
  it("sends everything else immediately", () => {
    for (const kind of [
      "application_submitted",
      "checklist_complete",
      "status_changed",
      "itinerary_ready",
      "advisory_changed",
      "visa_expiring",
      "companion_digest",
      "document_uploaded",
      "checklist_changed",
    ] as const) {
      expect(emailDueFor(kind, NOW)).toBeNull();
    }
  });

  it("buffers exactly the kinds it claims to", () => {
    expect([...BUFFERED_KINDS].sort()).toEqual([
      "document_flagged",
      "message_received",
    ]);
  });

  /** Fifteen minutes, and the unit is milliseconds. */
  it("waits fifteen minutes", () => {
    expect(EMAIL_BUFFER_MS).toBe(15 * 60 * 1000);
  });
});
