"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents, intakeAnswers, profiles } from "@/lib/db/schema";
import {
  requireActor,
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
import { adoptRuleSet } from "@/lib/data/checklist";
import { submitApplicationTx } from "@/lib/data/submissions";
import {
  addTravelRecord as insertTravelRecord,
  removeTravelRecord as deleteTravelRecord,
} from "@/lib/data/travel-records";
import {
  DESTINATION_ISO,
  NATIONALITY_ISO,
  PURPOSE_ISO,
} from "@/lib/domain/corridors";
import { COUNTRIES, toE164 } from "@/lib/domain/countries";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import { isLocale } from "@/lib/i18n/locales";
import { resolveRuleSet } from "@/lib/visa";
import { track } from "@/lib/analytics/track";

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
    const { actor } = await requireApplicationAccess(
      applicationId,
      canWriteIntakeAnswers
    );

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
      await buildChecklist(applicationId, map, actor.userId);
      await track("toplance.intake_completed", { applicationId }, actor.userId);
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
  answers: Record<string, string>,
  userId: string
) {
  const nationality = NATIONALITY_ISO[answers.nationality];
  const destination = DESTINATION_ISO[answers.destination];
  const purpose = PURPOSE_ISO[answers.purpose];

  if (!nationality || !destination || !purpose) {
    // An answer we have no code for is still demand. Record what they
    // typed, not a blank.
    //
    // Nationality used to fall back to `ng` here. Every question accepts
    // free text, so someone answering "Senegal" was handed the Nigerian
    // rule set under a heading that reads "as the mission publishes it".
    // A checklist built from the wrong passport is worse than no
    // checklist: a missing mark is honest, an invented one is not.
    await track(
      "toplance.corridor_requested",
      {
        nationality: answers.nationality,
        destination: answers.destination,
        purpose: answers.purpose,
      },
      userId
    );

    await db
      .update(applications)
      .set({ intakeComplete: true, status: "collecting_documents" })
      .where(eq(applications.id, applicationId));
    return;
  }

  const ruleSet = await resolveRuleSet({
    nationalityIso: nationality,
    destinationIso: destination,
    purpose,
  });

  if (!ruleSet) {
    // A corridor we do not serve yet. The intake still completes; the
    // requirements screen tells the traveller their request has been
    // counted towards it, and this is what counts it.
    await track(
      "toplance.corridor_requested",
      {
        nationalityIso: nationality,
        destinationIso: destination,
        purpose,
      },
      userId
    );

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

  await track(
    "toplance.corridor_resolved",
    {
      corridorId: ruleSet.corridorId,
      provider: "curated",
      destinationIso: destination,
      purpose,
    },
    userId
  );

  await adoptRuleSet(applicationId, ruleSet);

  await db
    .update(applications)
    .set({ intakeComplete: true, status: "collecting_documents" })
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

  let actorId: string;
  try {
    // Before the file is read, so an unauthorized caller never causes an
    // upload — not even one that is deleted a moment later.
    const { actor } = await requireApplicationAccess(
      applicationId,
      canWriteDocuments
    );
    actorId = actor.userId;
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

  // What is on the checklist row now, before anything is written. A
  // docKey that is not on this application would otherwise store an
  // object that no row ever points at, and that nothing can later
  // delete — an unreachable passport scan kept indefinitely.
  const [previous] = await db
    .select({ storagePath: documents.storagePath })
    .from(documents)
    .where(
      and(
        eq(documents.applicationId, applicationId),
        eq(documents.docKey, docKey)
      )
    )
    .limit(1);

  if (!previous) return { error: "That document is not on your checklist." };

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

  // Replacing a document used to leave the old object in the bucket for
  // good: only removeDocument ever deleted anything, so every re-upload
  // retained another copy of someone's passport. Deleted after the row
  // points at the new object, so a failure here leaves a spare file
  // rather than a row pointing at one that is gone.
  if (previous.storagePath && previous.storagePath !== path) {
    await deleteDocument(previous.storagePath).catch(() => {});
  }

  await track(
    "toplance.document_uploaded",
    { applicationId, docKey, replaced: previous.storagePath !== null },
    actorId
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
    const { actor } = await requireApplicationAccess(
      applicationId,
      canWriteDocuments
    );

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

    await track(
      "toplance.document_removed",
      { applicationId, docKey },
      actor.userId
    );

    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Submission is gated on the checklist, not on the traveller's opinion
 * of it. At 100% the review team is notified; below it, the button does
 * not exist.
 *
 * The guard first, then the transition — which lives in
 * `@/lib/data/submissions` so it can be tested under real concurrency.
 */
export async function submitApplication(applicationId: string) {
  try {
    const { actor } = await requireApplicationAccess(
      applicationId,
      canWriteApplication
    );

    const result = await submitApplicationTx(applicationId);

    if ("ok" in result) {
      await track(
        "toplance.application_submitted",
        { applicationId },
        actor.userId
      );
      revalidatePath("/app", "layout");
    }

    return result;
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Add one past trip to the signed-in traveller's own history. Like
 * `updateProfile`, the owner comes from the session, never the form —
 * there is no id to check because there is no id parameter at all.
 */
export async function addTravelRecord(formData: FormData) {
  try {
    const actor = await requireActor();

    const result = await insertTravelRecord(actor.userId, {
      country: String(formData.get("country") ?? ""),
      purpose: String(formData.get("purpose") ?? ""),
      startedOn: String(formData.get("started_on") ?? ""),
      endedOn: String(formData.get("ended_on") ?? ""),
    });
    if ("error" in result) return result;

    await track("toplance.travel_record_added", {}, actor.userId);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

export async function removeTravelRecord(recordId: string) {
  try {
    const actor = await requireActor();

    const result = await deleteTravelRecord(actor.userId, recordId);
    if ("error" in result) return result;

    await track("toplance.travel_record_removed", {}, actor.userId);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Update the profile fields a traveller owns, one row at a time. The
 * profile page edits inline, so the form carries only the field being
 * saved — fields absent from the payload are left untouched rather than
 * overwritten with blanks.
 *
 * Always the signed-in user's own row. There is no id parameter to
 * check: the target comes from the session, never from the form.
 */
export async function updateProfile(formData: FormData) {
  try {
    const actor = await requireActor();
    const set: Partial<typeof profiles.$inferInsert> = {};

    if (formData.has("full_name")) {
      const fullName = String(formData.get("full_name")).trim();
      if (!fullName) return { error: "Your name cannot be empty." };
      if (fullName.length > 160) return { error: "That name is too long." };
      set.fullName = fullName;
    }

    if (formData.has("phone")) {
      const digits = String(formData.get("phone")).replace(/\D/g, "");
      const iso = String(formData.get("country_iso") || "ng").toLowerCase();
      // `countryBy` falls back to Nigeria rather than failing, which
      // would silently file the number under the wrong dial code —
      // reject an iso we do not list instead.
      if (!COUNTRIES.some((c) => c.iso === iso)) {
        return { error: "Pick a country for the number." };
      }
      if (digits && (digits.length < 6 || digits.length > 14)) {
        return { error: "That number does not look complete." };
      }
      // Clearing the field is allowed — a phone is optional.
      set.phone = digits ? toE164(iso, digits) : null;
      set.countryIso = iso;
    }

    if (formData.has("locale")) {
      const locale = String(formData.get("locale"));
      if (!isLocale(locale)) return { error: "Unsupported language." };
      set.locale = locale;
    }

    if (Object.keys(set).length === 0) return {};

    await db
      .update(profiles)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(profiles.id, actor.userId));

    revalidatePath("/app", "layout");
    return {};
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
