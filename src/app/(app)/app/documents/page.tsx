import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentRow } from "@/components/app/document-row";
import { SubmitButton } from "@/components/app/submit-button";
import { CompletionRing } from "@/components/app/completion-ring";
import { VERIFIED_MEANS } from "@/lib/domain/status";
import { createClient } from "@/lib/supabase/server";
import {
  completionOf,
  getDocuments,
  getOrCreateApplication,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const application = await getOrCreateApplication();
  if (!application) redirect("/sign-in?next=/app/documents");
  if (!application.intake_complete) redirect("/app/agent");

  const docs = await getDocuments(application.id);
  const completion = completionOf(docs);

  // Descriptions live on the corridor rule set, not on the application,
  // so guidance updates for everyone the moment a mission changes it.
  const supabase = await createClient();
  const { data: requirements } = application.corridor_id
    ? await supabase
        .from("corridor_requirements")
        .select("doc_key, description")
        .eq("corridor_id", application.corridor_id)
    : { data: [] };

  const descriptions = Object.fromEntries(
    (requirements ?? []).map((r) => [r.doc_key, r.description])
  );

  const attention = docs.filter((d) => d.state === "flagged" || d.state === "failed");
  const outstanding = docs.filter(
    (d) => d.state === "not_started" || d.state === "uploaded"
  );
  const settled = docs.filter(
    (d) => d.state === "verified" || d.state === "checking"
  );

  return (
    <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="t-h2">Your documents</h1>
          <p className="t-muted mt-2 measure">
            Each file is checked automatically within a few seconds of arriving, then
            confirmed by a person before submission. {VERIFIED_MEANS}
          </p>
        </div>
        <CompletionRing pct={completion.pct} size={120} />
      </div>

      {completion.pct === 100 && (
        <div className="mt-6 rounded-md border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,var(--mix))] p-5">
          <p className="t-title">Everything is verified</p>
          <p className="t-muted mt-2">
            Submitting sends your file to the review team and notifies them
            immediately.
          </p>
          <SubmitButton applicationId={application.id} />
        </div>
      )}

      {attention.length > 0 && (
        <section className="mt-8">
          <h2 className="special-caps">Needs attention</h2>
          <div className="mt-3 flex flex-col gap-4">
            {attention.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                applicationId={application.id}
                description={descriptions[doc.doc_key]}
              />
            ))}
          </div>
        </section>
      )}

      {outstanding.length > 0 && (
        <section className="mt-8">
          <h2 className="special-caps">Still to upload</h2>
          <div className="mt-3 flex flex-col gap-4">
            {outstanding.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                applicationId={application.id}
                description={descriptions[doc.doc_key]}
              />
            ))}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section className="mt-8">
          <h2 className="special-caps">Done</h2>
          <div className="mt-3 flex flex-col gap-4">
            {settled.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                applicationId={application.id}
                description={descriptions[doc.doc_key]}
              />
            ))}
          </div>
        </section>
      )}

      {docs.length === 0 && (
        <p className="t-muted mt-8">
          No checklist yet. Finish the intake conversation and it appears here.
        </p>
      )}
    </main>
  );
}
