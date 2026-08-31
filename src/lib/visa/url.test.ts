import { describe, expect, it } from "vitest";

import { httpUrl } from "@/lib/visa/url";

describe("httpUrl", () => {
  it("keeps an ordinary https link", () => {
    expect(httpUrl("https://www.gov.uk/skilled-worker-visa")).toBe(
      "https://www.gov.uk/skilled-worker-visa"
    );
  });

  it("keeps http, which some government sites still serve", () => {
    expect(httpUrl("http://embassy.example.ng/visas")).toBe(
      "http://embassy.example.ng/visas"
    );
  });

  it("drops null and blank", () => {
    expect(httpUrl(null)).toBeNull();
    expect(httpUrl(undefined)).toBeNull();
    expect(httpUrl("   ")).toBeNull();
  });

  /**
   * The reason this module exists. A vendor field lands in an `href`;
   * a `javascript:` scheme there runs in our origin on click, and
   * `rel="noopener noreferrer"` does not stop it.
   */
  it("drops a javascript: URI", () => {
    expect(httpUrl("javascript:alert(document.cookie)")).toBeNull();
  });

  it("drops a javascript: URI hidden behind whitespace and case", () => {
    expect(httpUrl("  JaVaScRiPt:alert(1)")).toBeNull();
    // The URL parser strips tabs and newlines inside a scheme, exactly
    // as a browser does — so this must not survive as a "safe" string.
    expect(httpUrl("java\tscript:alert(1)")).toBeNull();
    expect(httpUrl("java\nscript:alert(1)")).toBeNull();
  });

  it("drops data:, vbscript: and file:", () => {
    expect(httpUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(httpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(httpUrl("file:///etc/passwd")).toBeNull();
  });

  it("drops a relative path, which is never an external source", () => {
    expect(httpUrl("/app/documents")).toBeNull();
    expect(httpUrl("www.gov.uk")).toBeNull();
  });
});
