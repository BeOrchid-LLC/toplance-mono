/**
 * Who may pass a paywall, as pure functions.
 *
 * Neither of these touches a database, a session or a framework — the
 * same discipline `@/lib/auth/policy` keeps, and for the same reason:
 * the rule that decides whether somebody is asked for money should be
 * readable and testable without standing up a request.
 *
 * The guards that call them do the I/O. `resolveAgencyConsole` already
 * resolves a membership on every console page, and the `(app)` layout
 * already loads the application on every traveller page, so neither
 * gate costs a query that was not already being made.
 */

/** What an agency console should do with the person who just arrived. */
export type AgencyBillingDecision = "name-organisation" | "checkout" | "ok";

export function decideAgencyBilling(input: {
  hasOrganisation: boolean;
  subscriptionActive: boolean;
}): AgencyBillingDecision {
  // Ahead of the subscription check on purpose: a director who has
  // signed up but not yet named an agency has nothing to buy a plan
  // for, and no row for the payment to name.
  if (!input.hasOrganisation) return "name-organisation";
  if (!input.subscriptionActive) return "checkout";
  return "ok";
}

/** What the traveller's console should do with the person who just arrived. */
export type ClientPaywallDecision = "checkout" | "ok";

export function decideClientPaywall(input: {
  hasApplication: boolean;
  applicationPaid: boolean;
}): ClientPaywallDecision {
  // No application, nothing owed. `getApplication` opens a draft on
  // sight so this is rare, but a paywall in front of an account with
  // nothing in it would be a dead end rather than a sale.
  if (!input.hasApplication) return "ok";
  return input.applicationPaid ? "ok" : "checkout";
}
