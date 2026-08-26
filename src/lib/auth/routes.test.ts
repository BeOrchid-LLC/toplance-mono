import { describe, expect, it } from "vitest";

import { signedInDestination } from "@/lib/auth/routes";

describe("signedInDestination", () => {
  it("sends a signed-in visitor on an auth page to their audience home", () => {
    expect(signedInDestination("/sign-in")).toBe("/app");
    expect(signedInDestination("/sign-up")).toBe("/app");
    expect(signedInDestination("/employer/sign-in")).toBe("/employer");
    expect(signedInDestination("/employer/sign-up")).toBe("/employer");
    expect(signedInDestination("/ops/sign-in")).toBe("/ops");
  });

  it("matches nested auth paths, as the middleware's (.*) patterns do", () => {
    expect(signedInDestination("/sign-in/factor-two")).toBe("/app");
    expect(signedInDestination("/employer/sign-in/anything")).toBe("/employer");
    expect(signedInDestination("/employer/sign-up/anything")).toBe("/employer");
  });

  it("returns null off the auth surface, where no redirect belongs", () => {
    expect(signedInDestination("/")).toBeNull();
    expect(signedInDestination("/app")).toBeNull();
    expect(signedInDestination("/employer")).toBeNull();
    // A prefix must match on a path boundary, not as a substring.
    expect(signedInDestination("/sign-innocuous")).toBeNull();
  });

  it("prefers a ?next= destination when it is an internal path", () => {
    expect(signedInDestination("/sign-in", "/app/documents")).toBe(
      "/app/documents"
    );
  });

  it("ignores a ?next= that could leave the site", () => {
    // Absolute URL, protocol-relative URL, and backslash trick — each
    // would turn the courtesy redirect into an open redirect.
    expect(signedInDestination("/sign-in", "https://evil.example")).toBe("/app");
    expect(signedInDestination("/sign-in", "//evil.example")).toBe("/app");
    expect(signedInDestination("/sign-in", "/\\evil.example")).toBe("/app");
  });

  it("ignores an empty ?next=", () => {
    expect(signedInDestination("/sign-in", "")).toBe("/app");
    expect(signedInDestination("/sign-in", null)).toBe("/app");
  });
});
