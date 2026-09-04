"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, documents, profiles } from "@/lib/db/schema";
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
  canWriteMessages,
  isStaff,
} from "@/lib/auth/policy";
import { requireStaffAction } from "@/lib/auth/staff-gate";
import { audit } from "@/lib/audit";
import { aiEnabled } from "@/lib/ai/models";
import { precheckDocument, precheckSupports } from "@/lib/ai/precheck";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/domain/uploads";
import {
  deleteDocument,
  putDocument,
  signedDocumentUrl,
} from "@/lib/storage/documents";
import { markBillableIfComplete } from "@/lib/data/billing";
import { recordIntakeAnswer } from "@/lib/data/intake";
import { sendMessageRow } from "@/lib/data/messages";
import { submitApplicationTx } from "@/lib/data/submissions";
import {
  addTravelRecord as insertTravelRecord,
  removeTravelRecord as deleteTravelRecord,
} from "@/lib/data/travel-records";
import { avatarKey, validateAvatarFile } from "@/lib/domain/avatar";
import { COUNTRIES, toE164 } from "@/lib/domain/countries";
import { isDigestFrequency } from "@/lib/domain/digest";
import { isLocale } from "@/lib/i18n/locales";
import { track } from "@/lib/analytics/track";
import {
  appUrl,
  markNotificationsRead as markOwnNotificationsRead,
  notify,
  notifyStaff,
} from "@/lib/notifications/notify";

/**
 * Record one intake answer, from the scripted chips.
 *
 * The write itself lives in `@/lib/data/intake` — the chat route's
 * `record_answer` tool calls the same function, so the truncation and
 * the checklist rebuild cannot differ between the two ways in. This is
 * the guard and the revalidation around it.
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

    const result = await recordIntakeAnswer(
      applicationId,
      questionKey,
      value,
      actor.userId
    );
    if ("error" in result) return result;

    revalidatePath("/app", "layout");
    return result;
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
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
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `That file is over ${MAX_UPLOAD_LABEL}. Photograph it again at a lower size.`,
    };
  }

  // What is on the checklist row now, before anything is written. A
  // docKey that is not on this application would otherwise store an
  // object that no row ever points at, and that nothing can later
  // delete — an unreachable passport scan kept indefinitely.
  // `name` is pulled alongside `storagePath` for the pre-check's
  // `expectedName` — the checklist row's own name, seeded from
  // `corridor_requirements` (staff-curated, never traveller input).
  const [previous] = await db
    .select({ storagePath: documents.storagePath, name: documents.name })
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

  // The upload that fills the last outstanding row is what completes a
  // checklist — `completionOf` counts a document from `checking`, so
  // neither the pre-check nor the reviewer can be the moment it happens
  // on the ordinary path. This is where an application becomes billable,
  // and the helper is idempotent, so a re-upload after a flag does not
  // bill the business a second time for the same case.
  const billing = await markBillableIfComplete(db, applicationId);
  if (billing.becameBillable) {
    await track("toplance.application_became_billable", { applicationId }, actorId);
  }

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

  // The AI pre-check runs after the response — a traveller's upload
  // latency must never wait on a model call. `precheckDocument` never
  // throws on its own, but the guard stays for the same reason it does
  // on the itinerary's `after()` in `@/app/ops/actions.ts`: a background
  // failure here has nothing to do with the upload that already
  // succeeded. Skipped entirely (no hook scheduled at all) when there is
  // no model to run it or the MIME type is one `precheckDocument` would
  // silently no-op on anyway.
  if (aiEnabled() && precheckSupports(file.type)) {
    after(async () => {
      try {
        const flagged = await precheckDocument({
          applicationId,
          docKey,
          storagePath: path,
          fileName: file.name,
          mimeType: file.type,
          expectedName: previous.name,
          actorId,
        });
        // Best effort: the traveller sees a flag on their next nav
        // either way, this just saves them a refresh when the check
        // lands quickly.
        if (flagged) revalidatePath("/app", "layout");
      } catch (error) {
        console.error(
          `[actions] pre-check failed for document ${docKey} on application ${applicationId}`,
          error
        );
      }
    });
  }

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
/**
 * The state of one checklist row, for a client waiting on a verdict it
 * cannot be sent.
 *
 * `precheckDocument` is scheduled in an `after()` hook, so it finishes
 * after the upload's response has already been written. Its
 * `revalidatePath` invalidates the server cache for the *next* request
 * and reaches nothing that is already on screen — so the upload dialog
 * had no way to learn that the file it had just called "Received" had
 * been refused. It waited, said the wrong thing, and the Re-upload/Skip
 * variant never appeared at all.
 *
 * A read, guarded like every other: `canReadDocuments` decides, and only
 * the state and the traveller-facing reason ever leave — never the
 * storage path.
 */
export async function documentVerdict(applicationId: string, docKey: string) {
  try {
    await requireApplicationAccess(applicationId, canReadDocuments);

    const [doc] = await db
      .select({ state: documents.state, reason: documents.reason })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.docKey, docKey)
        )
      )
      .limit(1);

    if (!doc) return { error: "That document is not on your checklist." };
    return { state: doc.state, reason: doc.reason };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

export async function documentUrl(applicationId: string, docKey: string) {
  try {
    const { actor } = await requireApplicationAccess(applicationId, canReadDocuments);

    // Staff read every traveller's documents, which is exactly what the
    // ops console asks a second factor for. This is a POST endpoint with
    // a public id — a staff session that never enrolled one could mint
    // signed passport-scan URLs here without ever loading a gated page.
    // A traveller reading their own file is untouched.
    if (isStaff(actor)) {
      const gate = await requireStaffAction(actor);
      // Re-wrapped rather than returned as-is so this stays one union of
      // object literals — the callers read `result.error` directly.
      if ("error" in gate) return { error: gate.error };
    }

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

    // Only a staff view is logged — the promise this makes true is
    // "staff access to a traveller's document is on the record", not a
    // log of the traveller looking at their own passport scan.
    if (isStaff(actor)) {
      await audit(actor.userId, "document.viewed", "document", applicationId, { docKey });
    }

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

      // A cheap select rather than widening `submitApplicationTx`'s
      // return shape — that function's tests assert on it with
      // `toEqual({ ok: true })`, and this is the only caller that needs
      // the case reference.
      const [app] = await db
        .select({ caseRef: applications.caseRef })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1);

      if (app) {
        await notifyStaff(
          "application_submitted",
          { caseRef: app.caseRef, url: appUrl(`/ops/cases/${applicationId}`) },
          applicationId
        );
      }

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
 * One message on a case thread — the traveller writes from `/app/messages`,
 * staff from the case screen, and both call this one action. `senderRole`
 * is never trusted from the form: it comes from the guarded actor, the
 * same reason `updateProfile` never takes an id.
 *
 * The counterpart is notified, not the sender: staff sending means the
 * traveller hears about it; a traveller sending goes to whoever owns the
 * case (Task 6 gave `assigneeId` a writer), or every reviewer when nobody
 * has claimed it yet — the same "assignee if set, else notifyStaff"
 * routing `submitApplication` uses for the initial submission.
 */
export async function sendMessage(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const body = String(formData.get("body") ?? "");

  try {
    const { actor, application } = await requireApplicationAccess(
      applicationId,
      canWriteMessages
    );
    const senderRole = actor.role === "staff" ? "staff" : "traveler";

    const result = await sendMessageRow(applicationId, actor.userId, senderRole, body);
    if ("error" in result) return result;

    await track("toplance.message_sent", { applicationId, senderRole }, actor.userId);

    const [sender] = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, actor.userId))
      .limit(1);
    const preview = body.trim().slice(0, 140);

    if (senderRole === "staff") {
      await notify(
        application.travelerId,
        "message_received",
        {
          senderName: sender?.fullName || "Toplance team",
          preview,
          url: appUrl("/app/messages"),
        },
        applicationId
      );
    } else {
      const [row] = await db
        .select({ assigneeId: applications.assigneeId })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1);
      const payload = {
        senderName: sender?.fullName || "Unnamed",
        preview,
        url: appUrl(`/ops/cases/${applicationId}`),
      } as const;

      if (row?.assigneeId) {
        await notify(row.assigneeId, "message_received", payload, applicationId);
      } else {
        await notifyStaff("message_received", payload, applicationId);
      }
    }

    // The traveller's messages page and the ops case screen both read
    // this thread.
    revalidatePath("/app", "layout");
    revalidatePath("/ops", "layout");
    return { ok: true };
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

    if (formData.has("companion_digest")) {
      const digest = String(formData.get("companion_digest"));
      if (!isDigestFrequency(digest)) {
        return { error: "Unsupported digest setting." };
      }

      // A read-modify-write on the jsonb column: `notificationPrefs`
      // carries more than this one switch (or will), so a blind
      // overwrite here would erase every other preference the moment
      // someone changes this one.
      const [current] = await db
        .select({ notificationPrefs: profiles.notificationPrefs })
        .from(profiles)
        .where(eq(profiles.id, actor.userId))
        .limit(1);

      const existingPrefs =
        current?.notificationPrefs && typeof current.notificationPrefs === "object"
          ? (current.notificationPrefs as Record<string, unknown>)
          : {};

      set.notificationPrefs = { ...existingPrefs, companionDigest: digest };
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

/**
 * Put a photo on the signed-in user's own profile. Same storage as
 * documents — MinIO locally, Cloudflare R2 deployed — under an
 * `avatars/<userId>/` key the session alone decides, and the same
 * replace-then-cleanup order as `uploadDocument`: the old object is
 * deleted only after the row points at the new one, so a failure leaves
 * a spare file rather than a profile pointing at nothing.
 */
export async function uploadAvatar(formData: FormData) {
  try {
    const actor = await requireActor();

    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "Choose a photo first." };

    const invalid = validateAvatarFile(file.type, file.size);
    if (invalid) return { error: invalid };

    const [current] = await db
      .select({ avatarPath: profiles.avatarPath })
      .from(profiles)
      .where(eq(profiles.id, actor.userId))
      .limit(1);

    const path = avatarKey(actor.userId, file.type, Date.now());

    try {
      await putDocument(path, file);
    } catch {
      return {
        error:
          "That upload did not complete. Try again when you have signal.",
      };
    }

    await db
      .update(profiles)
      .set({ avatarPath: path, updatedAt: new Date() })
      .where(eq(profiles.id, actor.userId));

    if (current?.avatarPath && current.avatarPath !== path) {
      await deleteDocument(current.avatarPath).catch(() => {});
    }

    await track(
      "toplance.avatar_uploaded",
      { replaced: current?.avatarPath != null },
      actor.userId
    );

    revalidatePath("/app", "layout");
    return {};
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * Opening the bell marks everything in it read. Always the signed-in
 * user's own rows — there is no id to check, the same shape as
 * `updateProfile`. The menu calls this and then `router.refresh()`
 * itself, so there is nothing to revalidate here.
 */
export async function markNotificationsRead() {
  try {
    const actor = await requireActor();
    await markOwnNotificationsRead(actor.userId);
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
