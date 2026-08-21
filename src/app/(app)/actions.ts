"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";

const PURPOSE_MAP: Record<string, string> = {
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
  const supabase = await createClient();

  const index = INTAKE_QUESTIONS.findIndex((q) => q.key === questionKey);
  if (index === -1) return { error: "Unknown question." };

  const laterKeys = INTAKE_QUESTIONS.slice(index + 1).map((q) => q.key);

  const { error } = await supabase
    .from("intake_answers")
    .upsert(
      { application_id: applicationId, question_key: questionKey, value },
      { onConflict: "application_id,question_key" }
    );

  if (error) return { error: error.message };

  if (laterKeys.length) {
    await supabase
      .from("intake_answers")
      .delete()
      .eq("application_id", applicationId)
      .in("question_key", laterKeys);
  }

  const { data: answers } = await supabase
    .from("intake_answers")
    .select("question_key, value")
    .eq("application_id", applicationId);

  const map = Object.fromEntries((answers ?? []).map((a) => [a.question_key, a.value]));
  const complete = INTAKE_QUESTIONS.every((q) => map[q.key]);

  if (complete) {
    await buildChecklist(applicationId, map);
  } else {
    await supabase
      .from("applications")
      .update({ intake_complete: false })
      .eq("id", applicationId);
  }

  revalidatePath("/app", "layout");
  return { complete };
}

/**
 * Resolve the corridor from the answers, then materialise its rule set
 * as this application's checklist. Documents already uploaded keep their
 * state, so switching destination does not throw away a verified
 * passport.
 */
async function buildChecklist(applicationId: string, answers: Record<string, string>) {
  const supabase = await createClient();

  const nationality = NATIONALITY_MAP[answers.nationality] ?? "ng";
  const destination = DESTINATION_MAP[answers.destination];
  const purpose = PURPOSE_MAP[answers.purpose];

  if (!destination || !purpose) {
    await supabase
      .from("applications")
      .update({ intake_complete: true, status: "collecting_documents" })
      .eq("id", applicationId);
    return;
  }

  const { data: corridor } = await supabase
    .from("corridors")
    .select("id")
    .eq("nationality_iso", nationality)
    .eq("destination_iso", destination)
    .eq("purpose", purpose as never)
    .eq("is_live", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!corridor) {
    // A corridor we do not serve yet. The intake still completes; the
    // requirements screen explains that it is in the build queue.
    await supabase
      .from("applications")
      .update({ intake_complete: true, corridor_id: null, status: "collecting_documents" })
      .eq("id", applicationId);
    return;
  }

  const { data: requirements } = await supabase
    .from("corridor_requirements")
    .select("*")
    .eq("corridor_id", corridor.id)
    .order("sort_order");

  const { data: existing } = await supabase
    .from("documents")
    .select("doc_key, state")
    .eq("application_id", applicationId);

  const keep = new Set((existing ?? []).map((d) => d.doc_key));

  const rows = (requirements ?? [])
    .filter((r) => !keep.has(r.doc_key))
    .map((r) => ({
      application_id: applicationId,
      doc_key: r.doc_key,
      name: r.name,
      is_required: r.is_required,
      sort_order: r.sort_order,
    }));

  if (rows.length) await supabase.from("documents").insert(rows);

  // Drop rows this corridor no longer asks for, unless already uploaded.
  const wanted = new Set((requirements ?? []).map((r) => r.doc_key));
  const stale = (existing ?? [])
    .filter((d) => !wanted.has(d.doc_key) && d.state === "not_started")
    .map((d) => d.doc_key);

  if (stale.length) {
    await supabase
      .from("documents")
      .delete()
      .eq("application_id", applicationId)
      .in("doc_key", stale);
  }

  await supabase
    .from("applications")
    .update({
      intake_complete: true,
      corridor_id: corridor.id,
      status: "collecting_documents",
    })
    .eq("id", applicationId);
}

/**
 * Upload a file for one checklist item. The object path is namespaced by
 * application id, which is what the storage policy keys off — a
 * traveller can only write inside their own application's folder.
 */
export async function uploadDocument(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const docKey = String(formData.get("doc_key") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file or take a photo first." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "That file is over 10MB. Photograph it again at a lower size." };
  }

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${applicationId}/${docKey}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    return {
      error:
        "That upload did not complete. Your place is saved — try again when you have signal.",
    };
  }

  const { error } = await supabase
    .from("documents")
    .update({ state: "checking", storage_path: path, reason: null })
    .eq("application_id", applicationId)
    .eq("doc_key", docKey);

  if (error) return { error: error.message };

  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function removeDocument(applicationId: string, docKey: string) {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("application_id", applicationId)
    .eq("doc_key", docKey)
    .maybeSingle();

  if (doc?.storage_path) {
    await supabase.storage.from("documents").remove([doc.storage_path]);
  }

  await supabase
    .from("documents")
    .update({ state: "not_started", storage_path: null, reason: null })
    .eq("application_id", applicationId)
    .eq("doc_key", docKey);

  revalidatePath("/app", "layout");
  return { ok: true };
}

/**
 * Submission is gated on the checklist, not on the traveller's opinion
 * of it. At 100% the review team is notified; below it, the button does
 * not exist.
 */
export async function submitApplication(applicationId: string) {
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("state, is_required")
    .eq("application_id", applicationId);

  const required = (docs ?? []).filter((d) => d.is_required);
  const outstanding = required.filter((d) => d.state !== "verified").length;

  if (outstanding > 0) {
    return { error: `${outstanding} document${outstanding === 1 ? "" : "s"} still to verify.` };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  await supabase.from("status_events").insert({
    application_id: applicationId,
    to_status: "submitted",
    message: "All documents verified. Your file has gone to the review team.",
  });

  revalidatePath("/app", "layout");
  return { ok: true };
}
