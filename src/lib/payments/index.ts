import { mockProvider } from "@/lib/payments/mock";
import type { PaymentProvider } from "@/lib/payments/provider";

export type {
  Checkout,
  PaymentIntent,
  PaymentKind,
  PaymentProvider,
  PaymentStatus,
} from "@/lib/payments/provider";

/**
 * The provider in force, chosen by `PAYMENTS_PROVIDER` and defaulting to
 * the mock — the only one that exists today.
 *
 * An unrecognised name throws rather than falling back. Falling back
 * would mean a typo in an environment variable quietly stops charging
 * anybody, which is the failure you find in a month of revenue reports
 * rather than in a log.
 */
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENTS_PROVIDER ?? "mock";

  switch (name) {
    case "mock":
      return mockProvider();
    default:
      throw new Error(
        `No payment provider called "${name}" is implemented. ` +
          `Add one behind PaymentProvider, or unset PAYMENTS_PROVIDER to use the mock.`
      );
  }
}
