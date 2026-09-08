import { describe, expect, it } from "vitest";

import {
  archiveEntryNames,
  archiveFilename,
  exportableDocuments,
  zipEntries,
} from "@/lib/storage/archive";

/**
 * "What I submitted" is the promise on the button, and it decides this
 * list. A reviewer's verdict is not part of it: a flagged passport scan
 * is still a file the traveller sent, and leaving it out of their own
 * export would hide something they know they uploaded.
 */
describe("exportableDocuments", () => {
  it("includes a document a reviewer has flagged", () => {
    const flagged = { name: "Passport", state: "flagged", storagePath: "a/b.jpg" };

    expect(exportableDocuments([flagged])).toEqual([flagged]);
  });

  it("includes documents still awaiting review", () => {
    const checking = { name: "Bank", state: "checking", storagePath: "a/c.pdf" };

    expect(exportableDocuments([checking])).toEqual([checking]);
  });

  it("leaves out a row nothing was ever uploaded against", () => {
    expect(
      exportableDocuments([
        { name: "Photo", state: "not_started", storagePath: null },
      ])
    ).toEqual([]);
  });

  /**
   * `failed` is an upload that never landed, so the row can still be
   * carrying the storage path of a previous attempt. The path is what
   * decides, not the state.
   */
  it("keeps the checklist's own order", () => {
    const docs = [
      { name: "A", state: "verified", storagePath: "a/1.jpg" },
      { name: "B", state: "not_started", storagePath: null },
      { name: "C", state: "flagged", storagePath: "a/3.jpg" },
    ];

    expect(exportableDocuments(docs).map((d) => d.name)).toEqual(["A", "C"]);
  });
});

/**
 * The naming half of the export is pure, so it is tested as such — no
 * bucket, no database. What a person sees when they open the ZIP is
 * decided entirely here, and it is the part with edge cases in it: a
 * document named in a way that does not survive a filesystem, two
 * documents with the same name, a stored path with no extension on it.
 */
describe("archiveEntryNames", () => {
  it("names a file from its checklist position and the document's name", () => {
    const names = archiveEntryNames([
      { name: "Passport bio page", storagePath: "app/passport/1757-IMG_4821.jpg" },
    ]);

    expect(names).toEqual(["01-passport-bio-page.jpg"]);
  });

  it("takes the extension from the stored path, not the document name", () => {
    const names = archiveEntryNames([
      { name: "Bank statement (PDF)", storagePath: "app/bank/1757-statement.pdf" },
    ]);

    expect(names).toEqual(["01-bank-statement-pdf.pdf"]);
  });

  /**
   * A checklist genuinely holds two rows with one name — "Passport
   * photo" for each traveller on a family application. The position
   * prefix is what keeps them apart, which is the reason it is a prefix
   * and not a suffix nobody reads.
   */
  it("keeps two identically named documents apart", () => {
    const names = archiveEntryNames([
      { name: "Passport photo", storagePath: "app/a/one.jpg" },
      { name: "Passport photo", storagePath: "app/b/two.jpg" },
    ]);

    expect(names).toEqual(["01-passport-photo.jpg", "02-passport-photo.jpg"]);
  });

  it("numbers past nine without reordering the list alphabetically", () => {
    const docs = Array.from({ length: 10 }, (_, i) => ({
      name: `Doc ${i + 1}`,
      storagePath: `app/d/${i}.pdf`,
    }));

    const names = archiveEntryNames(docs);

    expect(names[0]).toBe("01-doc-1.pdf");
    expect(names[9]).toBe("10-doc-10.pdf");
  });

  it("drops punctuation a filesystem would choke on", () => {
    const names = archiveEntryNames([
      { name: "Employer's letter / proof of funds", storagePath: "app/e/x.png" },
    ]);

    expect(names).toEqual(["01-employers-letter-proof-of-funds.png"]);
  });

  it("leaves the extension off when the stored path has none", () => {
    const names = archiveEntryNames([
      { name: "Scan", storagePath: "app/s/1757-scan" },
    ]);

    expect(names).toEqual(["01-scan"]);
  });

  /**
   * Document names come from the database and are English today, but
   * nothing enforces that. A name that slugifies to nothing must still
   * produce a file somebody can open rather than a bare ".jpg".
   */
  it("falls back to the position when a name slugifies to nothing", () => {
    const names = archiveEntryNames([
      { name: "文件", storagePath: "app/x/y.jpg" },
    ]);

    expect(names).toEqual(["01-document.jpg"]);
  });
});

describe("archiveFilename", () => {
  it("names the download after the case reference", () => {
    expect(archiveFilename("TPL-000123")).toBe("TPL-000123-documents.zip");
  });

  /**
   * This string is written straight into a `Content-Disposition` header.
   * `applications.case_ref` is a sequence today — `TPL-000123`, nothing
   * a person types — so this is not a live hole; it is the function
   * refusing to become one if that column is ever set by hand. A quote
   * ends the filename early and a newline ends the header entirely.
   */
  it("strips anything that could break out of the header", () => {
    expect(archiveFilename('TPL-1"\r\nX-Injected: yes')).toBe(
      "TPL-1X-INJECTEDYES-documents.zip"
    );
  });

  it("falls back to a plain name when the reference is unusable", () => {
    expect(archiveFilename("")).toBe("documents.zip");
  });
});

describe("zipEntries", () => {
  /**
   * Stored, not deflated: every document in this product is a JPEG or a
   * PDF, both already compressed, so re-compressing them costs CPU on a
   * per-request path and saves nothing. The observable consequence is
   * that a file's bytes appear in the archive verbatim — which is what
   * makes this a real round trip rather than a check that some bytes
   * came out.
   */
  it("puts each file's bytes into the archive under its entry name", async () => {
    const passport = new TextEncoder().encode("passport page 2");
    const bank = new TextEncoder().encode("balance: 4,200");

    const stream = zipEntries([
      { name: "01-passport.jpg", bytes: passport },
      { name: "02-bank.pdf", bytes: bank },
    ]);

    const archive = Buffer.from(
      await new Response(stream).arrayBuffer()
    );

    // Local file header, then the end-of-central-directory record: a
    // reader that finds neither has not been handed a ZIP.
    expect(archive.subarray(0, 4)).toEqual(Buffer.from("PK\x03\x04", "binary"));
    expect(archive.includes(Buffer.from("PK\x05\x06", "binary"))).toBe(true);

    expect(archive.includes(Buffer.from("01-passport.jpg"))).toBe(true);
    expect(archive.includes(Buffer.from("02-bank.pdf"))).toBe(true);
    expect(archive.includes(Buffer.from(passport))).toBe(true);
    expect(archive.includes(Buffer.from(bank))).toBe(true);
  });

  /**
   * The whole reason the archive is streamed: a fifteen-document case at
   * the 10MB limit is 150MB, and fetching those in parallel would hold
   * every one of them in a function's memory at once. Pulled one at a
   * time, the peak is a single document.
   *
   * Swap the loop inside `zipEntries` for a `Promise.all` over the
   * entries and this is the test that fails.
   */
  it("fetches one document at a time rather than all at once", async () => {
    let outstanding = 0;
    let peak = 0;

    async function* documents() {
      for (const name of ["01-a.jpg", "02-b.jpg", "03-c.jpg"]) {
        outstanding += 1;
        peak = Math.max(peak, outstanding);
        yield { name, bytes: new TextEncoder().encode(name) };
        outstanding -= 1;
      }
    }

    const archive = Buffer.from(
      await new Response(zipEntries(documents())).arrayBuffer()
    );

    expect(peak).toBe(1);
    expect(archive.includes(Buffer.from("03-c.jpg"))).toBe(true);
  });

  it("produces a readable archive when there is nothing to put in it", async () => {
    const archive = Buffer.from(
      await new Response(zipEntries([])).arrayBuffer()
    );

    expect(archive.includes(Buffer.from("PK\x05\x06", "binary"))).toBe(true);
  });
});
