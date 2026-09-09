import { describe, expect, it } from "vitest";

import { withoutHandshake } from "@/lib/auth/handshake";

describe("withoutHandshake", () => {
  // The reported bug. A handshake token Clerk refuses makes `auth()`
  // throw, and the request carrying it is the one the browser is sitting
  // on — so answering it with the same token still in the URL is how a
  // person gets a bare 500 twice.
  it("strips a handshake token so the request can be retried", () => {
    const url = new URL(
      "https://staging.toplance.ca/agency?__clerk_handshake=abc123"
    );

    expect(withoutHandshake(url)?.toString()).toBe(
      "https://staging.toplance.ca/agency"
    );
  });

  it("strips the handshake nonce alongside the token", () => {
    const url = new URL(
      "https://staging.toplance.ca/?__clerk_handshake=abc&__clerk_handshake_nonce=xyz"
    );

    expect(withoutHandshake(url)?.toString()).toBe(
      "https://staging.toplance.ca/"
    );
  });

  // The dev-browser token is not part of the handshake being refused —
  // it is how a development instance carries browser identity in the URL
  // at all, since it runs cookieless. Stripping it would turn one failed
  // handshake into a signed-out browser.
  it("keeps the dev-browser token and any other query the page owns", () => {
    const url = new URL(
      "https://staging.toplance.ca/agency?__clerk_handshake=abc&__clerk_db_jwt=dvb_1&tab=cases"
    );

    const retry = withoutHandshake(url);

    expect(retry?.searchParams.get("__clerk_db_jwt")).toBe("dvb_1");
    expect(retry?.searchParams.get("tab")).toBe("cases");
    expect(retry?.searchParams.has("__clerk_handshake")).toBe(false);
  });

  it("keeps the path it was asked about", () => {
    const url = new URL(
      "https://staging.toplance.ca/fr/app/profile?__clerk_handshake=abc"
    );

    expect(withoutHandshake(url)?.pathname).toBe("/fr/app/profile");
  });

  // Nothing to retry means nothing to redirect to: a caller that redirects
  // on this would send the browser to the URL it is already on, forever.
  it("reports null when there is no handshake to strip", () => {
    expect(withoutHandshake(new URL("https://staging.toplance.ca/agency"))).toBe(
      null
    );
  });

  it("does not mutate the URL it was given", () => {
    const url = new URL("https://staging.toplance.ca/?__clerk_handshake=abc");

    withoutHandshake(url);

    expect(url.searchParams.get("__clerk_handshake")).toBe("abc");
  });
});
