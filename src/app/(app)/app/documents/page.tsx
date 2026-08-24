import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { DocumentRow } from "@/components/app/document-row";
import { SubmitButton } from "@/components/app/submit-button";
import { CompletionRing } from "@/components/app/completion-ring";
import { Shell } from "@/components/shared/shell";
import { VERIFIED_MEANS } from "@/lib/domain/status";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import { corridorRequirements } from "@/lib/db/schema";
import {
  completionOf,
  getDocuments,
  getOrCreateApplication,
  type DocumentRow as Doc,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const application = await getOrCreateApplication();
  if (!application) redirect("/sign-in?next=/app/documents");
  if (!application.intakeComplete) redirect("/app/agent");

  const docs = await getDocuments(application.id);
  const completion = completionOf(docs);

  // Descriptions live on the corridor rule set, not on the application,
  // so guidance updates for everyone the moment a mission changes it.
  const requirements = application.corridorId
    ? await db
        .select({
          docKey: corridorRequirements.docKey,
          description: corridorRequirements.description,
        })
        .from(corridorRequirements)
        .where(eq(corridorRequirements.corridorId, application.corridorId))
    : [];

  const descriptions = Object.fromEntries(
    requirements.map((r) => [r.docKey, r.description])
  );

  /**
   * Three sets, in the order a person acts on them: what is blocking
   * them, what is still theirs to do, and what is finished. Ordering by
   * `sortOrder` alone buries a rejected passport scan under nine done
   * rows.
   */
  const sets: { label: string; docs: Doc[] }[] = [
    {
      label: "Needs attention",
      docs: docs.filter((d) => d.state === "flagged" || d.state === "failed"),
    },
    {
      label: "Still to upload",
      docs: docs.filter(
        (d) => d.state === "not_started" || d.state === "uploaded"
      ),
    },
    {
      label: "Done",
      docs: docs.filter(
        (d) => d.state === "verified" || d.state === "checking"
      ),
    },
  ];

  return (
    <main>
      <Shell className="py-10 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <div className="max-w-[62ch]">
            <h1 className="t-h2">Your documents</h1>
            <p className="t-muted mt-3">
              Each file is checked automatically within a few seconds of
              arriving, then confirmed by a person before submission.{" "}
              {VERIFIED_MEANS}
            </p>
          </div>
          <CompletionRing pct={completion.pct} size={120} />
        </div>

        {completion.pct === 100 && (
          /* The 3px rule is §8's boundary mark, and this is a real
             boundary: everything above it is collecting, everything
             after it is a file in someone else's hands. It is the only
             place on this screen that earns one. */
          <section className="mt-12">
            <span
              aria-hidden
              className="block h-[3px] w-16 rounded-[var(--radius-pill)] bg-success"
            />
            <h2 className="t-h3 mt-4">Everything is verified</h2>
            <p className="t-muted mt-2 max-w-[74ch]">
              Submitting sends your file to the review team and notifies them
              immediately.
            </p>
            <SubmitButton applicationId={application.id} />
          </section>
        )}

        {sets.map(
          (set) =>
            set.docs.length > 0 && (
              <section key={set.label} className="mt-12">
                <h2 className="special-caps border-t border-border-strong pt-4">
                  {set.label}
                </h2>
                <div className="mt-2">
                  {set.docs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      applicationId={application.id}
                      description={descriptions[doc.docKey]}
                    />
                  ))}
                </div>
              </section>
            )
        )}

        {docs.length === 0 && (
          <p className="t-muted mt-12 max-w-[62ch]">
            No checklist yet. Finish the intake conversation and it appears
            here.
          </p>
        )}
      </Shell>
    </main>
  );
}
