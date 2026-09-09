import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The wiring, not the helper.
 *
 * `withoutHandshake` is a pure function with its own tests, and it
 * passed every one of them while the `try` was still wrapped around
 * `auth()` — where it caught nothing, because Clerk resolves the
 * request state before it ever invokes the handler. The bug was
 * entirely in where the catch sat, so a test that never composes the
 * proxy cannot see it. This one calls the default export.
 *
 * What it holds:
 *
 *  - a refused handshake is answered with a redirect, not a throw
 *  - anything else still throws, even on a URL carrying a handshake
 *  - a second refusal inside the window stops rather than looping
 *
 * The middleware is stubbed rather than run. What is under test is the
 * wrapper's behaviour when the thing it wraps throws, and Clerk's own
 * handshake verification is not this repo's to re-implement.
 */
const clerk = { throws: null as unknown };

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => async () => {
    if (clerk.throws) throw clerk.throws;
    return undefined;
  },
  createRouteMatcher: () => () => false,
}));

const { default: proxy } = await import("@/proxy");

/** Clerk's own wording, which is all there is to match on. */
const HANDSHAKE_REFUSAL = new Error("handshake status without redirect");

const RETRY_COOKIE = "__toplance_handshake_retried";

function request(url: string, cookie?: string) {
  const req = new NextRequest(new URL(url));
  if (cookie) req.cookies.set(RETRY_COOKIE, cookie);
  return req;
}

// The proxy never touches the event; Next only passes it through.
const event = {} as never;

beforeEach(() => {
  clerk.throws = null;
});

describe("proxy", () => {
  it("answers a refused handshake with a redirect that drops the token", async () => {
    clerk.throws = HANDSHAKE_REFUSAL;

    const response = await proxy(
      request("https://staging.toplance.ca/agency?__clerk_handshake=abc&tab=cases"),
      event
    );

    expect(response?.status).toBe(307);

    const location = new URL(response!.headers.get("location")!);
    expect(location.pathname).toBe("/agency");
    expect(location.searchParams.has("__clerk_handshake")).toBe(false);
    expect(location.searchParams.get("tab")).toBe("cases");
  });

  // The reported symptom was a bare `text/plain` 500 on the address the
  // browser was already sitting on. Anything that is not a redirect
  // here is that bug back again.
  it("does not let the refusal reach the response as a 500", async () => {
    clerk.throws = HANDSHAKE_REFUSAL;

    const response = await proxy(
      request("https://staging.toplance.ca/?__clerk_handshake=stale"),
      event
    );

    expect(response?.status).not.toBe(500);
    expect(response?.status).toBe(307);
  });

  // Keeps the redirect on the scheme the browser asked on. `nextUrl`
  // carries whatever the origin was reached on, and this origin sits
  // behind a CDN that terminates TLS.
  it("keeps the redirect on https", async () => {
    clerk.throws = HANDSHAKE_REFUSAL;

    const response = await proxy(
      request("https://staging.toplance.ca/agency?__clerk_handshake=abc"),
      event
    );

    expect(response!.headers.get("location")).toMatch(/^https:\/\//);
  });

  // The distinction the catch rests on. An earlier version asked only
  // whether the URL carried a handshake parameter, so any unrelated
  // failure on such a request was silently answered with a redirect and
  // its error thrown away.
  it("re-throws an unrelated failure even when the URL carries a handshake", async () => {
    clerk.throws = new TypeError("cannot read properties of undefined");

    await expect(
      proxy(
        request("https://staging.toplance.ca/agency?__clerk_handshake=abc"),
        event
      )
    ).rejects.toThrow(/cannot read properties/);
  });

  it("re-throws a handshake refusal when there is no handshake to strip", async () => {
    clerk.throws = HANDSHAKE_REFUSAL;

    await expect(
      proxy(request("https://staging.toplance.ca/agency"), event)
    ).rejects.toThrow(/handshake/);
  });

  // A stale token clears on one retry. A misconfigured instance does
  // not, and without this the strip-and-retry runs until the browser
  // gives up — which is a worse answer than the 500 it replaced.
  it("marks the retry so a second refusal can be told apart", async () => {
    clerk.throws = HANDSHAKE_REFUSAL;

    const response = await proxy(
      request("https://staging.toplance.ca/agency?__clerk_handshake=abc"),
      event
    );

    expect(response!.headers.get("set-cookie")).toContain(`${RETRY_COOKIE}=1`);
  });

  it("sends the second refusal to the sign-in door instead of looping", async () => {
    clerk.throws = HANDSHAKE_REFUSAL;

    const response = await proxy(
      request("https://staging.toplance.ca/agency?__clerk_handshake=def", "1"),
      event
    );

    expect(response?.status).toBe(307);
    expect(new URL(response!.headers.get("location")!).pathname).toContain(
      "/sign-in"
    );
  });

  it("carries the locale to the door it sends the second refusal to", async () => {
    clerk.throws = HANDSHAKE_REFUSAL;

    const response = await proxy(
      request("https://staging.toplance.ca/fr/agency?__clerk_handshake=def", "1"),
      event
    );

    expect(new URL(response!.headers.get("location")!).pathname).toMatch(/^\/fr\//);
  });

  it("passes an ordinary request through untouched", async () => {
    const response = await proxy(
      request("https://staging.toplance.ca/agency"),
      event
    );

    expect(response).toBeUndefined();
  });
});
