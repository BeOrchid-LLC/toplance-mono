import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { toDocKey } from "@/lib/ai/corridor-draft";
import { isTerminalStatus } from "@/lib/domain/status";
import { applications, documents } from "@/lib/db/schema";

/**
 * A reviewer asking one traveller for a document the corridor never
 * listed.
 *
 * The desk could already send a case back with "Additional documents
 * needed" and write a sentence saying what it wanted. What it could not
 * do was put the document anywhere: every `documents` row came out of
 * `adoptRuleSet`, from corridor requirements, so the traveller read
 * "Everything is verified. Nothing else is waiting on you" beside a
 * status card asking for documents, with nowhere to upload to.
 *
 * What this writes is an ordinary checklist row — `source: "agency"` and
 * nothing else unusual. That is the whole design: upload, the AI
 * pre-check, the verify/flag cycle, the completion ring, submission
 * gating, billing and the export archive all act on it without knowing
 * it exists. The two places that *do* have to know are the corridor
 * sweeps in `@/lib/data/checklist` and `@/lib/data/corridors`, both of
 * which would otherwise read "the corridor does not want this" as
 * "nobody wants this" and take the row away.
 *
 * Authorization is the caller's job, as everywhere else in this
 * directory: this module never learns who asked.
 */

export type RequestResult =
  | { ok: true; travelerId: string; docKey: string; documentName: string }
  | { error: string };

export type WithdrawResult =
  | { ok: true; travelerId: string; documentName: string }
  | { error: string };

/**
 * `name` is free text the reviewer typed, and it is load-bearing twice
 * over: `toDocKey` slugifies it into the row's key, and the AI pre-check
 * reads it back as `expectedName` when the traveller uploads. There is
 * no catalogue of document types to pick from and deliberately so — the
 * pre-check takes a name rather than a fixed key, so a reviewer can ask
 * for something nobody anticipated and the machine still checks it.
 */
export async function requestDocumentTx(
  applicationId: string,
  name: string,
  description: string,
  reviewerId: string
): Promise<RequestResult> {
  const documentName = name.trim();
  const docKey = toDocKey(documentName);

  // `toDocKey` keeps letters and digits only, so a name of punctuation
  // alone slugifies to an empty string — which would key the row on ""
  // and collide with the next one.
  if (!docKey) return { error: "Give the document a name." };

  return db.transaction(async (tx) => {
    // `applications` before `documents`, the order `reviewDocumentTx`
    // and `changeStatusTx` both take. Two writers taking the two tables
    // in opposite orders is how a pair of reviewers deadlock, and
    // Postgres settles that by killing one with a 40P01 — which reaches
    // somebody as a 500 on an action they were entitled to take.
    const [app] = await tx
      .select({
        travelerId: applications.travelerId,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for("update")
      .limit(1);

    if (!app) return { error: "That application does not exist." };

    // A decided case cannot be submitted from, so a required row added
    // here could never be cleared by anybody — it would sit on a closed
    // checklist holding the completion ring down with no way out.
    if (isTerminalStatus(app.status)) {
      return { error: "That case has been decided. Nothing more can be asked for." };
    }

    const [clash] = await tx
      .select({ docKey: documents.docKey })
      .from(documents)
      .where(
        and(eq(documents.applicationId, applicationId), eq(documents.docKey, docKey))
      )
      .limit(1);

    // `unique(applicationId, docKey)` refuses this anyway. Catching it
    // here is what turns a 23505 into a sentence the reviewer can act
    // on, and it costs one indexed read on a path taken once a case.
    if (clash) return { error: "That document is already on their checklist." };

    /**
     * At the end of the list. The traveller's own screen groups by state
     * rather than `sortOrder`, so this decides nothing there — a request
     * lands under "Still to upload" either way. It is the agency's case
     * screen that reads the order, and a document asked for on Thursday
     * belongs after the corridor's own, not interleaved with them.
     */
    const [last] = await tx
      .select({ sortOrder: documents.sortOrder })
      .from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(desc(documents.sortOrder))
      .limit(1);

    await tx.insert(documents).values({
      applicationId,
      docKey,
      name: documentName,
      description: description.trim() || null,
      source: "agency",
      requestedBy: reviewerId,
      isRequired: true,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    });

    return { ok: true, travelerId: app.travelerId, docKey, documentName };
  });
}

/**
 * The undo for `requestDocumentTx`, and only that.
 *
 * A reviewer will eventually typo a request or ask for the wrong thing,
 * and a bogus required row blocks the traveller's resubmit until
 * somebody takes it off. So withdrawing has to exist — but it stops at
 * the moment the traveller acts on it. Once a file is in the slot the
 * answer is a verdict, not a delete: the agency keeps no other copy of
 * what they uploaded, and an undo that destroys somebody else's work is
 * not an undo.
 *
 * It also refuses corridor rows outright. This is the reverse of one
 * reviewer's request, not a delete button for the checklist — a corridor
 * requirement comes off by revising the corridor, which reaches every
 * traveller on it rather than one.
 */
export async function withdrawDocumentRequestTx(
  applicationId: string,
  docKey: string
): Promise<WithdrawResult> {
  return db.transaction(async (tx) => {
    const [app] = await tx
      .select({ travelerId: applications.travelerId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .for("update")
      .limit(1);

    if (!app) return { error: "That application does not exist." };

    const [doc] = await tx
      .select({
        name: documents.name,
        state: documents.state,
        source: documents.source,
      })
      .from(documents)
      .where(
        and(eq(documents.applicationId, applicationId), eq(documents.docKey, docKey))
      )
      .for("update")
      .limit(1);

    if (!doc) return { error: "That document is not on this checklist." };

    if (doc.source !== "agency") {
      return {
        error: "The corridor asks for that one. Revise the corridor to drop it.",
      };
    }

    if (doc.state !== "not_started") {
      return { error: "They have already uploaded this. Review the file instead." };
    }

    await tx
      .delete(documents)
      .where(
        and(eq(documents.applicationId, applicationId), eq(documents.docKey, docKey))
      );

    return { ok: true, travelerId: app.travelerId, documentName: doc.name };
  });
}
