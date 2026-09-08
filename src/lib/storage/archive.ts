import "server-only";

import { once } from "node:events";
import { Readable } from "node:stream";

// archiver 8 is ESM and exports format classes; the `archiver("zip")`
// factory of every older example is gone.
import { ZipArchive } from "archiver";

/**
 * Everything a traveller uploaded, as one file they can keep.
 *
 * Nothing here decides who may download an archive — the same rule as
 * `@/lib/storage/documents`. The single caller is the guarded route at
 * `/api/documents/[applicationId]`, and the guard is
 * `requireApplicationAccess`, which already answers the question for the
 * traveller and their agency alike.
 *
 * The two halves are separate on purpose. Naming is pure and is where
 * every edge case lives, so it is tested without a bucket; the ZIP
 * itself is a stream, so nothing here holds a case's worth of passport
 * scans in memory at once.
 */

/**
 * Which of a checklist's rows end up in the archive.
 *
 * Having a file is the whole test, and a reviewer's verdict is not part
 * of it. The button says "what I submitted": a flagged passport scan is
 * still something the traveller sent, and an export that quietly omitted
 * it would be the one place the product disagrees with the checklist the
 * traveller is looking at.
 *
 * The state column is deliberately not consulted. A `failed` row can
 * still hold the path of an earlier attempt, and a row with a file in
 * the bucket is a file this person uploaded however it got there.
 */
export function exportableDocuments<T extends { storagePath: string | null }>(
  docs: T[]
): (T & { storagePath: string })[] {
  return docs.filter(
    (doc): doc is T & { storagePath: string } => doc.storagePath !== null
  );
}

/**
 * What the browser saves the download as.
 *
 * The result goes straight into a `Content-Disposition` header, so it is
 * reduced to characters that cannot end the filename or the header: a
 * quote closes the value early, a CRLF closes the header and starts
 * another one. `applications.case_ref` is a sequence — `TPL-000123` —
 * and nothing writes it by hand, so this is not closing a live hole. It
 * is making sure the function stays safe if that ever changes, since the
 * caller cannot see that this value reaches a header.
 */
export function archiveFilename(caseRef: string): string {
  const safe = caseRef.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return safe ? `${safe}-documents.zip` : "documents.zip";
}

/**
 * The name each document takes inside the archive.
 *
 * Position first, so the ZIP opens in checklist order in a file manager
 * that sorts by name — which is every file manager. It is also what
 * keeps a family application's four "Passport photo" rows apart, since
 * the checklist genuinely holds documents that share a name.
 */
export function archiveEntryNames(
  docs: { name: string; storagePath: string | null }[]
): string[] {
  return docs.map((doc, index) => {
    const position = String(index + 1).padStart(2, "0");
    const extension = extensionOf(doc.storagePath);
    return `${position}-${slug(doc.name)}${extension}`;
  });
}

/**
 * A document's name as a filename. Apostrophes are dropped rather than
 * turned into separators — "Employer's letter" is one word people read,
 * not two.
 */
function slug(name: string): string {
  const cleaned = name
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // A name with no Latin letters in it slugifies to nothing, and a file
  // called ".jpg" is one a person cannot see, let alone open. Names are
  // English today because they come from the corridor rule sets, but
  // nothing in the schema enforces that.
  return cleaned || "document";
}

/**
 * The extension from the stored path, never from the document's name —
 * the path ends in the traveller's own sanitised filename (see
 * `uploadDocument`), so it is the only place the real format is
 * recorded. A path without one yields no extension rather than a guess.
 */
function extensionOf(storagePath: string | null): string {
  const filename = storagePath?.split("/").pop() ?? "";
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "";

  const extension = filename.slice(dot + 1);
  return /^[a-z0-9]{1,8}$/i.test(extension) ? `.${extension.toLowerCase()}` : "";
}

export type ArchiveEntry = {
  name: string;
  bytes: Uint8Array;
};

/**
 * The archive itself, as a stream the route hands straight to the
 * browser.
 *
 * Stored, not deflated. Every document this product accepts is a JPEG,
 * PNG, HEIC or PDF — all already compressed — so deflating them again
 * burns CPU on a per-request path to save a percent or two.
 */
export function zipEntries(
  entries: Iterable<ArchiveEntry> | AsyncIterable<ArchiveEntry>
): ReadableStream<Uint8Array> {
  const archive = new ZipArchive({ store: true });

  void (async () => {
    try {
      for await (const entry of entries) {
        // The listener goes on before the append, not after: `entry`
        // fires once archiver has written this file, and a promise
        // created afterwards can miss it entirely.
        //
        // Waiting for it is what keeps the peak memory at one document.
        // Without it the loop runs ahead of the writer, and a case's
        // worth of scans queues up inside archiver — which is the cost
        // this whole design exists to avoid.
        const written = once(archive, "entry");
        archive.append(Buffer.from(entry.bytes), { name: entry.name });
        await written;
      }

      await archive.finalize();
    } catch {
      // A document that cannot be read must break the download, not
      // shorten it. `finalize` here would produce a ZIP that opens
      // cleanly and is quietly missing a passport — the worst of the
      // available failures, because nobody would notice.
      archive.abort();
    }
  })();

  return Readable.toWeb(archive) as ReadableStream<Uint8Array>;
}
