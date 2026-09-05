import { describe, expect, it } from "vitest";

import { securityHeaders, type ResponseHeader } from "./headers";

const valueOf = (headers: ResponseHeader[], key: string) =>
  headers.find((h) => h.key === key)?.value;

describe("securityHeaders", () => {
  it("sends HSTS in production, for at least a year, across subdomains", () => {
    const hsts = valueOf(securityHeaders(true), "Strict-Transport-Security");
    expect(hsts).toBeDefined();
    expect(hsts).toContain("includeSubDomains");

    const maxAge = Number(/max-age=(\d+)/.exec(hsts ?? "")?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it("does not send HSTS outside production", () => {
    // Host-scoped, not scheme-scoped: from `next dev` this would pin
    // localhost to HTTPS for every project on the machine.
    expect(
      valueOf(securityHeaders(false), "Strict-Transport-Security")
    ).toBeUndefined();
  });

  it("does not ask for preload, which is hard to undo", () => {
    expect(valueOf(securityHeaders(true), "Strict-Transport-Security")).not.toContain(
      "preload"
    );
  });

  it.each([
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "DENY"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ])("sends %s in every environment", (key, value) => {
    expect(valueOf(securityHeaders(true), key)).toBe(value);
    expect(valueOf(securityHeaders(false), key)).toBe(value);
  });

  it("leaves the camera and microphone available to our own origin", () => {
    // Both are load-bearing: `capture="environment"` on the document
    // rows, and the voice intake's microphone. Denying them would break
    // two of the brief's features in production only.
    const policy = valueOf(securityHeaders(true), "Permissions-Policy") ?? "";
    expect(policy).toContain("camera=(self)");
    expect(policy).toContain("microphone=(self)");
  });

  it("denies the permissions nothing here asks for", () => {
    const policy = valueOf(securityHeaders(true), "Permissions-Policy") ?? "";
    expect(policy).toContain("geolocation=()");
    expect(policy).toContain("payment=()");
  });
});
