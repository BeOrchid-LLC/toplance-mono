import { afterEach, describe, expect, it, vi } from "vitest";

import { mockProvider } from "@/lib/payments/mock";
import { paymentProvider } from "@/lib/payments";

afterEach(() => {
  vi.unstubAllEnvs();
});

const intent = {
  kind: "client_application" as const,
  amountMinor: 25_00,
  currency: "USD",
  reference: "00000000-0000-0000-0000-000000000001",
};

describe("the mock provider", () => {
  it("mints a ref that says what it is", async () => {
    const { providerRef } = await mockProvider().createCheckout(intent);
    expect(providerRef).toMatch(/^mock_/);
  });

  it("mints a different ref every time", async () => {
    // Two payments for the same thing are two payments. A ref derived
    // from the intent would collide on exactly the retry this has to
    // tell apart from the original.
    const provider = mockProvider();
    const first = await provider.createCheckout(intent);
    const second = await provider.createCheckout(intent);
    expect(first.providerRef).not.toBe(second.providerRef);
  });

  it("settles immediately, with no redirect to follow", async () => {
    const provider = mockProvider();
    const { providerRef, redirectUrl } = await provider.createCheckout(intent);
    expect(redirectUrl).toBeNull();
    expect(await provider.confirm(providerRef)).toEqual({ status: "paid" });
  });

  it("refuses to run in a production build", async () => {
    // The one failure here that a deploy cannot undo: a fake payment
    // path that survives into production takes real money's place
    // silently. Same stance `staffTwoFactorSkipped` takes on the 2FA
    // seam, and for the same reason.
    vi.stubEnv("NODE_ENV", "production");
    await expect(mockProvider().createCheckout(intent)).rejects.toThrow(/production/i);
  });

  it("can be let into a production build on purpose", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENTS_ALLOW_MOCK", "1");
    await expect(mockProvider().createCheckout(intent)).resolves.toBeTruthy();
  });
});

describe("choosing a provider", () => {
  it("defaults to the mock", () => {
    expect(paymentProvider().name).toBe("mock");
  });

  it("refuses a provider it does not have", () => {
    // Falling back to the mock would mean a typo in an environment
    // variable quietly stops charging anyone.
    vi.stubEnv("PAYMENTS_PROVIDER", "stripe");
    expect(() => paymentProvider()).toThrow(/stripe/);
  });
});
