/**
 * What a payment provider has to be able to do, and nothing more.
 *
 * Deliberately two methods. Everything the product needs from a payment
 * — ask for a checkout, find out whether it settled — fits in them, and
 * a wider interface would be written around whichever provider we
 * happened to have first.
 *
 * No I/O and no framework in this file, so both the mock and a future
 * Stripe implementation are written against the same types and neither
 * is the definition. This is the arrangement `track()` has with
 * analytics vendors: adopting one is a second implementation behind the
 * interface, not a change at every call site.
 */

/** The two things anybody buys. Mirrors `payment_kind` in the schema. */
export type PaymentKind = "agency_subscription" | "client_application";

/** Where one payment got to. Mirrors `payment_status`. */
export type PaymentStatus = "pending" | "paid" | "failed";

export type PaymentIntent = {
  kind: PaymentKind;
  /**
   * Minor units, and never taken from a form. The caller re-derives it
   * from the active rate card — a browser that can name its own price
   * is a browser that pays what it likes.
   */
  amountMinor: number;
  currency: string;
  /** What is being paid for: an organisation id, or an application id. */
  reference: string;
};

export type Checkout = {
  providerRef: string;
  /**
   * Where to send the payer to finish, or `null` when there is nowhere
   * to go because the payment already settled. The mock returns null;
   * Stripe would return a Checkout Session URL.
   */
  redirectUrl: string | null;
};

export type PaymentProvider = {
  /** Stored on every row this provider writes, so a payment says who took it. */
  name: string;
  createCheckout(intent: PaymentIntent): Promise<Checkout>;
  confirm(providerRef: string): Promise<{ status: PaymentStatus }>;
};
