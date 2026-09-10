import { describe, expect, it } from "vitest";

import { archiveReadyCookie, readCookie, ARCHIVE_READY_COOKIE } from "@/lib/http/cookies";

describe("readCookie", () => {
  it("finds a value among several cookies", () => {
    expect(readCookie("a=1; archive_ready=xyz; b=2", "archive_ready")).toBe("xyz");
  });

  it("returns null when the cookie is absent", () => {
    expect(readCookie("a=1; b=2", "archive_ready")).toBeNull();
  });

  it("returns null for an empty cookie string", () => {
    expect(readCookie("", "archive_ready")).toBeNull();
  });

  /**
   * The bug this exists to stop: a substring match reads
   * `not_archive_ready` as `archive_ready` and clears the progress bar
   * on a cookie that has nothing to do with this download.
   */
  it("is not fooled by a cookie whose name ends with the one asked for", () => {
    expect(readCookie("not_archive_ready=xyz", "archive_ready")).toBeNull();
  });

  it("tolerates the space-free form some servers send", () => {
    expect(readCookie("a=1;archive_ready=xyz", "archive_ready")).toBe("xyz");
  });
});

describe("archiveReadyCookie", () => {
  it("names the cookie the client reads", () => {
    expect(archiveReadyCookie("abc123", false)).toContain(`${ARCHIVE_READY_COOKIE}=abc123`);
  });

  it("expires on its own, so a stale one cannot clear a later download", () => {
    expect(archiveReadyCookie("abc123", false)).toContain("Max-Age=60");
  });

  it("is readable by the script that is watching for it", () => {
    expect(archiveReadyCookie("abc123", false)).not.toContain("HttpOnly");
  });

  it("adds Secure where the connection is", () => {
    expect(archiveReadyCookie("abc123", true)).toContain("Secure");
    expect(archiveReadyCookie("abc123", false)).not.toContain("Secure");
  });

  /**
   * The value reaches a `Set-Cookie` header, so it has the same shape of
   * hole `archiveFilename` guards: a CRLF ends the header and starts one
   * of the caller's choosing, and a semicolon forges an attribute.
   */
  it("refuses a ticket carrying a header break", () => {
    expect(archiveReadyCookie("abc\r\nSet-Cookie: session=stolen", false)).toBeNull();
  });

  it("refuses a ticket carrying a cookie attribute separator", () => {
    expect(archiveReadyCookie("abc; Domain=evil.test", false)).toBeNull();
  });

  it("refuses an empty ticket", () => {
    expect(archiveReadyCookie("", false)).toBeNull();
  });

  it("refuses a ticket longer than one it would ever mint", () => {
    expect(archiveReadyCookie("a".repeat(33), false)).toBeNull();
  });
});
