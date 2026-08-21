import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Application = Tables<"applications">;
export type DocumentRow = Tables<"documents">;
export type Profile = Tables<"profiles">;

export type Completion = { total: number; verified: number; pct: number };

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/**
 * A traveller has one application in flight at a time. This returns it,
 * creating a draft on first visit so the intake agent always has
 * somewhere to write answers.
 */
export async function getOrCreateApplication(): Promise<Application | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("applications")
    .select("*")
    .eq("traveler_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("applications")
    .insert({ traveler_id: user.id })
    .select("*")
    .single();

  if (error) {
    console.error("[applications] could not create draft", error.message);
    return null;
  }
  return created;
}

export async function getIntakeAnswers(applicationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intake_answers")
    .select("question_key, value")
    .eq("application_id", applicationId);

  return Object.fromEntries((data ?? []).map((r) => [r.question_key, r.value]));
}

export async function getDocuments(applicationId: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("application_id", applicationId)
    .order("sort_order");

  return data ?? [];
}

/**
 * One definition of "percent complete", shared by the traveller's
 * dashboard, the reviewer's queue and the employer's roster. Optional
 * documents are excluded so an applicant is never held below 100% by a
 * document nobody requires.
 */
export function completionOf(docs: DocumentRow[]): Completion {
  const required = docs.filter((d) => d.is_required);
  const verified = required.filter((d) => d.state === "verified").length;
  const total = required.length;
  return {
    total,
    verified,
    pct: total === 0 ? 0 : Math.round((100 * verified) / total),
  };
}

export async function getCorridorFor(applicationId: string) {
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("corridor_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!app?.corridor_id) return null;

  const { data } = await supabase
    .from("corridors")
    .select("*")
    .eq("id", app.corridor_id)
    .maybeSingle();

  return data ?? null;
}
