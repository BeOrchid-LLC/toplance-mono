import { describe, expect, it } from "vitest";

import {
  goDestination,
  homeFor,
  signedInDestination,
  SIGN_IN_DOOR,
} from "@/lib/auth/routes";

describe("homeFor", () => {
  it("sends each role to its own console", () => {
    expect(homeFor("staff")).toBe("/ops");
    expect(homeFor("org_member")).toBe("/agency");
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
    expect(signedInDestination("/agency/sign-up", null, "abc123")).toBe("/agency");
  });

  // The two retired sign-in doors still answer — the paths are in the
  // wild — and a signed-in visitor arriving at either resolves through
  // `/go` like every other sign-in. Sending them to `/agency` or `/ops`
  // on the strength of the URL was a guess about who they were, and it
  // was right only for the person who guessed correctly about
  // themselves. The employer *sign-up* keeps its own destination: it
  // created the organisation it names.
  it("resolves every sign-in through the dispatcher, retired doors included", () => {
    expect(signedInDestination("/agency/sign-in")).toBe("/go");
    expect(signedInDestination("/ops/sign-in")).toBe("/go");
    expect(signedInDestination("/sign-in")).toBe("/go");
    expect(signedInDestination("/agency/sign-up")).toBe("/agency");
  });

  it("matches nested auth paths, as the middleware's (.*) patterns do", () => {
    expect(signedInDestination("/sign-in/factor-two")).toBe("/go");
    expect(signedInDestination("/agency/sign-in/anything")).toBe("/go");
    expect(signedInDestination("/agency/sign-up/anything")).toBe("/agency");
  });

  it("returns null off the auth surface, where no redirect belongs", () => {
    expect(signedInDestination("/")).toBeNull();
    expect(signedInDestination("/app")).toBeNull();
    expect(signedInDestination("/agency")).toBeNull();
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

/**
 * There used to be a `signInDoorFor(pathname)` here, picking one of
 * three doors from the console a lapsed session was standing in. Its
 * whole job was to show branded copy to the audience the URL implied,
 * and the implication was the only evidence it ever had — nothing about
 * access was decided by it. One door serves every role now, so the
 * question has one answer and the proxy names the constant directly.
 */
describe("SIGN_IN_DOOR", () => {
  it("is where every signed-out visitor is sent, whatever console they were in", () => {
    expect(SIGN_IN_DOOR).toBe("/sign-in");
  });

  // The round trip that has to hold for a lapsed session: bounced out to
  // the one door, then — once signed in again — forwarded by role rather
  // than back to wherever the URL suggested.
  it("resolves back through the dispatcher once the session exists", () => {
    expect(signedInDestination(SIGN_IN_DOOR)).toBe("/go");
    expect(signedInDestination(SIGN_IN_DOOR, "/ops/cases/123")).toBe(
      "/ops/cases/123"
    );
  });
});

describe("goDestination", () => {
  it("forwards each role that has a console to open", () => {
    expect(goDestination({ role: "staff" }, false)).toBe("/ops");
    expect(goDestination({ role: "org_member" }, false)).toBe("/agency");
    expect(goDestination({ role: "traveler" }, true)).toBe("/app");
  });

  it("stops for a session with no profile row", () => {
    expect(goDestination(null, false)).toBeNull();
  });

  // The bug this function exists to make impossible. A traveller's
  // console *is* their application and only an accepted invitation
  // creates one, so every page under `/app` redirects away on a null
  // application. Forwarding that traveller to `/app` builds a bounce
  // the browser only escapes with ERR_TOO_MANY_REDIRECTS.
  it("stops for a traveller who holds no application", () => {
    expect(goDestination({ role: "traveler" }, false)).toBeNull();
  });

  // Only the traveller console is an application. A reviewer's queue and
  // a staff member's corridors exist whether or not one is in flight, so
  // holding none must not strand them on the way to their own console.
  it("forwards a reviewer and a staff member who hold no application", () => {
    expect(goDestination({ role: "org_member" }, false)).toBe("/agency");
    expect(goDestination({ role: "staff" }, false)).toBe("/ops");
  });
});
