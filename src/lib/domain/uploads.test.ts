import { describe, expect, it } from "vitest";

import {
  ACCEPT,
  MAX_UPLOAD_BYTES,
  isAcceptedType,
  validateUpload,
} from "@/lib/domain/uploads";

/**
 * The server's own opinion of a file, separate from the picker's.
 *
 * `ACCEPT` filters what the file dialog offers, and every browser lets a
 * determined person past it — "All files" in the picker, a drag from the
 * desktop, a form posted by hand. Until now `uploadDocument` checked
 * emptiness and size and nothing else, so a `.docx` or an `.exe` was
 * stored in the documents bucket under a traveller's application and
 * waited there for a reviewer to open it.
 *
 * These tests pin the server check to the same list `ACCEPT` advertises,
 * so the two cannot drift into telling a traveller different things.
 */
describe("isAcceptedType", () => {
  it("accepts any image, which is what a phone camera produces", () => {
    expect(isAcceptedType("image/jpeg")).toBe(true);
    expect(isAcceptedType("image/png")).toBe(true);
    // HEIC uploads and is reviewed by a person with no AI opinion — see
    // the note on ACCEPT. The picker offers it, so the server takes it.
    expect(isAcceptedType("image/heic")).toBe(true);
  });

  it("accepts PDF", () => {
    expect(isAcceptedType("application/pdf")).toBe(true);
  });

  it("refuses everything else", () => {
    expect(isAcceptedType("application/msword")).toBe(false);
    expect(isAcceptedType("application/x-msdownload")).toBe(false);
    expect(isAcceptedType("text/html")).toBe(false);
    expect(isAcceptedType("")).toBe(false);
  });

  it("agrees with what ACCEPT advertises", () => {
    // Guards the drift this module exists to prevent: if ACCEPT grows a
    // third entry, this check is the thing that fails first.
    expect(ACCEPT).toBe("image/*,application/pdf");
  });
});

describe("validateUpload", () => {
  it("passes a normal photograph", () => {
    expect(validateUpload({ size: 2_000_000, type: "image/jpeg" })).toBeNull();
  });

  it("rejects a file that is not there", () => {
    expect(validateUpload({ size: 0, type: "image/jpeg" })).toBe("empty");
  });

  it("rejects a file over the limit", () => {
    expect(validateUpload({ size: MAX_UPLOAD_BYTES + 1, type: "image/jpeg" })).toBe(
      "tooLarge"
    );
  });

  it("accepts a file exactly on the limit", () => {
    expect(validateUpload({ size: MAX_UPLOAD_BYTES, type: "image/jpeg" })).toBeNull();
  });

  it("rejects a type the product does not take", () => {
    expect(validateUpload({ size: 1000, type: "application/zip" })).toBe(
      "unsupportedType"
    );
  });

  /**
   * Emptiness is reported before type, and type before size. A person who
   * picked the wrong thing entirely should be told that, not told to
   * photograph their spreadsheet at a lower resolution.
   */
  it("reports the most useful problem first", () => {
    expect(validateUpload({ size: 0, type: "application/zip" })).toBe("empty");
    expect(
      validateUpload({ size: MAX_UPLOAD_BYTES + 1, type: "application/zip" })
    ).toBe("unsupportedType");
  });
});
