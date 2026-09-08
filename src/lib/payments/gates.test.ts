import { describe, expect, it } from "vitest";

import { decideAgencyBilling, decideClientPaywall } from "@/lib/payments/gates";

describe("decideAgencyBilling", () => {
  it("sends a director with no organisation to name one first", () => {
    // Outranks the subscription deliberately: there is nothing to buy a
    // plan for until the agency exists, and a checkout screen for a
    // nameless agency has no row to attach the payment to.
    expect(
      decideAgencyBilling({ hasOrganisation: false, subscriptionActive: false })
    ).toBe("name-organisation");
    expect(
      decideAgencyBilling({ hasOrganisation: false, subscriptionActive: true })
    ).toBe("name-organisation");
  });

  it("sends a named but unpaid agency to checkout", () => {
    expect(
      decideAgencyBilling({ hasOrganisation: true, subscriptionActive: false })
    ).toBe("checkout");
  });

  it("lets a paid agency through", () => {
    expect(decideAgencyBilling({ hasOrganisation: true, subscriptionActive: true })).toBe(
      "ok"
    );
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
