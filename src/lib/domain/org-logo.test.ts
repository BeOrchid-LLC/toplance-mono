import { describe, expect, it } from "vitest";

import { LOGO_MAX_BYTES, orgLogoKey, validateLogoFile } from "@/lib/domain/org-logo";

describe("validateLogoFile", () => {
  it("accepts the three raster formats a browser can produce", () => {
    expect(validateLogoFile("image/jpeg", 1024)).toBeNull();
    expect(validateLogoFile("image/png", 1024)).toBeNull();
    expect(validateLogoFile("image/webp", 1024)).toBeNull();
  });

  /**
   * SVG is markup, and this bucket also holds passport scans. It is
   * refused at the door rather than sanitised — the rail renders what
   * comes back from storage, and nothing in the product is equipped to
   * decide which `<script>` in an uploaded file is a friendly one.
   */
  it("refuses SVG and anything that is not an image", () => {
    expect(validateLogoFile("image/svg+xml", 1024)).toMatch(/JPEG|PNG|WebP/);
    expect(validateLogoFile("application/pdf", 1024)).toMatch(/JPEG|PNG|WebP/);
  });

  it("refuses an empty pick and anything over the ceiling", () => {
    expect(validateLogoFile("image/png", 0)).toMatch(/Choose a logo/);
    expect(validateLogoFile("image/png", LOGO_MAX_BYTES + 1)).toMatch(/2MB/);
    expect(validateLogoFile("image/png", LOGO_MAX_BYTES)).toBeNull();
  });
});

describe("orgLogoKey", () => {
  /**
   * By organisation, not by uploader. The logo belongs to the agency and
   * outlives the director who put it there — keyed on a person, a
   * director leaving would strand the file under a folder nobody else
   * writes to.
   */
  it("namespaces on the organisation and stamps the object", () => {
    expect(orgLogoKey("org-1", "image/png", 1_700_000_000_000)).toBe(
      "logos/org-1/1700000000000.png"
    );
  });

  it("never reuses a key, so a replacement cannot clobber the old object", () => {
    const first = orgLogoKey("org-1", "image/png", 1);
    const second = orgLogoKey("org-1", "image/png", 2);
    expect(first).not.toBe(second);
  });

  it("carries the extension the content type implies", () => {
    expect(orgLogoKey("o", "image/jpeg", 1)).toMatch(/\.jpg$/);
    expect(orgLogoKey("o", "image/webp", 1)).toMatch(/\.webp$/);
  });
});
