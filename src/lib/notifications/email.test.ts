import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "@/lib/notifications/email";

/**
 * `sendEmail` never throws, which is right — no email is worth failing
 * the action that triggered it. But "never throws" had become "never
 * says anything either": a missing `RESEND_API_KEY` and a 4xx from
 * Resend both returned `undefined`, indistinguishable from a delivery.
 *
 * The invitation sheet is what made that a problem. #58 removed its
 * "Copy link" button, so the email is now the entire hand-off — and the
 * sheet still said "Invitation sent" on a deployment where nothing had
 * been sent and no screen could tell the sender otherwise.
 *
 * So: still never throws, now reports.
 */
const letter = {
  to: "ada@sunwaytravel.ng",
  subject: "Your invitation",
  html: "<p>Hello</p>",
  text: "Hello",
};

describe("sendEmail", () => {
  const key = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = key;
  });

  it("reports no delivery when there is no API key", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(sendEmail(letter)).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports delivery when Resend accepts it", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"id":"abc"}', { status: 200 })
    );

    await expect(sendEmail(letter)).resolves.toBe(true);
  });

  it("reports no delivery when Resend refuses it", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"message":"domain not verified"}', { status: 403 })
    );

    await expect(sendEmail(letter)).resolves.toBe(false);
  });

  it("reports no delivery, rather than throwing, when the network fails", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(sendEmail(letter)).resolves.toBe(false);
  });
});
