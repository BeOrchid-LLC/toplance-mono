import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  completionOf,
  getCorridorFor,
  getDocuments,
  getIntakeAnswers,
  getItinerary,
  getOrCreateApplication,
  getOrgName,
  getProfile,
  getStatusEvents,
} from "@/lib/data/applications";
import { getCaseNotes } from "@/lib/data/case-notes";
import { listTravelRecords } from "@/lib/data/travel-records";
import {
  EditableDigest,
  EditableLanguage,
  EditableName,
  EditablePhone,
  type CompanionDigest,
} from "@/components/app/profile-fields";
import { ItineraryAudio } from "@/components/app/itinerary-audio";
import { AvatarUpload } from "@/components/app/avatar-upload";
import { TravelHistory } from "@/components/app/travel-history";
import { signedDocumentUrl } from "@/lib/storage/documents";
import { readDigestFrequency } from "@/lib/domain/digest";
import { STATUS } from "@/lib/domain/status";
import { itinerarySections } from "@/lib/domain/itinerary";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { countryBy } from "@/lib/domain/countries";
import { isLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { PROFILE } from "@/lib/i18n/profile";
import { currencyForCountryName } from "@/lib/domain/currencies";
import { convertFee, formatApproximate } from "@/lib/domain/fx";
import { getPairRate } from "@/lib/fx/rates";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: PROFILE.title[locale] };
}

/** An answer nobody has given yet — an absence, never an invented value. */
function Awaiting({ w = 64, label }: { w?: number; label: string }) {
  return (
    <span
      aria-label={label}
      style={{ width: w }}
      className="inline-block border-b-2 border-dashed border-border-strong align-middle"
    />
  );
}

/**
 * One field of the data page: a caps label over its value, the way a
 * passport labels its fields. Stacking is also the responsive fix — a
 * label-left/value-right row has nowhere to go at 320px, and a value
 * (an email, a destination) must wrap rather than truncate, because a
 * traveller has to be able to read their own record.
 */
function DetailField({
  label,
  value,
  notAnsweredLabel,
}: {
  label: string;
  value?: string | null;
  notAnsweredLabel: string;
}) {
  return (
    <div className="border-b border-border py-3">
      <dt className="special-caps">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold">
        {value || <Awaiting label={notAnsweredLabel} />}
      </dd>
    </div>
  );
}

function formatDay(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFee(minor: number | null, currency: string | null) {
  if (minor == null) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency ?? "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export default async function ProfilePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  // The traveller's interface language — from the URL/proxy, same as
  // every other screen. Distinct from `locale` below, which is the
  // *stored preference* the "Language" field edits; the two can and do
  // disagree today (see the handover notes), and this page's own copy
  // should still follow the interface language it is actually rendered
  // under.
  const uiLocale = await getLocale();
  const t = PROFILE;
  const profile = await getProfile();
  const application = await getOrCreateApplication();
  if (!profile || !application) redirect("/sign-in?next=/app/profile");

  // The profile is the intake's output; before it there is nothing to show.
  if (!application.intakeComplete) redirect("/app/agent");

  const [docs, answers, corridor, trips, notes, events, itinerary, sponsorName] =
    await Promise.all([
      getDocuments(application.id),
      getIntakeAnswers(application.id),
      getCorridorFor(application.id),
      listTravelRecords(profile.id),
      getCaseNotes(application.id),
      getStatusEvents(application.id),
      getItinerary(application.id),
      getOrgName(application.orgId),
    ]);

  // The bucket is private, so the photo is a fresh short-lived link on
  // every render — same stance as documents, and this page is already
  // force-dynamic.
  const avatarUrl = profile.avatarPath
    ? await signedDocumentUrl(profile.avatarPath)
    : null;

  // Unset reads as the documented default. The cron route reads the
  // same column through the same function, so the frequency this page
  // shows and the cadence that actually sends cannot disagree.
  const companionDigest: CompanionDigest = readDigestFrequency(
    profile.notificationPrefs
  );

  // The stored phone is E.164; the inline editor wants national digits
  // with the dial code supplied by the country picker.
  const countryIso = profile.countryIso ?? "ng";
  const dial = countryBy(countryIso).dial.replace("+", "");
  const phoneDigits = profile.phone
    ? profile.phone.replace(/^\+/, "").replace(new RegExp(`^${dial}`), "")
    : "";
  const locale = isLocale(profile.locale) ? profile.locale : "en";

  const completion = completionOf(docs);
  const attention = docs.filter(
    (d) => d.state === "flagged" || d.state === "failed"
  ).length;
  const verified = docs.filter((d) => d.state === "verified").length;
  const toDo = docs.length - verified - attention;

  /**
   * What the agent has learned: each remembered answer paired with the
   * concrete thing it changes downstream. Only real answers appear —
   * nothing here is invented to fill the timeline (§7).
   */
  const learned = [
    answers.companions && {
      fact: `${t.travelingPrefix[uiLocale]} ${answers.companions.toLowerCase()}`,
      why: t.travelingWhy[uiLocale],
    },
    answers.needs && {
      fact: answers.needs,
      why: t.needsWhy[uiLocale],
    },
    answers.accommodation && {
      fact: answers.accommodation,
      why: t.accommodationWhy[uiLocale],
    },
    answers.history && {
      fact: `${t.visaHistoryPrefix[uiLocale]} ${answers.history.toLowerCase()}`,
      why: t.visaHistoryWhy[uiLocale],
    },
  ].filter(Boolean) as { fact: string; why: string }[];

  const fee = corridor
    ? formatFee(corridor.governmentFeeMinor, corridor.governmentFeeCurrency)
    : null;
  const weeks =
    corridor?.processingWeeksMin && corridor?.processingWeeksMax
      ? `${corridor.processingWeeksMin}–${corridor.processingWeeksMax} weeks`
      : null;
  const effective = corridor
    ? new Date(corridor.effectiveFrom).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  /**
   * The same government fee, approximated into the traveller's own
   * currency — the residence-driven conversion `requirements/page.tsx`
   * already does, reused here rather than reinvented. Residence is
   * already part of this page's existing `getIntakeAnswers` fetch, so
   * this adds no new query. Degrades to nothing (no `feeApprox` line)
   * whenever the fee, the currency pair, or a fresh rate is missing —
   * same as everywhere else this conversion is shown.
   */
  const feeLocalCurrency =
    currencyForCountryName(answers.residence_country) ??
    currencyForCountryName(answers.nationality);
  const feePair = corridor
    ? await getPairRate(corridor.governmentFeeCurrency, feeLocalCurrency)
    : null;
  const feeApproximate = corridor
    ? convertFee({
        minor: corridor.governmentFeeMinor,
        from: corridor.governmentFeeCurrency,
        to: feeLocalCurrency,
        rate: feePair?.rate ?? null,
        fetchedAt: feePair?.fetchedAt ?? null,
      })
    : null;
  const feeApprox = feeApproximate
    ? `${formatApproximate(feeApproximate, uiLocale)} ${t.approxAtRatesDate[uiLocale].replace(
        "{date}",
        feeApproximate.fetchedAt.toLocaleDateString(uiLocale, {
          day: "numeric",
          month: "long",
        })
      )}`
    : null;

  return (
    <main>
      <Shell className="py-8 md:py-10">
        {/* ---- identity ---- */}
        <Panel className="relative">
          {/* The ruled ground of a passport data page, at the threshold
              of visible — the identity sheet is the one card in the file
              that is about a person rather than a process, and it gets
              the document material to say so. */}
          <div
            aria-hidden
            className="security-paper pointer-events-none absolute inset-x-0 top-0 h-[140px] opacity-60"
          />
          <PanelBody className="relative py-6 sm:px-8 sm:py-7">
            <div className="flex items-start gap-5 sm:gap-7">
              {/* The photo window. A passport photo is a portrait
                  rectangle, not a circle — the avatar keeps that aspect
                  here, on the one card that is the traveller's data
                  page. The circle in the app bar stays a circle. */}
              <AvatarUpload fullName={profile.fullName} avatarUrl={avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="tag">{t.travelerTag[uiLocale]}</p>
                <h1 className="d-lg mt-1.5 break-words text-ink">
                  {profile.fullName || t.travelerFallback[uiLocale]}
                </h1>
                <p className="t-muted mt-1.5">
                  {answers.nationality || (
                    <Awaiting w={80} label={t.notAnsweredAria[uiLocale]} />
                  )}
                  {/* City and country read as one place, not two fields:
                      "living in Lagos, Nigeria". Either half may be
                      missing — the intake asks them as separate topics,
                      so one can be answered before the other. */}
                  {(answers.residence || answers.residence_country) && (
                    <span>
                      {" "}
                      · {t.livingIn[uiLocale]}{" "}
                      {[answers.residence, answers.residence_country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </p>
                {sponsorName && (
                  <p className="t-muted mt-3">
                    {t.sponsoredBy[uiLocale]}{" "}
                    <strong className="text-ink">{sponsorName}</strong> —{" "}
                    {t.sponsoredByTail[uiLocale]}
                  </p>
                )}
              </div>
            </div>
          </PanelBody>
          {/* The case facts, in a band at the foot of the sheet — the
              same place the machine-readable strip sits on a data page,
              and the same place the corridor laminate carries its case
              reference. Nothing here ever shares a shrinking row with
              the name above. */}
          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border px-5 py-4 sm:px-8">
            {/* The file's identifier leads the band, labelled like every
                other field on the sheet — a bare code among pills reads
                as noise, a labelled one reads as the document number. */}
            <div className="shrink-0">
              <p className="special-caps">{t.caseNumberLabel[uiLocale]}</p>
              <p className="num mt-0.5 text-[15px] font-semibold text-ink">
                {application.caseRef.toUpperCase()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={application.status} />
              <Badge variant="brand">
                <span className="num">{completion.pct}%</span>{" "}
                {t.percentComplete[uiLocale]}
              </Badge>
            </div>
            <Button
              asChild
              variant="neutral"
              size="sm"
              className="w-full sm:ms-auto sm:w-auto"
            >
              <Link href="/app/agent">{t.editTripAnswers[uiLocale]}</Link>
            </Button>
          </div>
        </Panel>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
          {/* ---- personal and travel details ---- */}
          <Panel>
            <PanelHeader
              label={t.personalDetailsLabel[uiLocale]}
              aside={
                <Badge variant="brand">
                  <Sparkles /> {t.collectedByAgent[uiLocale]}
                </Badge>
              }
            />
            <PanelBody className="pt-2">
              {/* Fields flow across one grid rather than filling two
                  fixed half-columns, so the sheet reads in rows the way
                  a data page does and collapses to a single column
                  without re-ordering. */}
              <dl className="grid gap-x-10 sm:grid-cols-2">
                <EditableName fullName={profile.fullName} />
                {/* Beside the account name deliberately. A visa is issued
                    to the passport's spelling, so the two disagreeing is
                    what a reviewer needs to catch before an application
                    reaches a mission — not something to reconcile away. */}
                <DetailField
                  label={t.nameOnPassport[uiLocale]}
                  value={answers.passport_name}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.emailLabel[uiLocale]}
                  value={profile.email}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <EditablePhone countryIso={countryIso} digits={phoneDigits} />
                <EditableLanguage locale={locale} />
                <EditableDigest digest={companionDigest} />
                <DetailField
                  label={t.nationalityLabel[uiLocale]}
                  value={answers.nationality}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.currentlyIn[uiLocale]}
                  value={answers.residence_country}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.cityOrTown[uiLocale]}
                  value={answers.residence}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.destinationLabel[uiLocale]}
                  value={answers.destination}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.purposeLabel[uiLocale]}
                  value={answers.purpose}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.targetDatesLabel[uiLocale]}
                  value={answers.dates}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.budgetLabel[uiLocale]}
                  value={answers.budget}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
                <DetailField
                  label={t.travelPartyLabel[uiLocale]}
                  value={answers.companions}
                  notAnsweredLabel={t.notAnsweredAria[uiLocale]}
                />
              </dl>

              {/* The field grid above already closes with a hairline, so
                  the first block here draws no top border of its own —
                  `divide-y` rules only between blocks. */}
              <div className="mt-1 grid divide-y divide-border">
                <div className="py-4">
                  <h3 className="t-title">{t.foodAndSupportNeeds[uiLocale]}</h3>
                  <p className="t-muted mt-1.5">
                    {answers.needs || <Awaiting w={120} label={t.notAnsweredAria[uiLocale]} />}
                  </p>
                </div>
                <div className="py-4">
                  <h3 className="t-title">{t.priorVisaHistory[uiLocale]}</h3>
                  <p className="t-muted mt-1.5">
                    {answers.history || <Awaiting w={120} label={t.notAnsweredAria[uiLocale]} />}
                  </p>
                </div>
                {corridor && (
                  <div className="py-4 pb-0">
                    <h3 className="t-title">{t.matchedRequirement[uiLocale]}</h3>
                    <p className="t-muted mt-1.5">
                      {corridor.visaName}
                      {fee && <span className="num"> · {fee}</span>}
                      {feeApprox && <span className="num"> · {feeApprox}</span>}
                      {weeks && <span className="num"> · {weeks}</span>}
                    </p>
                    <p className="special mt-2 flex items-start gap-1.5">
                      <Clock3 className="mt-px size-4 shrink-0" aria-hidden />
                      <span>
                        {corridor.sourceName ?? t.officialSourceFallback[uiLocale]} ·{" "}
                        {t.ruleSetVersion[uiLocale].replace("{version}", String(corridor.version))} ·{" "}
                        {t.inEffectSince[uiLocale].replace("{date}", effective ?? "")}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </PanelBody>
          </Panel>

          {/* ---- travel history ---- */}
          <Panel>
            <PanelHeader
              label={t.travelHistoryLabel[uiLocale]}
              aside={
                trips.length > 0 ? (
                  <Badge variant="neutral">
                    <span className="num">{trips.length}</span>
                    {trips.length === 1 ? t.tripSingular[uiLocale] : t.tripPlural[uiLocale]}
                  </Badge>
                ) : undefined
              }
            />
            <PanelBody>
              <TravelHistory
                trips={trips.map((t) => ({
                  id: t.id,
                  country: t.country,
                  purpose: t.purpose,
                  startedOn: t.startedOn,
                  endedOn: t.endedOn,
                }))}
              />
            </PanelBody>
          </Panel>

          {/* ---- itinerary ---- */}
          <Panel>
            <PanelHeader label={t.arrivalPlanLabel[uiLocale]} />
            <PanelBody>
              {itinerary ? (
                <>
                  <p className="special flex items-start gap-1.5">
                    <Clock3 className="mt-px size-4 shrink-0" aria-hidden />
                    <span>
                      {t.generatedOn[uiLocale].replace(
                        "{date}",
                        formatDay(itinerary.generatedAt)
                      )}
                    </span>
                  </p>
                  <dl className="mt-2">
                    {itinerarySections(itinerary.payload).map((section) => (
                      <div
                        key={section.label}
                        className="border-b border-border py-3 last:border-b-0"
                      >
                        <dt className="t-title">{section.label}</dt>
                        <dd className="t-muted mt-1">{section.text}</dd>
                      </div>
                    ))}
                  </dl>
                  <ItineraryAudio applicationId={application.id} />
                </>
              ) : (
                <p className="t-muted">{t.noItineraryYet[uiLocale]}</p>
              )}
            </PanelBody>
          </Panel>
          </div>

          <div className="grid gap-6">
            {/* ---- agent memory ---- */}
            <Panel>
              <PanelHeader label={t.agentLearnedLabel[uiLocale]} />
              <PanelBody>
                <p className="t-muted">{t.updatedAutomatically[uiLocale]}</p>
                {learned.length > 0 ? (
                  <ul className="mt-4">
                    {learned.map((item, i) => (
                      <li key={item.fact} className="relative pb-5 ps-6 last:pb-0">
                        {i < learned.length - 1 && (
                          <span
                            aria-hidden
                            className="absolute bottom-0 start-[5px] top-5 w-px bg-border"
                          />
                        )}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute start-0 top-[5px] size-3 rounded-full",
                            i === 0
                              ? "bg-brand ring-4 ring-[color-mix(in_srgb,var(--brand)_18%,transparent)]"
                              : "bg-success ring-4 ring-[color-mix(in_srgb,var(--success)_16%,transparent)]"
                          )}
                        />
                        <p className="t-title">{item.fact}</p>
                        <p className="t-muted mt-0.5">{item.why}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="t-muted mt-4">{t.nothingLearnedYet[uiLocale]}</p>
                )}
              </PanelBody>
            </Panel>

            {/* ---- documents summary ---- */}
            <Panel>
              <PanelHeader
                label={t.documentsLabel[uiLocale]}
                aside={
                  <Badge variant="brand">
                    <span className="num">{completion.pct}%</span>
                  </Badge>
                }
              />
              <PanelBody className="pt-2">
                <dl>
                  {(
                    [
                      [t.verifiedLabel[uiLocale], verified],
                      [t.needAttentionLabel[uiLocale], attention],
                      [t.stillToDoLabel[uiLocale], toDo],
                    ] as const
                  ).map(([label, count]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-6 border-b border-border py-3"
                    >
                      <dt className="t-body text-ink-2">{label}</dt>
                      <dd className="num text-base font-semibold">{count}</dd>
                    </div>
                  ))}
                </dl>
                <Button asChild variant="neutral" size="block" className="mt-5">
                  <Link href="/app/documents">
                    {t.openDocuments[uiLocale]} <ArrowRight />
                  </Link>
                </Button>
              </PanelBody>
            </Panel>

            {/* ---- notes from the case team ---- */}
            <Panel>
              <PanelHeader label={t.notesFromCaseTeam[uiLocale]} />
              <PanelBody className="pt-2">
                {notes.length > 0 ? (
                  <ul>
                    {notes.map((note) => (
                      <li
                        key={note.id}
                        className="border-b border-border py-3 last:border-b-0"
                      >
                        <p className="t-body max-w-[62ch]">{note.body}</p>
                        <p className="special mt-1.5">
                          {note.authorName ?? t.toplanceTeamFallback[uiLocale]} ·{" "}
                          {formatDay(note.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="t-muted pt-3">{t.noNotesYet[uiLocale]}</p>
                )}
              </PanelBody>
            </Panel>

            {/* ---- status history ---- */}
            <Panel>
              <PanelHeader
                label={t.statusHistoryLabel[uiLocale]}
                aside={<StatusBadge status={application.status} short />}
              />
              <PanelBody className="pt-2">
                {events.length > 0 ? (
                  <ul>
                    {events.map((event) => (
                      <li
                        key={event.id}
                        className="border-b border-border py-3 last:border-b-0"
                      >
                        <div className="flex items-baseline justify-between gap-6">
                          <p className="t-title">
                            {STATUS[event.toStatus].label}
                          </p>
                          <p className="special num shrink-0">
                            {formatDay(event.createdAt)}
                          </p>
                        </div>
                        {event.message && (
                          <p className="t-muted mt-1 max-w-[62ch]">
                            {event.message}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="t-muted pt-3">{t.noStatusHistoryYet[uiLocale]}</p>
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>
      </Shell>
    </main>
  );
}
