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

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Traveler profile" };

/** An answer nobody has given yet — an absence, never an invented value. */
function Awaiting({ w = 64 }: { w?: number }) {
  return (
    <span
      aria-label="Not answered yet"
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
function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border-b border-border py-3">
      <dt className="special-caps">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold">
        {value || <Awaiting />}
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
      fact: `Traveling — ${answers.companions.toLowerCase()}`,
      why: "Sets who is on the document checklist",
    },
    answers.needs && {
      fact: answers.needs,
      why: "Carried into your arrival plan",
    },
    answers.accommodation && {
      fact: answers.accommodation,
      why: "Used as your proof of accommodation",
    },
    answers.history && {
      fact: `Visa history — ${answers.history.toLowerCase()}`,
      why: "Declared on the application, as it must be",
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
                <p className="tag">Traveler</p>
                <h1 className="d-lg mt-1.5 break-words text-ink">
                  {profile.fullName || "Traveler"}
                </h1>
                <p className="t-muted mt-1.5">
                  {answers.nationality || <Awaiting w={80} />}
                  {/* City and country read as one place, not two fields:
                      "living in Lagos, Nigeria". Either half may be
                      missing — the intake asks them as separate topics,
                      so one can be answered before the other. */}
                  {(answers.residence || answers.residence_country) && (
                    <span>
                      {" "}
                      · living in{" "}
                      {[answers.residence, answers.residence_country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </p>
                {sponsorName && (
                  <p className="t-muted mt-3">
                    Sponsored by <strong className="text-ink">{sponsorName}</strong> —
                    they see your progress, not your documents.
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
              <p className="special-caps">Case number</p>
              <p className="num mt-0.5 text-[15px] font-semibold text-ink">
                {application.caseRef.toUpperCase()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={application.status} />
              <Badge variant="brand">
                <span className="num">{completion.pct}%</span> complete
              </Badge>
            </div>
            <Button
              asChild
              variant="neutral"
              size="sm"
              className="w-full sm:ms-auto sm:w-auto"
            >
              <Link href="/app/agent">Edit trip answers</Link>
            </Button>
          </div>
        </Panel>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
          {/* ---- personal and travel details ---- */}
          <Panel>
            <PanelHeader
              label="Personal and travel details"
              aside={
                <Badge variant="brand">
                  <Sparkles /> Collected by the agent
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
                <DetailField label="Name on passport" value={answers.passport_name} />
                <DetailField label="Email" value={profile.email} />
                <EditablePhone countryIso={countryIso} digits={phoneDigits} />
                <EditableLanguage locale={locale} />
                <EditableDigest digest={companionDigest} />
                <DetailField label="Nationality" value={answers.nationality} />
                <DetailField label="Currently in" value={answers.residence_country} />
                <DetailField label="City or town" value={answers.residence} />
                <DetailField label="Destination" value={answers.destination} />
                <DetailField label="Purpose" value={answers.purpose} />
                <DetailField label="Target dates" value={answers.dates} />
                <DetailField label="Budget" value={answers.budget} />
                <DetailField label="Travel party" value={answers.companions} />
              </dl>

              {/* The field grid above already closes with a hairline, so
                  the first block here draws no top border of its own —
                  `divide-y` rules only between blocks. */}
              <div className="mt-1 grid divide-y divide-border">
                <div className="py-4">
                  <h3 className="t-title">Food and support needs</h3>
                  <p className="t-muted mt-1.5">
                    {answers.needs || <Awaiting w={120} />}
                  </p>
                </div>
                <div className="py-4">
                  <h3 className="t-title">Prior visa history</h3>
                  <p className="t-muted mt-1.5">
                    {answers.history || <Awaiting w={120} />}
                  </p>
                </div>
                {corridor && (
                  <div className="py-4 pb-0">
                    <h3 className="t-title">Matched requirement</h3>
                    <p className="t-muted mt-1.5">
                      {corridor.visaName}
                      {fee && <span className="num"> · {fee}</span>}
                      {weeks && <span className="num"> · {weeks}</span>}
                    </p>
                    <p className="special mt-2 flex items-start gap-1.5">
                      <Clock3 className="mt-px size-4 shrink-0" aria-hidden />
                      <span>
                        {corridor.sourceName ?? "Official source"} · rule set
                        v{corridor.version} · in effect since {effective}
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
              label="Travel history"
              aside={
                trips.length > 0 ? (
                  <Badge variant="neutral">
                    <span className="num">{trips.length}</span>
                    {trips.length === 1 ? "trip" : "trips"}
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
            <PanelHeader label="Arrival plan" />
            <PanelBody>
              {itinerary ? (
                <>
                  <p className="special flex items-start gap-1.5">
                    <Clock3 className="mt-px size-4 shrink-0" aria-hidden />
                    <span>Generated {formatDay(itinerary.generatedAt)}</span>
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
                <p className="t-muted">
                  Once your application is approved, your first weeks land
                  here — arrival, accommodation, registration and the rest.
                  Nothing to plan yet.
                </p>
              )}
            </PanelBody>
          </Panel>
          </div>

          <div className="grid gap-6">
            {/* ---- agent memory ---- */}
            <Panel>
              <PanelHeader label="What the agent has learned" />
              <PanelBody>
                <p className="t-muted">
                  Updated automatically after every interaction.
                </p>
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
                  <p className="t-muted mt-4">
                    Nothing yet. Answer the agent&rsquo;s questions and what it
                    keeps appears here.
                  </p>
                )}
              </PanelBody>
            </Panel>

            {/* ---- documents summary ---- */}
            <Panel>
              <PanelHeader
                label="Documents"
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
                      ["Verified", verified],
                      ["Need attention", attention],
                      ["Still to do", toDo],
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
                    Open documents <ArrowRight />
                  </Link>
                </Button>
              </PanelBody>
            </Panel>

            {/* ---- notes from the case team ---- */}
            <Panel>
              <PanelHeader label="Notes from your case team" />
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
                          {note.authorName ?? "Toplance team"} ·{" "}
                          {formatDay(note.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="t-muted pt-3">
                    Nothing yet. When the review team writes on your file,
                    you read it here — no note is kept from you.
                  </p>
                )}
              </PanelBody>
            </Panel>

            {/* ---- status history ---- */}
            <Panel>
              <PanelHeader
                label="Status history"
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
                  <p className="t-muted pt-3">
                    Every change to your application&rsquo;s status is
                    recorded here, with the date it happened.
                  </p>
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>
      </Shell>
    </main>
  );
}
