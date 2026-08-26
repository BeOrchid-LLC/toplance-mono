import { describe, expect, it } from "vitest";

import { homeFor, signedInDestination } from "@/lib/auth/routes";

describe("homeFor", () => {
  it("sends each role to its own console", () => {
    expect(homeFor("staff")).toBe("/ops");
    expect(homeFor("org_member")).toBe("/employer");
    expect(homeFor("traveler")).toBe("/app");
  });
});

describe("signedInDestination", () => {
  // The generic doors cannot know who walked in — staff and employers
  // sign in there too — so they resolve through the /go dispatcher,
  // which reads the role and forwards. The audience doors declare their
  // destination in their own path.
  it("sends the generic doors through the role dispatcher", () => {
    expect(signedInDestination("/sign-in")).toBe("/go");
    expect(signedInDestination("/sign-up")).toBe("/go");
  });

  it("sends a signed-in visitor on an audience door to that audience's home", () => {
    expect(signedInDestination("/employer/sign-in")).toBe("/employer");
    expect(signedInDestination("/employer/sign-up")).toBe("/employer");
    expect(signedInDestination("/ops/sign-in")).toBe("/ops");
  });

  it("matches nested auth paths, as the middleware's (.*) patterns do", () => {
    expect(signedInDestination("/sign-in/factor-two")).toBe("/go");
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
    expect(signedInDestination("/sign-in", "https://evil.example")).toBe("/go");
    expect(signedInDestination("/sign-in", "//evil.example")).toBe("/go");
    expect(signedInDestination("/sign-in", "/\\evil.example")).toBe("/go");
  });

  it("ignores an empty ?next=", () => {
    expect(signedInDestination("/sign-in", "")).toBe("/go");
    expect(signedInDestination("/sign-in", null)).toBe("/go");
  });
});
