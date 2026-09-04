import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentRow } from "@/components/app/document-row";
import { UploadOutcomeProvider } from "@/components/app/upload-outcome";
import { SubmitButton } from "@/components/app/submit-button";
import { CompletionRing } from "@/components/app/completion-ring";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Badge } from "@/components/ui/badge";
import { VERIFIED_MEANS } from "@/lib/domain/status";
import { UPLOAD_GUIDANCE } from "@/lib/domain/uploads";
import { hasDatabaseEnv } from "@/lib/db/client";
import {
  completionOf,
  getDocuments,
  getOrCreateApplication,
  type DocumentRow as Doc,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import type { BadgeVariant } from "@/lib/domain/status";

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

  /**
   * Whether uploading this row finishes the traveller's part of the
   * checklist, so its dialog can say so instead of asking for a next
   * document that does not exist.
   *
   * "Collected", matching the ring, not "verified": the traveller has
   * done everything asked of them the moment the last file is in, and
   * what happens after that is the review team's to report. The `1` is
   * this row itself — it is still outstanding as the page renders, and
   * the upload is what clears it.
   */
  const outstandingRequired = docs.filter(
    (d) => d.isRequired && d.state !== "checking" && d.state !== "verified"
  ).length;
  const completesChecklist = (doc: Doc) =>
    doc.isRequired &&
    doc.state !== "checking" &&
    doc.state !== "verified" &&
    outstandingRequired === 1;

  /**
   * Three sets, in the order a person acts on them: what is blocking
   * them, what is still theirs to do, and what is finished. Ordering by
   * `sortOrder` alone buries a rejected passport scan under nine done
   * rows.
   */
  const sets: { label: string; variant: BadgeVariant; docs: Doc[] }[] = [
    {
      label: "Needs attention",
      variant: "warning",
      docs: docs.filter((d) => d.state === "flagged" || d.state === "failed"),
    },
    {
      label: "Still to upload",
      variant: "neutral",
      docs: docs.filter(
        (d) => d.state === "not_started" || d.state === "uploaded"
      ),
    },
    {
      label: "Done",
      variant: "success",
      docs: docs.filter(
        (d) => d.state === "verified" || d.state === "checking"
      ),
    },
  ];

  return (
    <main>
      <Shell className="py-8 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <div className="max-w-[62ch]">
            <h1 className="t-h2">Your documents</h1>
            <p className="t-muted mt-3">
              Each file is checked automatically within a few seconds of
              arriving, then confirmed by a person before submission.{" "}
              {VERIFIED_MEANS}
            </p>
            {/* Said before they photograph anything, not after a refusal.
                Legibility is the largest single cause of a re-upload and
                the one thing entirely within the traveller's control at
                the moment they take the picture. */}
            <p className="t-muted mt-3">{UPLOAD_GUIDANCE}</p>
          </div>
          <CompletionRing pct={completion.pct} size={120} />
        </div>

        {/* The ring reaches 100% when everything is uploaded; this
            section needs the stronger condition — every required
            document past review — because that is what the submit
            transaction checks. This is a real boundary: everything above
            it is collecting, everything after it is a file in someone
            else's hands, so it is the one tinted sheet on the screen. */}
        {completion.total > 0 && completion.verified === completion.total && (
          <section className="mt-8 rounded-lg border border-[color-mix(in_srgb,var(--success)_32%,transparent)] bg-[color-mix(in_srgb,var(--success)_7%,transparent)] px-5 py-5 sm:px-6">
            <h2 className="t-h3">Everything is verified</h2>
            <p className="t-muted mt-2 max-w-[74ch]">
              Submitting sends your file to the review team and notifies them
              immediately.
            </p>
            <SubmitButton applicationId={application.id} />
          </section>
        )}

        {/* The outcome dialog sits outside the sets, because uploading
            moves a row from one set to another — a dialog owned by the
            row would be unmounted by that re-sort moments after opening.
            See `UploadOutcomeProvider`. */}
        <UploadOutcomeProvider
          docs={docs.map((d) => ({
            docKey: d.docKey,
            name: d.name,
            state: d.state,
            reason: d.reason,
          }))}
        >
          {sets.map(
            (set) =>
              set.docs.length > 0 && (
                <Panel key={set.label} className="mt-6">
                  <PanelHeader
                    label={set.label}
                    aside={
                      <Badge variant={set.variant}>
                        <span className="num">{set.docs.length}</span>
                        {set.docs.length === 1 ? "document" : "documents"}
                      </Badge>
                    }
                  />
                  <div>
                    {/* Guidance comes off the checklist row itself. It was
                      joined from `corridor_requirements` through
                      `applications.corridor_id`, which is null for any
                      rule set with no row of ours behind it — an API
                      provider answering, or an application a re-seed
                      detached — and this screen then showed bare
                      document names while the requirements screen beside
                      it showed the same list in full. `adoptRuleSet`
                      copies the wording across and refreshes it when a
                      mission rewords a requirement, so the live-update
                      property the join gave is kept without the join. */}
                    {set.docs.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        applicationId={application.id}
                        description={doc.description}
                        completesChecklist={completesChecklist(doc)}
                      />
                    ))}
                  </div>
                </Panel>
              ),
          )}
        </UploadOutcomeProvider>

        {docs.length === 0 && (
          <Panel className="mt-6">
            <PanelBody>
              <p className="t-muted max-w-[62ch]">
                No checklist yet. Finish the intake conversation and it
                appears here.
              </p>
            </PanelBody>
          </Panel>
        )}
      </Shell>
    </main>
  );
}
