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
  getProfile,
  getStatusEvents,
} from "@/lib/data/applications";
import { getCaseNotes } from "@/lib/data/case-notes";
import { listTravelRecords } from "@/lib/data/travel-records";
import {
  EditableLanguage,
  EditableName,
  EditablePhone,
} from "@/components/app/profile-fields";
import { TravelHistory } from "@/components/app/travel-history";
import { STATUS } from "@/lib/domain/status";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { countryBy } from "@/lib/domain/countries";
import { isLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Traveller profile" };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

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

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border py-3">
      <dt className="t-body shrink-0 text-ink-2">{label}</dt>
      <dd className="min-w-0 truncate text-right text-base font-semibold">
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

/**
 * Whatever shape a generated itinerary lands in, show the parts that
 * read as prose and skip the rest — never invent a section an empty
 * payload does not have.
 */
function itinerarySections(payload: unknown): { label: string; text: string }[] {
  if (!payload || typeof payload !== "object") return [];
  return Object.entries(payload as Record<string, unknown>).flatMap(
    ([key, value]) => {
      const text = Array.isArray(value)
        ? value.filter((v) => typeof v === "string").join(" · ")
        : typeof value === "string"
          ? value
          : null;
      if (!text) return [];
      const label = key.replace(/[_-]+/g, " ");
      return [{ label: label[0].toUpperCase() + label.slice(1), text }];
    }
  );
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

  const [docs, answers, corridor, trips, notes, events, itinerary] =
    await Promise.all([
      getDocuments(application.id),
      getIntakeAnswers(application.id),
      getCorridorFor(application.id),
      listTravelRecords(profile.id),
      getCaseNotes(application.id),
      getStatusEvents(application.id),
      getItinerary(application.id),
    ]);

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
      fact: `Travelling — ${answers.companions.toLowerCase()}`,
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
            className="security-paper pointer-events-none absolute inset-x-0 top-0 h-[110px] opacity-60"
          />
          <PanelBody className="relative flex flex-wrap items-start gap-x-6 gap-y-5 py-6 sm:px-8">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--brand)_13%,transparent)] text-[20px] font-bold tracking-wide text-brand-text">
              {initials(profile.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="d-lg text-ink">{profile.fullName || "Traveller"}</h1>
              <p className="t-muted mt-1">
                {answers.nationality || <Awaiting w={80} />}
                {answers.residence && (
                  <span> · living in {answers.residence}</span>
                )}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                <Badge variant="brand">
                  <span className="num">{completion.pct}%</span> complete
                </Badge>
                <Badge variant="outline">
                  <span className="num">
                    Case {application.caseRef.toUpperCase()}
                  </span>
                </Badge>
              </div>
            </div>
            <Button asChild variant="neutral" size="sm" className="sm:ml-auto">
              <Link href="/app/agent">Edit trip answers</Link>
            </Button>
          </PanelBody>
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
              <dl className="grid gap-x-10 sm:grid-cols-2">
                <div>
                  <EditableName fullName={profile.fullName} />
                  <DetailRow label="Email" value={profile.email} />
                  <EditablePhone countryIso={countryIso} digits={phoneDigits} />
                  <EditableLanguage locale={locale} />
                  <DetailRow label="Nationality" value={answers.nationality} />
                  <DetailRow label="Currently in" value={answers.residence} />
                </div>
                <div>
                  <DetailRow label="Destination" value={answers.destination} />
                  <DetailRow label="Purpose" value={answers.purpose} />
                  <DetailRow label="Target dates" value={answers.dates} />
                  <DetailRow label="Budget" value={answers.budget} />
                  <DetailRow label="Travel party" value={answers.companions} />
                </div>
              </dl>

              <div className="mt-5 space-y-5">
                <div className="border-t border-border pt-4">
                  <h3 className="t-title">Food and support needs</h3>
                  <p className="t-muted mt-1.5">
                    {answers.needs || <Awaiting w={120} />}
                  </p>
                </div>
                <div className="border-t border-border pt-4">
                  <h3 className="t-title">Prior visa history</h3>
                  <p className="t-muted mt-1.5">
                    {answers.history || <Awaiting w={120} />}
                  </p>
                </div>
                {corridor && (
                  <div className="border-t border-border pt-4">
                    <h3 className="t-title">Matched requirement</h3>
                    <p className="t-muted mt-1.5">
                      {corridor.visaName}
                      {fee && <span className="num"> · {fee}</span>}
                      {weeks && <span className="num"> · {weeks}</span>}
                    </p>
                    <p className="special mt-2 flex items-center gap-1.5">
                      <Clock3 className="size-4" aria-hidden />
                      {corridor.sourceName ?? "Official source"} · rule set v
                      {corridor.version} · in effect since {effective}
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
                  <p className="special flex items-center gap-1.5">
                    <Clock3 className="size-4" aria-hidden />
                    Generated {formatDay(itinerary.generatedAt)}
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
              <PanelHeader
                label="What the agent has learned"
                aside={
                  <Badge variant="brand">
                    <Sparkles /> AI
                  </Badge>
                }
              />
              <PanelBody>
                <p className="t-muted">
                  Updated automatically after every interaction.
                </p>
                {learned.length > 0 ? (
                  <ul className="mt-4">
                    {learned.map((item, i) => (
                      <li key={item.fact} className="relative pb-5 pl-6 last:pb-0">
                        {i < learned.length - 1 && (
                          <span
                            aria-hidden
                            className="absolute bottom-0 left-[5px] top-5 w-px bg-border"
                          />
                        )}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-[5px] size-3 rounded-full",
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
