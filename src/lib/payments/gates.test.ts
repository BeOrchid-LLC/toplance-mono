import { describe, expect, it } from "vitest";

import { decideAgencyBilling, decideClientPaywall } from "@/lib/payments/gates";

describe("decideAgencyBilling", () => {
  it("sends a director with no organisation to name one first", () => {
    // Outranks everything below it: there is nothing to verify and
    // nothing to buy a plan for until the agency exists, and a checkout
    // screen for a nameless agency has no row to attach the payment to.
    expect(
      decideAgencyBilling({
        hasOrganisation: false,
        kybActivated: false,
        subscriptionActive: false,
      })
    ).toBe("name-organisation");
    expect(
      decideAgencyBilling({
        hasOrganisation: false,
        kybActivated: true,
        subscriptionActive: true,
      })
    ).toBe("name-organisation");
  });

  it("holds an unverified agency short of the bill", () => {
    expect(
      decideAgencyBilling({
        hasOrganisation: true,
        kybActivated: false,
        subscriptionActive: false,
      })
    ).toBe("pending-verification");
  });

  it("holds an unverified agency even if it has somehow already paid", () => {
    // The order is the assertion. A payment that landed before
    // activation — a lapsed agency reactivating, a fixture, a webhook
    // arriving out of order — does not buy a way past KYB. Reversing
    // these two lines would let money answer a question about whether
    // a business is licensed.
    expect(
      decideAgencyBilling({
        hasOrganisation: true,
        kybActivated: false,
        subscriptionActive: true,
      })
    ).toBe("pending-verification");
  });

  it("sends a verified but unpaid agency to checkout", () => {
    expect(
      decideAgencyBilling({
        hasOrganisation: true,
        kybActivated: true,
        subscriptionActive: false,
      })
    ).toBe("checkout");
  });

  it("lets a verified, paid agency through", () => {
    expect(
      decideAgencyBilling({
        hasOrganisation: true,
        kybActivated: true,
        subscriptionActive: true,
      })
    ).toBe("ok");
  });
});

describe("decideClientPaywall", () => {
  it("sends an unpaid application to checkout", () => {
    expect(decideClientPaywall({ hasApplication: true, applicationPaid: false })).toBe(
      "checkout"
    );
  });

  it("lets a paid application through", () => {
    expect(decideClientPaywall({ hasApplication: true, applicationPaid: true })).toBe(
      "ok"
    );
  });

  it("has nothing to charge for when there is no application", () => {
    // A traveller whose draft has not been opened yet owes nothing.
    // Sending them to a checkout screen with no application to name
    // would be a paywall in front of an empty account.
    expect(decideClientPaywall({ hasApplication: false, applicationPaid: false })).toBe(
      "ok"
    );
  });
});
