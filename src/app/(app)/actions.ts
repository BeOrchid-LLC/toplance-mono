"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  applications,
  corridorRequirements,
  corridors,
  documents,
  intakeAnswers,
  statusEvents,
  travelPurpose,
} from "@/lib/db/schema";
import {
  requireApplicationAccess,
  toActionError,
} from "@/lib/auth/guards";
import {
  canReadDocuments,
  canWriteApplication,
  canWriteDocuments,
  canWriteIntakeAnswers,
} from "@/lib/auth/policy";
import {
  deleteDocument,
  putDocument,
  signedDocumentUrl,
} from "@/lib/storage/documents";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import type { ApplicationStatus } from "@/lib/domain/status";

type TravelPurpose = (typeof travelPurpose.enumValues)[number];

/**
 * The intake agent speaks in labels; the corridor table is keyed on
 * codes. Typing the maps to the enum means an unmapped purpose is a
 * compile error rather than a cast that fails at the database.
 */
const PURPOSE_MAP: Record<string, TravelPurpose> = {
  Work: "work",
  Study: "study",
  Tourism: "tourism",
  Medical: "medical",
  Relocation: "relocation",
};

const DESTINATION_MAP: Record<string, string> = {
  "United Kingdom": "gb",
  Canada: "ca",
  "United Arab Emirates": "ae",
  Germany: "de",
  "United States": "us",
  Türkiye: "tr",
  Ireland: "ie",
  Netherlands: "nl",
};

const NATIONALITY_MAP: Record<string, string> = {
  Nigeria: "ng",
  Ghana: "gh",
  Kenya: "ke",
  "South Africa": "za",
  Cameroon: "cm",
};

/**
 * Record one intake answer. Re-answering an earlier question clears
 * everything after it and rebuilds the checklist — a mis-tapped chip
 * must never flow silently into the requirements.
 */
export async function answerQuestion(
  applicationId: string,
  questionKey: string,
  value: string
) {
  try {
    await requireApplicationAccess(applicationId, canWriteIntakeAnswers);

    const index = INTAKE_QUESTIONS.findIndex((q) => q.key === questionKey);
    if (index === -1) return { error: "Unknown question." };

    const laterKeys = INTAKE_QUESTIONS.slice(index + 1).map((q) => q.key);

    await db
      .insert(intakeAnswers)
      .values({ applicationId, questionKey, value })
      .onConflictDoUpdate({
        target: [intakeAnswers.applicationId, intakeAnswers.questionKey],
        // Re-answering is a new answer, so it carries a new timestamp.
        set: { value, answeredAt: new Date() },
      });

    if (laterKeys.length) {
      await db
        .delete(intakeAnswers)
        .where(
          and(
            eq(intakeAnswers.applicationId, applicationId),
            inArray(intakeAnswers.questionKey, laterKeys)
          )
        );
    }

    const answers = await db
      .select({
        questionKey: intakeAnswers.questionKey,
        value: intakeAnswers.value,
      })
      .from(intakeAnswers)
      .where(eq(intakeAnswers.applicationId, applicationId));

    const map = Object.fromEntries(answers.map((a) => [a.questionKey, a.value]));
    const complete = INTAKE_QUESTIONS.every((q) => map[q.key]);

    if (complete) {
      await buildChecklist(applicationId, map);
    } else {
      await db
        .update(applications)
        .set({ intakeComplete: false })
        .where(eq(applications.id, applicationId));
    }

    revalidatePath("/app", "layout");
    return { complete };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Resolve the corridor from the answers, then materialise its rule set
 * as this application's checklist. Documents already uploaded keep their
 * state, so switching destination does not throw away a verified
 * passport.
 *
 * Private on purpose: its only caller is `answerQuestion`, which has
 * already established that the caller may write to this application.
 * Exporting it from a "use server" file would publish an unguarded
 * endpoint that rewrites anyone's checklist.
 */
async function buildChecklist(
  applicationId: string,
  answers: Record<string, string>
) {
  const nationality = NATIONALITY_MAP[answers.nationality] ?? "ng";
  const destination = DESTINATION_MAP[answers.destination];
  const purpose = PURPOSE_MAP[answers.purpose];

  if (!destination || !purpose) {
    await db
      .update(applications)
      .set({ intakeComplete: true, status: "collecting_documents" })
      .where(eq(applications.id, applicationId));
    return;
  }

  const [corridor] = await db
    .select({ id: corridors.id })
    .from(corridors)
    .where(
      and(
        eq(corridors.nationalityIso, nationality),
        eq(corridors.destinationIso, destination),
        eq(corridors.purpose, purpose),
        eq(corridors.isLive, true)
      )
    )
    .orderBy(desc(corridors.version))
    .limit(1);

  if (!corridor) {
    // A corridor we do not serve yet. The intake still completes; the
    // requirements screen explains that it is in the build queue.
    await db
      .update(applications)
      .set({
        intakeComplete: true,
        corridorId: null,
        status: "collecting_documents",
      })
      .where(eq(applications.id, applicationId));
    return;
  }

  const requirements = await db
    .select()
    .from(corridorRequirements)
    .where(eq(corridorRequirements.corridorId, corridor.id))
    .orderBy(corridorRequirements.sortOrder);

  const existing = await db
    .select({ docKey: documents.docKey, state: documents.state })
    .from(documents)
    .where(eq(documents.applicationId, applicationId));

  const keep = new Set(existing.map((d) => d.docKey));

  const rows = requirements
    .filter((r) => !keep.has(r.docKey))
    .map((r) => ({
      applicationId,
      docKey: r.docKey,
      name: r.name,
      isRequired: r.isRequired,
      sortOrder: r.sortOrder,
    }));

  if (rows.length) await db.insert(documents).values(rows);

  // Drop rows this corridor no longer asks for, unless already uploaded.
  const wanted = new Set(requirements.map((r) => r.docKey));
  const stale = existing
    .filter((d) => !wanted.has(d.docKey) && d.state === "not_started")
    .map((d) => d.docKey);

  if (stale.length) {
    await db
      .delete(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          inArray(documents.docKey, stale)
        )
      );
  }

  await db
    .update(applications)
    .set({
      intakeComplete: true,
      corridorId: corridor.id,
      status: "collecting_documents",
    })
    .where(eq(applications.id, applicationId));
}

/**
 * Upload a file for one checklist item. The object path is namespaced by
 * application id, which used to be what the storage policy keyed off.
 * Nothing enforces that path server-side any more, so the guard below is
 * what keeps a traveller inside their own application's folder.
 */
export async function uploadDocument(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const docKey = String(formData.get("doc_key") ?? "");

  try {
    // Before the file is read, so an unauthorized caller never causes an
    // upload — not even one that is deleted a moment later.
    await requireApplicationAccess(applicationId, canWriteDocuments);
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file or take a photo first." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "That file is over 10MB. Photograph it again at a lower size." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${applicationId}/${docKey}/${Date.now()}-${safeName}`;

  try {
    await putDocument(path, file);
  } catch {
    return {
      error:
        "That upload did not complete. Your place is saved — try again when you have signal.",
    };
  }

  await db
    .update(documents)
    .set({ state: "checking", storagePath: path, reason: null })
    .where(
      and(
        eq(documents.applicationId, applicationId),
        eq(documents.docKey, docKey)
      )
    );

  revalidatePath("/app", "layout");
  return { ok: true };
}

/**
 * A link to look at a document that has already been uploaded — mostly
 * to check the right passport page went up, before a reviewer tells you
 * it did not.
 *
 * The URL is minted here rather than in the component because the bucket
 * is private and the signature is a bearer credential: anything that
 * built it on the client would need keys that belong on the server. The
 * guard runs first, so a signature is never created for a document the
 * caller may not see.
 */
export async function documentUrl(applicationId: string, docKey: string) {
  try {
    await requireApplicationAccess(applicationId, canReadDocuments);

    const [doc] = await db
      .select({ storagePath: documents.storagePath })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, docKey)
        )
      )
      .limit(1);

    if (!doc?.storagePath) return { error: "Nothing has been uploaded yet." };

    return { url: await signedDocumentUrl(doc.storagePath) };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

export async function removeDocument(applicationId: string, docKey: string) {
  try {
    await requireApplicationAccess(applicationId, canWriteDocuments);

    const [doc] = await db
      .select({ storagePath: documents.storagePath })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, docKey)
        )
      )
      .limit(1);

    if (doc?.storagePath) {
      await deleteDocument(doc.storagePath);
    }

    await db
      .update(documents)
      .set({ state: "not_started", storagePath: null, reason: null })
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, docKey)
        )
      );

    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/** The only statuses a traveller may submit from. */
const RESUBMITTABLE: readonly ApplicationStatus[] = [
  "draft",
  "collecting_documents",
  "additional_documents",
];

/**
 * Submission is gated on the checklist, not on the traveller's opinion
 * of it. At 100% the review team is notified; below it, the button does
 * not exist.
 */
export async function submitApplication(applicationId: string) {
  try {
    await requireApplicationAccess(applicationId, canWriteApplication);

    // Submission is one-way past review. The button is hidden below
    // 100%, but the action is callable directly, and nothing else stops
    // a traveller pushing a case a reviewer is already working on back
    // to `submitted` — which would lose that reviewer their place in the
    // queue. `additional_documents` is in the list because resubmitting
    // is precisely what that status asks for.
    const [current] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!current || !RESUBMITTABLE.includes(current.status)) {
      return { error: "That application has already gone to the review team." };
    }

    const docs = await db
      .select({ state: documents.state, isRequired: documents.isRequired })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    const required = docs.filter((d) => d.isRequired);
    const outstanding = required.filter((d) => d.state !== "verified").length;

    if (outstanding > 0) {
      return {
        error: `${outstanding} document${outstanding === 1 ? "" : "s"} still to verify.`,
      };
    }

    await db
      .update(applications)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(applications.id, applicationId));

    // Under RLS this insert was silently rejected — "staff write status
    // events" excluded the traveller, and the error was never read. It
    // succeeds now, so a submitted case finally carries the event that
    // explains itself. `actorId` stays null: the traveller pressed the
    // button, but the event is written by the system on their behalf.
    await db.insert(statusEvents).values({
      applicationId,
      toStatus: "submitted",
      message: "All documents verified. Your file has gone to the review team.",
    });

    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
