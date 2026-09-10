import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentRow } from "@/components/app/document-row";
import { DownloadDocuments } from "@/components/shared/download-documents";
import { UploadOutcomeProvider } from "@/components/app/upload-outcome";
import { SubmitButton } from "@/components/app/submit-button";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Badge } from "@/components/ui/badge";
import { CompletionRing } from "@/components/app/completion-ring";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  canSubmitFrom,
  sentBackWithoutDetail,
  submissionNotice,
} from "@/lib/domain/status";
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
   * How many documents this traveller's agency has asked for by hand.
   *
   * Counted rather than filtered to the outstanding ones, because
   * `sentBackWithoutDetail` asks whether the desk has named anything at
   * all — a traveller who has uploaded what was asked for has nothing
   * outstanding and must still be able to resubmit.
   */
  const requestedCount = docs.filter((d) => d.source === "agency").length;

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
      {/* The header follows the reader down the page.

          This screen is a list of eight to twelve documents and the
          reason to be on it is to work through them, so the two things
          that orient that work — which screen this is, and how much of
          it is done — should not be things you scroll back up to find.
          It sticks under the app bar rather than at `top-0`, because
          `AppBar` is already `sticky top-0 z-40`; `--bar-h` is that
          bar's height and `z-30` puts this underneath it, so the two
          never overlap. `rail.tsx` offsets by the same token.

          Full-bleed background with the row inside a `Shell`, the same
          construction and for the same reason as `AppBar`: a sticky
          strip that stops short of the edges reads as a floating card,
          while the heading still starts on the measure every other
          heading starts on.

          The height cap is the one thing that makes this safe. A sticky
          box taller than the space under the bar can never be scrolled
          past, so on a short viewport with the guidance open the
          overflow scrolls inside the header instead of trapping the
          page. */}
      <div className="sticky top-[var(--bar-h)] z-30 max-h-[calc(100dvh-var(--bar-h))] overflow-y-auto border-b border-border bg-bg">
        <Shell className="py-4 md:py-5">
          {/* The ring stays, at the client's request, and the download
              button rides with it — the two things that were on this
              row before now travel together into the strip that follows
              the reader down.

              `items-center` rather than `items-start`: the button sits
              beside a 96px circle, and aligning their tops leaves the
              button floating against the ring's shoulder.

              96px, not the 120px it was. The figure inside is `t-h3` in
              a 72px opening at this size — "100%" measures about 62px,
              so three digits still clear the arc, which is the
              constraint the original comment inside the ring is about.
              What 96 buys is a strip that is always on screen costing
              ~150px instead of ~190px. */}
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
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
            {/* 128, not 96: the caption under the figure is uppercase at
                0.08em tracking, and inside a 96px ring the opening is
                72px — "COLLECTED" is ~80px, so it sat across the arc and
                clipped. 128 leaves a 104px opening, which holds every
                locale's caption ("an tattara", "tí a kójọ", …). */}
            <CompletionRing
              pct={completion.pct}
              size={128}
              caption={t.collectedCaption[locale]}
              ariaLabel={fill(t.collectedCount[locale], {
                pct: String(completion.pct),
              })}
            />
          </div>

          {/* Folded shut by default.

              These three paragraphs are read once, on the first visit,
              and are furniture on every visit after it — but they were
              permanently on screen, and with the heading and the ring
              above them they took the top third of the page before the
              first upload button. Three columns was the last attempt at
              this and bought back a third of the height; the client
              asked again on 10 September, and the honest answer to
              copy that matters once is a disclosure, not a smaller
              font.

              `type="single" collapsible` — one panel, and clicking the
              open one shuts it, which is what "click to open, click to
              close" asks for. `AccordionItem` drops its bottom rule
              because the sticky container already carries one. */}
          <Accordion type="single" collapsible>
            <AccordionItem value="guidance" className="border-b-0">
              <AccordionTrigger className="min-h-0 py-3 text-base">
                {t.guidanceToggle[locale]}
              </AccordionTrigger>
              <AccordionContent className="max-w-none pb-4">
                {/* Three columns, not one stacked block and not one
                    long line. Stacked in a 62ch column, three
                    paragraphs take twice the height for the same words;
                    removing the measure trades that for a
                    140-character line at this page's width, which is
                    the other way to make a paragraph unreadable. §6's
                    measures are about a paragraph being readable, and a
                    column here is one.

                    They stack below `md`, where there is only one
                    column's worth of width to begin with. */}
                <div className="grid gap-x-10 gap-y-3 md:grid-cols-3">
                  <p className="t-muted">
                    {t.intro[locale]} {VERIFIED_MEANS[locale]}
                  </p>
                  {/* Said before they photograph anything, not after a
                      refusal. Legibility is the largest single cause of
                      a re-upload and the one thing entirely within the
                      traveller's control at the moment they take the
                      picture. */}
                  <p className="t-muted">
                    {fill(UPLOADS.guidance[locale], {
                      formats: UPLOADS.acceptedFormats[locale],
                      size: MAX_UPLOAD_LABEL,
                    })}
                  </p>
                  {/* Mandatory, not a nicety. Decision 2 made the
                      pre-check unconditional — there is no setting
                      under which a traveller's file is not read by a
                      machine — so saying so is what makes it honest,
                      and it is said where they upload rather than
                      buried in terms. */}
                  <p className="t-muted">{t.precheckDisclosure[locale]}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Shell>
      </div>

      <Shell className="py-6 md:py-8">
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
          /* Sent back for documents nobody has named yet.
             Checked ahead of `canSubmitFrom` because it is the narrower
             claim and both are true at once: `additional_documents` is
             in `RESUBMITTABLE`, so without this the green sheet won and
             the screen read "Everything is verified. Nothing else is
             waiting on you" beside a status card asking for documents.
             Nothing here is a contradiction the traveller can resolve —
             the missing half is on the desk. */
          (sentBackWithoutDetail(application.status, requestedCount) ? (
            <section className="mt-8 rounded-lg border border-border-strong px-5 py-5 sm:px-6">
              <h2 className="t-h3">{t.sentBackHeading[locale]}</h2>
              <p className="t-muted mt-2 max-w-[74ch]">{t.sentBackBody[locale]}</p>
            </section>
          ) : canSubmitFrom(application.status) ? (
            <section className="mt-8 rounded-lg border border-[color-mix(in_srgb,var(--success)_32%,transparent)] bg-[color-mix(in_srgb,var(--success)_7%,transparent)] px-5 py-5 sm:px-6">
              <h2 className="t-h3">{t.everythingVerifiedHeading[locale]}</h2>
              <p className="t-muted mt-2 max-w-[74ch]">
                {t.everythingVerifiedBody[locale]}
              </p>
              <SubmitButton applicationId={application.id} />
            </section>
          ) : submissionNotice(application.status) === "success" ? (
            /* Just sent, by the click they have this second made. The
               green sheet above was replaced by the grey one below the
               instant they pressed Submit, so the screen's answer to the
               biggest act on it was to look like every other state — and
               the only thing that said it had worked was a toast that
               fades. This is that confirmation, and it stays. */
            <section className="mt-8 rounded-lg border border-[color-mix(in_srgb,var(--success)_32%,transparent)] bg-[color-mix(in_srgb,var(--success)_7%,transparent)] px-5 py-5 sm:px-6">
              <h2 className="t-h3">{t.submittedHeading[locale]}</h2>
              <p className="t-muted mt-2 max-w-[74ch]">{t.submittedBody[locale]}</p>
            </section>
          ) : (
            /* Somewhere further on — under review, with the embassy, or
               decided. Saying where it is beats saying nothing: the panel
               disappearing on its own would read as the submission having
               failed. Neutral on purpose; none of these is a report on
               the act of submitting. */
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
