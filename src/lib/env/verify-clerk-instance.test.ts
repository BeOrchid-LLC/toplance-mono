import { describe, expect, it } from "vitest";

import { assertClerkInstanceMatchesHost } from "@/lib/env/verify-clerk-instance";

/**
 * The staging incident this guards against: a `sk_test_…` secret key
 * (Clerk's cookieless dev-instance mode) deployed behind a real host.
 * clerk-js then holds a session the server can never read, and every
 * sign-in loops between the form and the sign-in page forever — see
 * "Clerk, one instance per environment" in the README.
 */
describe("assertClerkInstanceMatchesHost", () => {
  it("allows a test key with no app URL set (local dev default)", () => {
    expect(() =>
      assertClerkInstanceMatchesHost({ secretKey: "sk_test_abc", appUrl: undefined })
    ).not.toThrow();
  });

  it("allows a test key against localhost", () => {
    expect(() =>
      assertClerkInstanceMatchesHost({
        secretKey: "sk_test_abc",
        appUrl: "http://localhost:3000",
      })
    ).not.toThrow();
  });

  it("allows a test key against 127.0.0.1", () => {
    expect(() =>
      assertClerkInstanceMatchesHost({
        secretKey: "sk_test_abc",
        appUrl: "http://127.0.0.1:3000",
      })
    ).not.toThrow();
  });

  it("rejects a test key against a deployed host", () => {
    expect(() =>
      assertClerkInstanceMatchesHost({
        secretKey: "sk_test_abc",
        appUrl: "https://staging.toplance.ca",
      })
    ).toThrow(/sk_test_/);
  });

  it("allows a live key against a deployed host", () => {
    expect(() =>
      assertClerkInstanceMatchesHost({
        secretKey: "sk_live_abc",
        appUrl: "https://staging.toplance.ca",
      })
    ).not.toThrow();
  });

  it("allows an unset secret key (Clerk's own SDK reports that failure)", () => {
    expect(() =>
      assertClerkInstanceMatchesHost({
        secretKey: undefined,
        appUrl: "https://staging.toplance.ca",
      })
    ).not.toThrow();
  });
});
