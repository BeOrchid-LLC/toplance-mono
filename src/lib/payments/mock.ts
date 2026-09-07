import { randomUUID } from "node:crypto";

import type { PaymentIntent, PaymentProvider } from "@/lib/payments/provider";

/**
 * Whether the fake payment path is allowed to run.
 *
 * Off in a production build whatever the environment says, unless
 * somebody sets `PAYMENTS_ALLOW_MOCK=1` on purpose — the same shape as
 * `staffTwoFactorSkipped()` in `@/lib/auth/staff-gate`, and for a
 * sharper reason. A variable that leaks into a deployed environment can
 * stand down a second factor; this one takes real money's place and
 * reports success, and nothing downstream can tell the difference.
 */
function mockAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.PAYMENTS_ALLOW_MOCK === "1";
}

/**
 * A provider that always succeeds, immediately.
 *
 * There is no network, no key and no webhook. `createCheckout` settles
 * on the spot and returns no redirect, so the calling action writes a
 * `paid` row and the payer never leaves the page.
 *
 * The `pending` status still exists in the schema and this provider
 * simply never produces it. That is the point of keeping it: a real
 * provider returns a URL and settles later on a webhook, and the shape
 * of the table should not have to change on the day one arrives.
 */
export function mockProvider(): PaymentProvider {
  return {
    name: "mock",

    async createCheckout(intent: PaymentIntent) {
      if (!mockAllowed()) {
        throw new Error(
          "The mock payment provider will not run in a production build. " +
            "Set PAYMENTS_ALLOW_MOCK=1 only if a fake payment is genuinely what you want."
        );
      }

      // Random rather than derived from the intent: two payments for the
      // same thing are two payments, and a ref that collided would merge
      // exactly the retry this has to tell apart from the original.
      return { providerRef: `mock_${randomUUID()}`, redirectUrl: null };
    },

    async confirm() {
      return { status: "paid" as const };
    },
  };
}
