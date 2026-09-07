"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";

import { revalidateCase } from "@/lib/cache/consoles";
import { db } from "@/lib/db/client";
import { applications, documents, organisations, profiles } from "@/lib/db/schema";
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
  canWriteVisaExpiry,
} from "@/lib/auth/policy";
import { aiEnabled } from "@/lib/ai/models";
import { precheckDocument, precheckSupports } from "@/lib/ai/precheck";
import { MAX_UPLOAD_LABEL, validateUpload } from "@/lib/domain/uploads";
import { UPLOAD_ACTIONS } from "@/lib/i18n/upload-actions";
import { getActionLocale } from "@/lib/i18n/server";
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
import { markChecklistCompleteIfDone } from "@/lib/data/checklist";
import { avatarKey, validateAvatarFile } from "@/lib/domain/avatar";
import { COUNTRIES, toE164 } from "@/lib/domain/countries";
import { isDigestFrequency } from "@/lib/domain/digest";
import { parseVisaExpiry } from "@/lib/domain/expiry";
import { isLocale } from "@/lib/i18n/locales";
import { track } from "@/lib/analytics/track";
import {
  appUrl,
  markNotificationsRead as markOwnNotificationsRead,
  notify,
  notifyAgency,
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

    // `/[locale]/app`, not `/app`: the segment is literal here, and
    // naming it is what invalidates the page in all ten languages
    // rather than in whichever one this request happened to arrive in.
    // Every `revalidatePath` in the app is written this way.
    revalidatePath("/[locale]/app", "layout");
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

  /**
   * Read once, used by every refusal below. These messages reach a
   * traveller mid-upload, usually on a phone — the one moment the
   * product has to be in their own language, and the one place it was
   * hard-coded English until 05/09.
   */
  const locale = await getActionLocale();

  if (!(file instanceof File)) {
    return { error: UPLOAD_ACTIONS.empty[locale] };
  }

  /**
   * Emptiness, then type, then size — the order a person can act on.
   * The type check is the new one: `ACCEPT` filters the picker and every
   * browser lets a determined person past it, so until now a `.docx`
   * was stored in the documents bucket under a traveller's application
   * and waited there for a reviewer to open.
   *
   * `{size}` appears only in `tooLarge`; the replace is a no-op on the
   * rest, the same way `DOCUMENT_ROW`'s `{name}` replacements are.
   */
  const rejection = validateUpload(file);
  if (rejection) {
    return {
      error: UPLOAD_ACTIONS[rejection][locale].replace("{size}", MAX_UPLOAD_LABEL),
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

  if (!previous) return { error: UPLOAD_ACTIONS.notOnChecklist[locale] };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${applicationId}/${docKey}/${Date.now()}-${safeName}`;

  try {
    await putDocument(path, file);
  } catch {
    return { error: UPLOAD_ACTIONS.uploadFailed[locale] };
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

  // The AI pre-check runs after the response — a traveller's upload
  // latency must never wait on a model call. `precheckDocument` never
  // throws on its own, but the guard stays for the same reason it does
  // on the itinerary's `after()` in `@/app/[locale]/ops/actions.ts`: a background
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
        if (flagged) revalidatePath("/[locale]/app", "layout");
      } catch (error) {
        console.error(
          `[actions] pre-check failed for document ${docKey} on application ${applicationId}`,
          error
        );
      }

      // Deliberately after the pre-check, not before it. `completionOf`
      // counts a document from `checking`, which the write above sets
      // before anything has looked at the file — so billing at that
      // moment charges for a checklist nobody has yet judged, and breaks
      // the promise the pricing page makes in the same breath, that an
      // abandoned application is never charged. The case that promise is
      // about is real: a traveller uploads a full set of illegible
      // documents, the pre-check flags every one, and they never come
      // back. Waiting until here, those flags have already landed, the
      // checklist is not complete, and nobody is billed.
      //
      // Runs whether the check passed, flagged or threw. A check that
      // failed is one that is never going to judge this document, and an
      // application should not become unbillable because a model call
      // timed out.
      await billIfComplete(applicationId, actorId);
      await notifyHandlerOfUpload(applicationId, docKey);
      await notifyDeskIfComplete(applicationId, actorId);
    });
  } else {
    // No pre-check was scheduled, so no verdict is ever coming and there
    // is nothing to wait for.
    await billIfComplete(applicationId, actorId);
    await notifyHandlerOfUpload(applicationId, docKey);
    await notifyDeskIfComplete(applicationId, actorId);
  }

  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

/**
 * Tell the colleague handling this case that a document has arrived.
 *
 * The assignee alone, and nobody when the case is unheld. Fanning this
 * out to the agency would put nine notifications per traveller in front
 * of people who are not working the case, and the two events that *are*
 * everybody's business — the checklist filling up, and the submission —
 * already fan out.
 *
 * In-app only: `notify` sends no email for a kind with no template, and
 * `document_uploaded` deliberately has none.
 *
 * Best-effort like everything else on this path. `notify` never throws,
 * and an upload must not fail because a notification could not be
 * written.
 */
async function notifyHandlerOfUpload(applicationId: string, docKey: string) {
  const [row] = await db
    .select({
      assigneeId: applications.assigneeId,
      caseRef: applications.caseRef,
      documentName: documents.name,
    })
    .from(applications)
    .leftJoin(
      documents,
      and(
        eq(documents.applicationId, applications.id),
        eq(documents.docKey, docKey)
      )
    )
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!row?.assigneeId) return;

  await notify(
    row.assigneeId,
    "document_uploaded",
    {
      documentName: row.documentName ?? docKey,
      caseRef: row.caseRef,
      url: appUrl(`/agency/clients/${applicationId}`),
    },
    applicationId
  );
}

/**
 * Stamp the application billable if this upload completed its checklist,
 * and never let a failure doing so reach the traveller.
 *
 * Everything after a successful upload on this path is best-effort by
 * design: the file is stored and the row points at it, so somebody
 * watching a spinner must not be told their passport failed to upload
 * because a billing write lost its connection. The asymmetry is the
 * argument — an unstamped application is recoverable, because the next
 * document event on it re-runs this check and `cycleUsage` reads the
 * column rather than an event log, while a false "that upload did not
 * complete" sends a traveller to re-photograph a document that is
 * already safely stored.
 */
async function billIfComplete(applicationId: string, actorId: string) {
  try {
    const billing = await markBillableIfComplete(db, applicationId);
    if (billing.becameBillable) {
      await track("toplance.application_became_billable", { applicationId }, actorId);
    }
  } catch (error) {
    console.error(
      `[actions] billing check failed for application ${applicationId}`,
      error
    );
  }
}

/**
 * Tell the review desk when this upload was the one that finished the
 * checklist.
 *
 * The brief asks for it twice — item 9 wants 100% to "trigger an
 * automatic admin notification", item 11 wants that notification to be
 * "email + dashboard alert". Until now the desk heard about a case only
 * when the traveller pressed Submit, so somebody who uploaded every
 * document and then stopped never reached anyone. That is the person
 * this is for: at 100% and going nowhere.
 *
 * Runs at the same moment as the billing stamp and for the same reason —
 * after the pre-check, so a set of documents that is about to be flagged
 * has already been flagged and the checklist is not, in fact, complete.
 *
 * Best-effort like everything else on this path. `notifyAgency` never
 * throws on its own, but `markChecklistCompleteIfDone` writes, and a
 * traveller watching an upload spinner must not be told their passport
 * failed because a notification could not be sent.
 */
async function notifyDeskIfComplete(applicationId: string, actorId: string) {
  try {
    const { becameComplete } = await markChecklistCompleteIfDone(db, applicationId);
    if (!becameComplete) return;

    const [app] = await db
      .select({ caseRef: applications.caseRef })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (app) {
      await notifyAgency(applicationId, "checklist_complete", {
        caseRef: app.caseRef,
        url: appUrl(`/agency/clients/${applicationId}`),
      });
    }

    await track("toplance.checklist_completed", { applicationId }, actorId);
  } catch (error) {
    console.error(
      `[actions] completion notice failed for application ${applicationId}`,
      error
    );
  }
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
    // The second-factor gate that used to sit here guarded a staff
    // branch: this is a POST endpoint with a public id, so a staff
    // session that never enrolled one could mint signed passport-scan
    // URLs without loading a gated page. Under the v1.3 tenancy
    // `canReadDocuments` has no staff branch left to guard — the guard
    // above refuses them outright, and only the traveller and their own
    // agency reach this line.
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

    // Nothing is logged here any more. The entry this wrote existed to
    // make "staff access to a traveller's document is on the record"
    // true; staff no longer have access to record. Auditing an agency
    // reviewer reading their own client's file is a different promise to
    // a different audience, and is not made yet.
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

    revalidatePath("/[locale]/app", "layout");
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
        await notifyAgency(applicationId, "application_submitted", {
          caseRef: app.caseRef,
          // The case itself, not the console's front page. The agency
          // opens this notification to review a submission; landing them
          // on the dashboard makes them find it again by hand.
          url: appUrl(`/agency/clients/${applicationId}`),
        });
      }

      revalidatePath("/[locale]/app", "layout");
    }

    return result;
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}

/**
 * One message on a case thread — the traveller writes from
 * `/app/messages`, the agency from `/agency/clients/[id]`, and both call
 * this one action. The side is never trusted from the form: it comes
 * from the guarded actor, the same reason `updateProfile` never takes an
 * id.
 *
 * It used to read `actor.role === "staff" ? "staff" : "traveler"`, which
 * was written when the agency could not reach a thread at all. Once #51
 * made them a participant, that expression filed every reviewer's reply
 * under the traveller's own name — so the side is derived from who is
 * *not* the traveller, which is the same rule `sideOf` applies on read.
 *
 * The counterpart is notified, not the sender: the agency sending means
 * the traveller hears about it; a traveller sending goes to whoever
 * holds the case, or the whole agency while nobody does — the same
 * "assignee if set, else the agency" routing `submitApplication` uses.
 */
export async function sendMessage(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const body = String(formData.get("body") ?? "");

  try {
    const { actor, application } = await requireApplicationAccess(
      applicationId,
      canWriteMessages
    );
    const side = actor.role === "traveler" ? "traveler" : "agency";

    const result = await sendMessageRow(applicationId, actor.userId, side, body);
    if ("error" in result) return result;

    await track("toplance.message_sent", { applicationId, side }, actor.userId);

    const [sender] = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, actor.userId))
      .limit(1);
    const preview = body.trim().slice(0, 140);

    if (side === "agency") {
      // The agency's own name when the colleague has none on their
      // profile. It used to say "Toplance team", which tells the
      // traveller the one thing this product promises is not happening —
      // that somebody at Toplance is reading their case.
      const [agency] = application.orgId
        ? await db
            .select({ name: organisations.name })
            .from(organisations)
            .where(eq(organisations.id, application.orgId))
            .limit(1)
        : [];

      await notify(
        application.travelerId,
        "message_received",
        {
          senderName: sender?.fullName || agency?.name || "Your agency",
          preview,
          url: appUrl("/app/messages"),
        },
        applicationId
      );
    } else {
      // "Assignee if set, else the agency" is what `notifyAgency` now
      // does for every caller — and it adds the director, who this
      // hand-rolled version left out. The link can be the case itself
      // because that fan-out is scoped to the people who can open it.
      await notifyAgency(applicationId, "message_received", {
        senderName: sender?.fullName || "Unnamed",
        preview,
        url: appUrl(`/agency/clients/${applicationId}`),
      });
    }

    // Both sides read this thread: the traveller's messages page and the
    // agency's case screen, which exists as of #58.
    revalidateCase();
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
    revalidatePath("/[locale]/app", "layout");
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
    revalidatePath("/[locale]/app", "layout");
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

    revalidatePath("/[locale]/app", "layout");
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

    // Both consoles: the same action serves a traveller's profile and an
    // agent's, and the photo appears in the bar on every page of each.
    revalidatePath("/[locale]/app", "layout");
    revalidatePath("/[locale]/agency", "layout");
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

/**
 * Record the expiry date printed on the traveller's own visa.
 *
 * Guarded by `canWriteVisaExpiry`, which is narrower than every other
 * write here: the owning traveller and nobody else, not even staff. The
 * date is a fact about somebody's legal status that nothing in this
 * product verified, and the desk entering one would dress a third-hand
 * reading up as a record of ours.
 *
 * An empty field clears the date rather than failing — the traveller was
 * never obliged to give us one, so taking it back has to be possible.
 * Validation itself lives in `@/lib/domain/expiry` so the rules are
 * testable without a session or a database.
 */
export async function setVisaExpiry(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");

  try {
    const { actor } = await requireApplicationAccess(
      applicationId,
      canWriteVisaExpiry
    );

    const parsed = parseVisaExpiry(String(formData.get("visa_expires_on") ?? ""));
    if (!parsed.ok) return { error: parsed.error };

    await db
      .update(applications)
      .set({ visaExpiresOn: parsed.value, updatedAt: new Date() })
      .where(eq(applications.id, applicationId));

    await track(
      "toplance.visa_expiry_set",
      { applicationId, cleared: parsed.value === null },
      actor.userId
    );

    revalidatePath("/[locale]/app", "layout");
    return { ok: true };
  } catch (error) {
    const message = toActionError(error);
    if (message) return { error: message };
    throw error;
  }
}
