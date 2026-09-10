import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentRow } from "@/components/app/document-row";
import { DownloadDocuments } from "@/components/shared/download-documents";
import { UploadOutcomeProvider } from "@/components/app/upload-outcome";
import { SubmitButton } from "@/components/app/submit-button";
import { CompletionRing } from "@/components/app/completion-ring";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Badge } from "@/components/ui/badge";
import { canSubmitFrom } from "@/lib/domain/status";
import { STATUS_COPY, VERIFIED_MEANS } from "@/lib/i18n/status";
import { MAX_UPLOAD_LABEL } from "@/lib/domain/uploads";
import { UPLOADS } from "@/lib/i18n/uploads";
import { fill } from "@/lib/i18n/fill";
import { hasDatabaseEnv } from "@/lib/db/client";
import {
  completionOf,
  getDocuments,
  getApplication,
  type DocumentRow as Doc,
} from "@/lib/data/applications";
import { SetupNotice } from "@/components/shared/setup-notice";
import type { BadgeVariant } from "@/lib/domain/status";
import { getLocale } from "@/lib/i18n/server";
import { DOCUMENTS } from "@/lib/i18n/documents";
import { ARCHIVE } from "@/lib/i18n/archive";
import { exportableDocuments } from "@/lib/storage/archive";
import { withLocalePrefix } from "@/lib/i18n/paths";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: DOCUMENTS.title[locale] };
}

export default async function DocumentsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const t = DOCUMENTS;
  const application = await getApplication();
  if (!application) redirect(withLocalePrefix("/go", await getLocale()));
  if (!application.intakeComplete) redirect(withLocalePrefix("/app/agent", await getLocale()));

  const docs = await getDocuments(application.id);
  const completion = completionOf(docs);

  /**
   * How many files exist to be downloaded — not `completion.collected`,
   * which counts required documents only and would hide the link from a
   * traveller who has uploaded nothing but optional ones.
   */
  const uploaded = exportableDocuments(docs).length;

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
      label: t.needsAttention[locale],
      variant: "warning",
      docs: docs.filter((d) => d.state === "flagged" || d.state === "failed"),
    },
    {
      label: t.stillToUpload[locale],
      variant: "neutral",
      docs: docs.filter(
        (d) => d.state === "not_started" || d.state === "uploaded"
      ),
    },
    {
      label: t.done[locale],
      variant: "success",
      docs: docs.filter(
        (d) => d.state === "verified" || d.state === "checking"
      ),
    },
  ];

  return (
    <main id="main">
      <Shell className="py-8 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
          <div>
            <h1 className="t-h2">{t.heading[locale]}</h1>
            {/* Only once there is something to download. An empty
                checklist offering a copy of nothing is a button that
                exists to disappoint, and the route answers 404 for the
                same state. */}
            {uploaded > 0 && (
              <div className="mt-4">
                <DownloadDocuments
                  applicationId={application.id}
                  label={ARCHIVE.travelerLabel[locale]}
                  preparingLabel={ARCHIVE.preparingLabel[locale]}
                />
              </div>
            )}
          </div>
          <CompletionRing pct={completion.pct} size={120} />
        </div>

        {/* Three columns, not one stacked block and not one long line.

            Stacked in a 62ch column beside the ring — what this was —
            three paragraphs took twice the height for the same words and
            pushed the first document off the fold, which is what the
            client saw. But simply removing the measure trades that for a
            140-character line at this page's width, which is the other
            way to make a paragraph unreadable.

            Side by side, each block keeps a sane measure, the row fills
            the width of the panels it explains, and the whole explainer
            costs a third of the vertical space. §6's measures are about
            a paragraph being readable; a column here is one.

            They stack below `md`, where there is only one column's worth
            of width to begin with. */}
        <div className="mt-6 grid gap-x-10 gap-y-3 border-t border-border pt-6 md:grid-cols-3">
          <p className="t-muted">
            {t.intro[locale]} {VERIFIED_MEANS[locale]}
          </p>
          {/* Said before they photograph anything, not after a refusal.
              Legibility is the largest single cause of a re-upload and
              the one thing entirely within the traveller's control at
              the moment they take the picture. */}
          <p className="t-muted">
            {fill(UPLOADS.guidance[locale], {
              formats: UPLOADS.acceptedFormats[locale],
              size: MAX_UPLOAD_LABEL,
            })}
          </p>
          {/* Mandatory, not a nicety. Decision 2 made the pre-check
              unconditional — there is no setting under which a
              traveller's file is not read by a machine — so saying so
              is what makes it honest, and it is said where they upload
              rather than buried in terms. */}
          <p className="t-muted">{t.precheckDisclosure[locale]}</p>
        </div>

{/* The ring reaches 100% when everything is uploaded; this
            section needs the stronger condition — every required
            document past review — because that is what the submit
            transaction checks. This is a real boundary: everything above
            it is collecting, everything after it is a file in someone
            else's hands, so it is the one tinted sheet on the screen.

            `canSubmitFrom` is the other half, and it was missing: a
            checklist stays complete after submission, so this panel used
            to keep offering to send a case that was already with the
            desk. The transaction refused the second click, which meant
            the screen invited an action and then told the traveller off
            for taking it. Drawn from the same list the transaction
            enforces, the two cannot disagree. */}
        {/* Everything uploaded, nothing signed off yet. The gap this
            fills is the state a traveller is in for most of the time
            they spend on this page: the ring beside the heading counts
            `collected` and reads 100%, the panel below was gated on
            `verified` and rendered nothing at all, so finishing the
            checklist looked identical to having done nothing. The
            dialog that fires on the last upload is not a substitute —
            it is dismissed once and cannot be returned to, and it does
            not fire at all when the last action was replacing a row
            already in `checking`.

            It offers no action on purpose. There is genuinely nothing
            to do: `SubmitButton` needs every document past a human, and
            an invented next step here would be the one place in the
            product that overstates where a file has got to. */}
        {completion.total > 0 &&
          completion.verified < completion.total &&
          completion.collected === completion.total && (
            <section className="mt-8 rounded-lg border border-border-strong px-5 py-5 sm:px-6">
              <h2 className="t-h3">{t.everythingCollectedHeading[locale]}</h2>
              <p className="t-muted mt-2 max-w-[74ch]">
                {t.everythingCollectedBody[locale].replace(
                  "{count}",
                  String(completion.total)
                )}
              </p>
            </section>
          )}

        {completion.total > 0 &&
          completion.verified === completion.total &&
          (canSubmitFrom(application.status) ? (
            <section className="mt-8 rounded-lg border border-[color-mix(in_srgb,var(--success)_32%,transparent)] bg-[color-mix(in_srgb,var(--success)_7%,transparent)] px-5 py-5 sm:px-6">
              <h2 className="t-h3">{t.everythingVerifiedHeading[locale]}</h2>
              <p className="t-muted mt-2 max-w-[74ch]">
                {t.everythingVerifiedBody[locale]}
              </p>
              <SubmitButton applicationId={application.id} />
            </section>
          ) : (
            /* Already sent. Saying where it is beats saying nothing:
               the panel disappearing on its own would read as the
               submission having failed. */
            <section className="mt-8 rounded-lg border border-border-strong px-5 py-5 sm:px-6">
              <h2 className="t-h3">{STATUS_COPY[application.status].label[locale]}</h2>
              <p className="t-muted mt-2 max-w-[74ch]">
                {STATUS_COPY[application.status].blurb[locale]}
              </p>
            </section>
          ))}

        {/* The outcome dialog sits outside the sets, because uploading
            moves a row from one set to another — a dialog owned by the
            row would be unmounted by that re-sort moments after opening.
            See `UploadOutcomeProvider`. */}
        <UploadOutcomeProvider
          applicationId={application.id}
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
                        {set.docs.length === 1
                          ? t.documentSingular[locale]
                          : t.documentPlural[locale]}
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
              <p className="t-muted max-w-[62ch]">{t.noChecklistYet[locale]}</p>
            </PanelBody>
          </Panel>
        )}
      </Shell>
    </main>
  );
}
