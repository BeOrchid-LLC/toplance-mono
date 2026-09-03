import { describe, expect, it } from "vitest";

import { homeFor, signedInDestination, signInDoorFor } from "@/lib/auth/routes";

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

  // The reason this exists: Clerk activating a brand-new session
  // refreshes the router, which re-requests the sign-up URL the visitor
  // is still standing on. The proxy answers that request, so if it
  // cannot work out where an invited traveller belongs, it sends them to
  // /go — which for an account whose profile write has not landed yet is
  // a dead end, not a dispatcher.
  it("sends a mid-sign-up invitee to the invitation their token names", () => {
    expect(signedInDestination("/sign-up", null, "abc123")).toBe("/invite/abc123");
  });

  it("lets the token decide even when a next is also present", () => {
    // The invite door derives its destination from the token and never
    // sets `next`. Anything else arriving in that slot is a stranger's
    // suggestion about where an invitation should land.
    expect(signedInDestination("/sign-up", "/app/documents", "abc123")).toBe(
      "/invite/abc123"
    );
  });

  it("ignores a token that is not shaped like one", () => {
    // Tokens are hex from the database. A crafted one with a slash or a
    // dot segment would build a path this function never meant to name.
    expect(signedInDestination("/sign-up", null, "../ops")).toBe("/go");
    expect(signedInDestination("/sign-up", null, "a/b")).toBe("/go");
    expect(signedInDestination("/sign-up", null, "")).toBe("/go");
  });

  it("only reads a token on the door that issues one", () => {
    expect(signedInDestination("/sign-in", null, "abc123")).toBe("/go");
    expect(signedInDestination("/employer/sign-up", null, "abc123")).toBe("/employer");
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
    // The property that lets /go be a terminal surface rather than a
    // bounce: a signed-in visitor sent there by a console that could not
    // find their profile must be allowed to stay and read the reason. If
    // the proxy ever forwarded /go, that console and this page would
    // redirect at each other forever.
    expect(signedInDestination("/go")).toBeNull();
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

describe("signInDoorFor", () => {
  // A staff or employer session that lapses on a protected page must
  // bounce back to its own branded door, not the generic traveller one —
  // that door's "Create an account" is invite-only copy that does not
  // apply to them.
  it("sends a lapsed employer session to the employer door", () => {
    expect(signInDoorFor("/employer")).toBe("/employer/sign-in");
    expect(signInDoorFor("/employer/people/123")).toBe("/employer/sign-in");
  });

  it("sends a lapsed staff session to the operations door", () => {
    expect(signInDoorFor("/ops")).toBe("/ops/sign-in");
    expect(signInDoorFor("/ops/cases/123")).toBe("/ops/sign-in");
  });

  // The traveller console has no door of its own — /sign-in is it.
  it("falls back to the generic door for everything else", () => {
    expect(signInDoorFor("/app")).toBe("/sign-in");
    expect(signInDoorFor("/app/documents")).toBe("/sign-in");
  });
});
