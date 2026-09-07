import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import {
  isNonPagePath,
  splitLocalePath,
  withLocalePrefix,
} from "@/lib/i18n/paths";

describe("splitLocalePath", () => {
  it("lifts a locale prefix off the path underneath it", () => {
    expect(splitLocalePath("/fr/travelers")).toEqual({
      locale: "fr",
      rest: "/travelers",
    });
    expect(splitLocalePath("/ar/app/profile")).toEqual({
      locale: "ar",
      rest: "/app/profile",
    });
  });

  // A bare prefix is the locale's home page, not a path of its own.
  it("reads a bare prefix as that locale's root", () => {
    expect(splitLocalePath("/fr")).toEqual({ locale: "fr", rest: "/" });
    expect(splitLocalePath("/zu")).toEqual({ locale: "zu", rest: "/" });
  });

  it("treats an unprefixed path as English, unchanged", () => {
    expect(splitLocalePath("/")).toEqual({ locale: "en", rest: "/" });
    expect(splitLocalePath("/travelers")).toEqual({
      locale: "en",
      rest: "/travelers",
    });
  });

  // English is never a prefix. `/en/travelers` is not a second spelling
  // of `/travelers`; it is a path with no page under it, and saying so
  // here is what stops the proxy handing it a second `/en`.
  it("does not recognise an /en prefix", () => {
    expect(splitLocalePath("/en/travelers")).toEqual({
      locale: "en",
      rest: "/en/travelers",
    });
  });

  // An unknown prefix has to stay in `rest` so it 404s. Swallowing it
  // would serve the English home page at /zz, which is worse than a
  // miss: it tells a crawler the URL is real.
  it("leaves an unrecognised prefix in the path", () => {
    expect(splitLocalePath("/zz/travelers")).toEqual({
      locale: "en",
      rest: "/zz/travelers",
    });
  });

  // Guards against a code that merely starts another path segment —
  // "/artists" must not read as Arabic plus "tists".
  it("only matches a whole first segment", () => {
    expect(splitLocalePath("/artists")).toEqual({
      locale: "en",
      rest: "/artists",
    });
    expect(splitLocalePath("/france")).toEqual({
      locale: "en",
      rest: "/france",
    });
  });
});

describe("withLocalePrefix", () => {
  it("prefixes every locale except English", () => {
    expect(withLocalePrefix("/travelers", "fr")).toBe("/fr/travelers");
    expect(withLocalePrefix("/travelers", "en")).toBe("/travelers");
  });

  it("collapses the root rather than emitting a trailing slash", () => {
    expect(withLocalePrefix("/", "fr")).toBe("/fr");
    expect(withLocalePrefix("/", "en")).toBe("/");
  });
});

// The two functions are each other's inverse, and the whole scheme rests
// on that: the proxy resolves a URL with one and the locale menu builds
// the next URL with the other. A round trip that loses or doubles a
// prefix is a visitor sent to the wrong language.
describe("splitLocalePath and withLocalePrefix round-trip", () => {
  it("returns every locale to the path it started from", () => {
    for (const { code } of LOCALES) {
      for (const path of ["/", "/travelers", "/app/profile"]) {
        const prefixed = withLocalePrefix(path, code);
        expect(splitLocalePath(prefixed)).toEqual({ locale: code, rest: path });
      }
    }
  });
});

describe("isNonPagePath", () => {
  // Route handlers live outside the localised tree; prefixing one 404s
  // it, and for the cron endpoints that is a scheduled job that stops
  // running without anybody being told.
  it("excludes route handlers and the Clerk callback", () => {
    expect(isNonPagePath("/api/cron/companion")).toBe(true);
    expect(isNonPagePath("/api/intake/chat")).toBe(true);
    expect(isNonPagePath("/__clerk/handshake")).toBe(true);
  });

  it("leaves pages alone", () => {
    expect(isNonPagePath("/")).toBe(false);
    expect(isNonPagePath("/travelers")).toBe(false);
    expect(isNonPagePath("/app/documents")).toBe(false);
    // Not a route handler — a page that merely starts with the letters.
    expect(isNonPagePath("/apidocs")).toBe(false);
  });
});
