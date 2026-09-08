import { after } from "next/server";
import { eq } from "drizzle-orm";

import { track } from "@/lib/analytics/track";
import { requireApplicationAccess, toActionError } from "@/lib/auth/guards";
import { canReadDocuments } from "@/lib/auth/policy";
import { getDocuments } from "@/lib/data/applications";
import { db } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";
import {
  archiveEntryNames,
  archiveFilename,
  exportableDocuments,
  zipEntries,
} from "@/lib/storage/archive";
import { getDocumentBytes } from "@/lib/storage/documents";

/**
 * Everything uploaded against one application, as a single ZIP.
 *
 * One endpoint serves both sides of the desk, and that is the point
 * rather than an economy. `canReadDocuments` is `participant`: the
 * traveller who owns the case and the agency handling it, nobody else.
 * An agency-side copy of this route would be a second place for that
 * rule to be got wrong, which is the failure `console.ts` describes —
 * "a guard pasted three times is a guard that is eventually only
 * enforced twice". The two screens differ in where the link sits and
 * what it says; they do not differ in who may follow it.
 *
 * A route handler rather than a server action for the same reason the
 * speech route is one: the response is binary, and it carries a
 * `Content-Disposition` a server action has no way to set.
 *
 * The proxy only redirects, so this guard is the whole of what stands
 * between a caller and someone else's passport scans.
 */

// A session decides the answer, so nothing here may be cached or
// prerendered — least of all by a shared cache, hence `no-store` below.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;

  let userId: string;
  let isTraveller: boolean;
  try {
    const { actor, application } = await requireApplicationAccess(
      applicationId,
      canReadDocuments
    );
    userId = actor.userId;
    isTraveller = application.travelerId === actor.userId;
  } catch (error) {
    const message = toActionError(error);
    if (message) return Response.json({ error: message }, { status: 403 });
    throw error;
  }

  const [application] = await db
    .select({ caseRef: applications.caseRef })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  const docs = exportableDocuments(await getDocuments(applicationId));

  // Nothing uploaded yet. Both screens hide the link in this state, so
  // reaching it means a typed URL or a stale tab — an empty ZIP would be
  // a stranger answer than saying so.
  if (docs.length === 0) {
    return Response.json(
      { error: "There are no uploaded documents to download yet." },
      { status: 404 }
    );
  }

  // Named once, up front, so the numbering is the checklist's order
  // rather than the order the bucket happens to answer in.
  const names = archiveEntryNames(docs);

  /**
   * Fetched as the archive is written, one document at a time. A case at
   * the 10MB limit on every row would otherwise put its whole checklist
   * in this function's memory to build a file that is streamed out
   * anyway.
   */
  async function* entries() {
    for (const [index, doc] of docs.entries()) {
      const { bytes } = await getDocumentBytes(doc.storagePath);
      yield { name: names[index], bytes };
    }
  }

  after(() =>
    track(
      "toplance.documents_exported",
      {
        applicationId,
        documents: docs.length,
        viewer: isTraveller ? "traveler" : "agency",
      },
      userId
    )
  );

  return new Response(zipEntries(entries()), {
    headers: {
      "content-type": "application/zip",
      // An empty reference is the one `archiveFilename` answers with a
      // plain `documents.zip`, which is the right answer here: the guard
      // has already passed, so a missing row means the case was deleted
      // between the two reads, not that the caller is a stranger.
      "content-disposition": `attachment; filename="${archiveFilename(
        application?.caseRef ?? ""
      )}"`,
      // The bytes are somebody's passport. No shared cache, no browser
      // cache, no revalidation against a session that has since ended.
      "cache-control": "no-store, private",
    },
  });
}
