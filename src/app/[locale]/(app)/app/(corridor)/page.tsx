import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AttendanceNotice } from "@/components/app/attendance-notice";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { RouteDiagram } from "@/components/app/route-diagram";
import { STATUS_COPY, VERIFIED_MEANS } from "@/lib/i18n/status";
import { COMPANION } from "@/lib/i18n/companion";
import { nextStepFor, type NextStep } from "@/lib/domain/next-step";
import {
  completionOf,
  getDocuments,
  getIntakeAnswers,
  getApplication,
  getProfile,
} from "@/lib/data/applications";
import { latestAttendanceRequest } from "@/lib/data/attendance";
import { unreadCountFor } from "@/lib/data/messages";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { DASHBOARD } from "@/lib/i18n/dashboard";
import { withLocalePrefix } from "@/lib/i18n/paths";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: DASHBOARD.title[locale] };
}

/**
 * An answer nobody has given yet. The same dashed rule the landing page
 * uses for a figure nobody has earned — §7 forbids inventing the number,
 * and an em dash reads as a value rather than as an absence.
 */
function Awaiting({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      className="inline-block w-[64px] border-b-2 border-dashed border-border-strong align-middle"
    />
  );
}

export default async function DashboardPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const t = DASHBOARD;
  const profile = await getProfile();
  const application = await getApplication();
  if (!profile || !application) redirect(withLocalePrefix("/go", await getLocale()));

  // Intake first — there is nothing meaningful to show before it.
  if (!application.intakeComplete) redirect(withLocalePrefix("/app/agent", await getLocale()));

  const [docs, attendance, answers, unreadMessages] = await Promise.all([
    getDocuments(application.id),
    latestAttendanceRequest(application.id),
    getIntakeAnswers(application.id),
    unreadCountFor(application.id, "traveler"),
  ]);

  const completion = completionOf(docs);
  const statusCopy = STATUS_COPY[application.status];
  /**
   * Sent back beats everything else this page could say.
   *
   * The ring can honestly read 100% while a document is waiting to be
   * redone — it measures collecting, and the file was collected. What
   * it must not do is leave "100%" as the only sentence on the screen
   * while the agency is waiting for a new one, which is the
   * contradiction the client called out on 8 September. The headline
   * names the documents, because "additional document needed" without
   * saying which is a question rather than an instruction.
   */
  const sentBack = docs.filter((d) => d.isRequired && d.state === "flagged");

  /**
   * What the lead plate says, decided in one place rather than in four
   * nested ternaries on a screen. `nextStepFor` reads the status first:
   * the checklist only gets a say while the case is still the
   * traveller's to send.
   */
  const step = nextStepFor({
    status: application.status,
    completion,
    sentBack: sentBack.map((d) => d.name),
  });
  const actionable =
    step.kind !== "with_team" && step.kind !== "decided" && step.kind !== "interview";

  return (
    <main id="main">
      <Shell className="py-8 md:py-10">
        {/* The masthead: where this traveller is on their corridor.
            §3 spends the boldness here and demotes the headline number
            that used to lead — `CompletionRing` is gone from this screen
            because the diagram already says how far along you are, and
            a ring beside it is the same fact twice. */}
        <RouteDiagram facts={application} locale={locale} />

        {/* Below the diagram but above the next action, deliberately.
            Every other thing on this page is about a document; this one
            asks the reader to be somewhere on a day, and it is the only
            message here whose cost of being missed is a missed
            appointment. The diagram above is orientation, not an alert,
            so it does not displace this. */}
        <div className="mt-8">
          <AttendanceNotice request={attendance} locale={locale} />
        </div>
        {/*
          The lead card is the next action, not a greeting. The corridor,
          the status and the case reference are all on the header above
          this, so the dashboard's own job is the one sentence about what
          happens next.
        */}
        {/* `items-start`, so each column is its own height. The plate
            used to be stretched and vertically centred because it sat
            beside the completion ring; with the ring gone that left the
            copy floating in the middle of a tall empty panel. */}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <Panel>
            <PanelBody className="py-8 sm:px-8 sm:py-10">
              <div className="max-w-[58ch]">
                <h1 className="t-h2">{headingOf(step, locale)}</h1>
                {bodyOf(step, locale) && (
                  <p className="t-body-lg mt-3 text-ink-2">{bodyOf(step, locale)}</p>
                )}
                {/* Only while the checklist is still the subject. Once
                    the case has gone, "verified means accepted for
                    review" is answering a question nobody is asking —
                    and beside a decision it is worse than noise. */}
                {actionable && (
                  <p className="special mt-4 text-ink-2">{VERIFIED_MEANS[locale]}</p>
                )}
                {/* The one `--way` object on this screen, per §4.1 —
                    the next action and nothing else wears it. The
                    arrows that used to close three of these four labels
                    are gone: §4.2 keeps arrows for route diagrams and
                    corridor pairs, and bans them on a button outright.
                    `Upload` stays; it names the act rather than
                    pointing.

                    It is absent entirely while the case is with the
                    desk: `--way` marks the next action, and a traveller
                    waiting on a decision has none. A button that leads
                    to a screen which has correctly stopped offering the
                    action is worse than no button. */}
                {actionable ? (
                  <Button asChild variant="way" className="mt-6">
                    <Link href="/app/documents">
                      {step.kind === "sent_back" ? (
                        t.ctaFixSentBack[locale]
                      ) : step.kind === "review_submit" ? (
                        t.ctaReviewSubmit[locale]
                      ) : step.kind === "checking" ? (
                        t.ctaSeeDocuments[locale]
                      ) : (
                        <>
                          <Upload /> {t.ctaUploadNext[locale]}
                        </>
                      )}
                    </Link>
                  </Button>
                ) : (
                  step.kind === "decided" &&
                  step.outcome === "granted" && (
                    // The arrival companion is the genuine next step,
                    // and it exists only from `approved` — the same
                    // condition the rail uses to show its tab.
                    <Button asChild variant="way" className="mt-6">
                      <Link href="/app/companion">{COMPANION.title[locale]}</Link>
                    </Button>
                  )
                )}
              </div>
            </PanelBody>
          </Panel>

          {/* Status and handler share a sheet: both answer "who has my
              file", and side by side with the ring they fill the column
              without inventing a third fact to pad it. */}
          <Panel>
            <PanelHeader label={t.statusPanelLabel[locale]} />
            <PanelBody>
              <StatusBadge status={application.status} locale={locale} />
              <p className="t-muted mt-3">{statusCopy.blurb[locale]}</p>
            </PanelBody>
            <PanelHeader label={t.caseHandlerLabel[locale]} className="border-t" />
            <PanelBody>
              <p className="t-muted">{t.caseHandlerBody[locale]}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild variant="neutral" size="sm">
                  <Link href="/app/messages">
                    <MessageSquare /> {t.openMessages[locale]}
                    {unreadMessages > 0 && (
                      <Badge variant="brand">
                        <span className="num">{unreadMessages}</span>
                      </Badge>
                    )}
                  </Link>
                </Button>
                <Button asChild variant="tertiary" size="sm">
                  <Link href="/app/agent">
                    <Sparkles /> {t.askAgent[locale]}
                  </Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              label={t.tripGlanceLabel[locale]}
              aside={
                <Link
                  href="/app/agent"
                  className="text-base font-semibold text-brand-text hover:underline"
                >
                  {t.editLink[locale]}
                </Link>
              }
            />
            <PanelBody className="pt-2">
              <dl>
                {(
                  [
                    [t.labelDestination[locale], answers.destination],
                    [t.labelPurpose[locale], answers.purpose],
                    [t.labelTargetDates[locale], answers.dates],
                    [t.labelBudget[locale], answers.budget],
                    [t.labelTravelParty[locale], answers.companions],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-0 last:pb-0"
                  >
                    <dt className="t-body text-ink-2">{label}</dt>
                    <dd className="text-end text-base font-semibold">
                      {value ?? <Awaiting label={t.notAnsweredAria[locale]} />}
                    </dd>
                  </div>
                ))}
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              label={t.travelerProfileLabel[locale]}
              aside={
                <Badge variant="brand">
                  <Sparkles /> {t.collectedByAgent[locale]}
                </Badge>
              }
            />
            <PanelBody>
              <p className="t-muted">{t.profileBlurb[locale]}</p>
              <Button asChild variant="neutral" size="sm" className="mt-4">
                <Link href="/app/profile">{t.openProfile[locale]}</Link>
              </Button>
            </PanelBody>
          </Panel>
        </div>
      </Shell>
    </main>
  );
}

/** The plate's headline, one per state of `nextStepFor`. */
function headingOf(step: NextStep, locale: Locale): string {
  switch (step.kind) {
    case "sent_back":
      return (
        step.names.length === 1
          ? DASHBOARD.headingSentBackOne[locale]
          : DASHBOARD.headingSentBackMany[locale]
      ).replace("{n}", String(step.names.length));
    case "review_submit":
      return DASHBOARD.headingVerified[locale];
    case "checking":
      return DASHBOARD.headingUploaded[locale];
    case "to_upload":
      return (
        step.outstanding === 1
          ? DASHBOARD.headingToUploadOne[locale]
          : DASHBOARD.headingToUploadMany[locale]
      ).replace("{n}", String(step.outstanding));
    case "interview":
      return DASHBOARD.headingInterview[locale];
    case "with_team":
      return DASHBOARD.headingWithTeam[locale];
    case "decided":
      return step.outcome === "granted"
        ? DASHBOARD.headingApproved[locale]
        : DASHBOARD.headingRefused[locale];
  }
}

/**
 * The sentence under it, or an empty string where the heading says the
 * whole thing — which is only the approved plate. See `headingApproved`.
 */
function bodyOf(step: NextStep, locale: Locale): string {
  switch (step.kind) {
    case "sent_back":
      return DASHBOARD.bodySentBack[locale].replace("{names}", step.names.join(", "));
    case "review_submit":
      return DASHBOARD.bodyVerified[locale];
    case "checking":
      return DASHBOARD.bodyUploaded[locale]
        .replace("{verified}", String(step.verified))
        .replace("{total}", String(step.total));
    case "to_upload":
      return DASHBOARD.bodyToUpload[locale]
        .replace("{collected}", String(step.collected))
        .replace("{total}", String(step.total));
    case "interview":
      return "";
    case "with_team":
      return DASHBOARD.bodyWithTeam[locale];
    case "decided":
      return step.outcome === "granted" ? "" : DASHBOARD.bodyRefused[locale];
  }
}
