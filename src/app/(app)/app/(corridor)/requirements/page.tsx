import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, ExternalLink, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/shared/shell";
import { Panel, PanelHeader } from "@/components/shared/panel";
import { hasDatabaseEnv } from "@/lib/db/client";
import {
  getDocuments,
  getIntakeAnswers,
  getOrCreateApplication,
} from "@/lib/data/applications";
import { adoptRuleSet } from "@/lib/data/checklist";
import { appliesToTraveller } from "@/lib/domain/applies-when";
import { corridorGap } from "@/lib/domain/corridor-gap";
import { currencyForCountryName } from "@/lib/domain/currencies";
import { convertFee, formatApproximate } from "@/lib/domain/fx";
import { getPairRate } from "@/lib/fx/rates";
import {
  DESTINATION_ISO,
  NATIONALITY_ISO,
  PURPOSE_ISO,
} from "@/lib/domain/corridors";
import { resolveEntryCheck, resolveRuleSet } from "@/lib/visa";
import type { EntryCheck } from "@/lib/visa";
import { SetupNotice } from "@/components/shared/setup-notice";

// Needs a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Visa requirements" };

/**
 * Returns null rather than a dash when the rule set does not carry a
 * fee. The caller draws the dashed rule §7 asks for — an em dash is
 * still a rendered value, and a traveller reading one next to
 * "Government fee" cannot tell "nothing to pay" from "we do not know".
 */
function formatFee(minor: number | null, currency: string | null) {
  if (minor == null) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency ?? "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function Figure({ value, label }: { value: string | null; label: string }) {
  if (value) return <>{value}</>;
  return (
    <span
      aria-label={`${label}: awaiting a real figure`}
      className="inline-block w-[88px] border-b-2 border-dashed border-border-strong align-middle"
    />
  );
}

/**
 * The page one requirement was read from, when it differs from — or
 * simply predates — the corridor's own source line.
 *
 * A checklist comes from the visa centre while the fee comes from the
 * mission, so a single source line at the foot of the sheet cannot cover
 * every row above it. Renders nothing at all for a requirement without
 * one: an unlinked line is honest, an invented link is not.
 */
function RequirementSource({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text hover:underline"
    >
      Source
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

/**
 * A corridor the engine cannot build a checklist for. The wording and the
 * recovery it offers depend on which of the three answers is the blocker,
 * and that decision lives in `corridorGap` so it can be asserted directly
 * — it is the copy that was wrong, so it is the copy under test.
 */
function CorridorGap({
  nationality,
  destination,
  purpose,
  entry,
}: {
  nationality: string;
  destination: string;
  purpose: string;
  /**
   * What a live provider knows about this corridor, when it knows
   * anything we are willing to repeat. Null is the common case and
   * renders exactly as this screen always did.
   */
  entry: EntryCheck | null;
}) {
  const gap = corridorGap({ nationality, destination, purpose, entry });
  // A corridor that needs no visa is finished, not pending. Everything
  // this screen says about waiting — the warning mark, the checklist we
  // have not built, the suggestion to check back — is false there.
  const answered = gap.kind === "answer";

  return (
    <main>
      <Shell className="max-w-[720px] py-16">
        <span
          className={
            answered
              ? "grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--success)_16%,var(--mix))] text-success-ink"
              : "grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--warning)_16%,var(--mix))] text-warning-ink"
          }
        >
          {answered ? <Check className="size-5" /> : <Flag className="size-5" />}
        </span>
        <h1 className="t-h2 mt-5 max-w-[26ch]">{gap.heading}</h1>
        <p className="t-body-lg mt-4 max-w-[62ch] text-ink-2">{gap.lead}</p>

        {/*
          The one question we can answer for a corridor nobody has
          curated: does this passport need a visa at all? Sourced, live,
          and carefully not a checklist — see `entryCheck` for which
          vendor verdicts are repeatable and why "Not admitted" is not
          among them.

          It sits below the gap copy rather than above it because it does
          not change the outcome: there is still no application to file
          here. It is the consolation, not the headline.
        */}
        {entry && (
          <div className="mt-8 rounded-sm border border-border-strong p-5">
            <p className="t-body-lg max-w-[62ch]">{entry.headline}</p>
            <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
              {entry.allowedStay && (
                <div>
                  <dt className="special-caps">Allowed stay</dt>
                  <dd className="num text-base">{entry.allowedStay}</dd>
                </div>
              )}
              {entry.passportValidity && (
                <div>
                  <dt className="special-caps">Passport validity</dt>
                  <dd className="text-base">{entry.passportValidity}</dd>
                </div>
              )}
            </dl>
            {/* The vendor is named from the answer, not from this file.
                It used to say "Travel Buddy" whoever had answered, which
                became a false citation the moment a second provider
                could — and it silently was one. */}
            <p className="t-muted mt-4 max-w-[62ch]">
              Entry rules from{" "}
              {entry.embassyUrl ? (
                <a
                  href={entry.embassyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-text hover:underline"
                >
                  {entry.sourceName}
                </a>
              ) : (
                <span className="font-semibold">{entry.sourceName}</span>
              )}
              .
              {!answered && (
                <>
                  {" "}
                  We cannot build your document checklist for {destination} yet
                  — that needs guidance we have checked against the mission.
                </>
              )}
            </p>
            {/* A credit the provider's licence obliges us to display. */}
            {entry.attribution && (
              <p className="t-muted mt-2 max-w-[62ch]">{entry.attribution}</p>
            )}
          </div>
        )}
        {/* This used to promise an email. Nothing in the repo can send
            one — no mailer, no list to mail — so it now offers only what
            the demand event actually delivers. */}
        {!answered && (
          <p className="t-muted mt-4 max-w-[62ch]">
            Nothing has been charged. We cannot alert you when it opens yet, so
            it is worth checking back.
          </p>
        )}
        <Button asChild variant="tertiary" className="mt-8">
          <Link href="/app/agent">
            {gap.action} <ArrowRight />
          </Link>
        </Button>
      </Shell>
    </main>
  );
}

export default async function RequirementsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const application = await getOrCreateApplication();
  if (!application) redirect("/sign-in?next=/app/requirements");
  if (!application.intakeComplete) redirect("/app/agent");

  const [initialDocs, answers] = await Promise.all([
    getDocuments(application.id),
    getIntakeAnswers(application.id),
  ]);
  let docs = initialDocs;

  // Resolved from the answers rather than read from the corridors table,
  // so a provider with no row of ours behind it serves this screen the
  // same way the curated data does.
  const nationality = NATIONALITY_ISO[answers.nationality];
  const destination = DESTINATION_ISO[answers.destination];
  const purpose = PURPOSE_ISO[answers.purpose];

  // All three or nothing. Nationality used to fall back to `ng`, which
  // served a traveller holding some other passport the Nigerian rule set
  // — a confident wrong answer under a heading promising the mission's
  // own words. The gap screen below is the honest outcome.
  const ruleSet =
    nationality && destination && purpose
      ? await resolveRuleSet({
          nationalityIso: nationality,
          destinationIso: destination,
          purpose,
        })
      : null;

  // A corridor we do not serve yet. Say so plainly rather than showing
  // a half-built checklist and letting someone act on it.
  if (!ruleSet) {
    // Free: `resolveRuleSet` already asked Travel Buddy about this
    // corridor and discarded the answer, and the provider caches it —
    // seven days for an answer, an hour for a failure. That second half
    // is what makes this line true rather than merely hopeful: failures
    // used to be cached for no time at all, so the "free" call here was
    // a second live request every time the vendor was unwell. Skipped
    // entirely when the answers did not map to ISO codes, because there
    // is no corridor to ask about.
    const entry =
      nationality && destination && purpose
        ? await resolveEntryCheck({
            nationalityIso: nationality,
            destinationIso: destination,
            purpose,
          })
        : null;

    return (
      <CorridorGap
        nationality={answers.nationality}
        destination={answers.destination}
        purpose={answers.purpose}
        entry={entry}
      />
    );
  }

  // Intake complete, rule set resolvable, but the application is not
  // wired to it: either the checklist is empty (the corridor data arrived
  // after this intake finished — an unseeded environment, or a corridor
  // that opened later), or the corridor link is gone (a re-seed replaces
  // corridors wholesale and `on delete set null` detaches applications,
  // leaving a checklist with no card and no descriptions). The one-shot
  // build in the intake action already missed its moment, so materialise
  // here — provisioning on first sight, the same stance `getProfile`
  // takes. `adoptRuleSet` is idempotent, so re-running it over a
  // surviving checklist adds nothing and keeps uploads.
  if (docs.length === 0 || !application.corridorId) {
    await adoptRuleSet(application.id, ruleSet, answers);
    docs = await getDocuments(application.id);
  }

  /**
   * The checklist, decided against this traveller's own answers.
   *
   * Three outcomes per requirement, and the middle one is the point of
   * the exercise: a conditional document whose rule this traveller
   * matches is simply theirs, and joins the list they must provide
   * rather than a list of maybes. One whose rule they do not match is
   * not shown at all. One with no rule written yet keeps the hedge —
   * which is how the "only if it applies" panel empties, corridor by
   * corridor, as approvers write the rules rather than all at once by
   * deleting the panel.
   */
  const decided = ruleSet.requirements.map((r) => ({
    requirement: r,
    verdict: r.isRequired
      ? ({ applies: true, certain: true } as const)
      : appliesToTraveller(r.appliesWhen, answers),
  }));

  const required = decided
    .filter((d) => d.verdict.applies && d.verdict.certain)
    .map((d) => d.requirement);

  const conditional = decided
    .filter((d) => d.verdict.applies && !d.verdict.certain)
    .map((d) => d.requirement);

  const effective = new Date(ruleSet.effectiveFrom).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /**
   * What the fee costs where this traveller lives.
   *
   * Residence, not language and not nationality: the mission charges in
   * its own currency, and the question a traveller is actually asking is
   * "what does that take out of my account". A Nigerian passport holder
   * living in Accra is quoted cedis.
   *
   * Nationality is the fallback only for intakes that predate the
   * residence question — those records carry no residence at all, and
   * for them the passport is the best available guess. Everything below
   * degrades to nothing when a rate is missing or stale, which is the
   * state on any environment where the rates cron has never run.
   */
  const localCurrency =
    currencyForCountryName(answers.residence_country) ??
    currencyForCountryName(answers.nationality);

  const pair = await getPairRate(ruleSet.governmentFeeCurrency, localCurrency);
  const approximateFee = convertFee({
    minor: ruleSet.governmentFeeMinor,
    from: ruleSet.governmentFeeCurrency,
    to: localCurrency,
    rate: pair?.rate ?? null,
    fetchedAt: pair?.fetchedAt ?? null,
  });

  return (
    <main>
      <Shell className="py-8 md:py-10">
        {/* The corridor is named on the laminate above this screen, so
            the heading is what the rule set *is* rather than a second
            printing of the same three facts. */}
        <h1 className="t-h2 max-w-[26ch]">{ruleSet.visaName}</h1>
        <p className="t-body-lg mt-3 max-w-[62ch] text-ink-2">
          The rule set that built your checklist, as the mission publishes
          it. Nothing here is our interpretation.
        </p>

        {/* Three facts on one sheet. The dividers keep the fee — the one
            figure that may be missing — from looking more settled than
            the count that never is. The provenance row is the sheet's
            footer: every figure above it is traceable to that line. */}
        <Panel className="mt-8">
          <dl className="grid sm:grid-cols-3">
            {[
              {
                label: "Documents required",
                value: String(required.length),
                sub: conditional.length
                  ? `${conditional.length} more only if they apply to you`
                  : "every one of them applies to you",
                approx: null,
              },
              {
                label: "Typical decision time",
                value:
                  ruleSet.processingWeeksMin && ruleSet.processingWeeksMax
                    ? `${ruleSet.processingWeeksMin}–${ruleSet.processingWeeksMax} weeks`
                    : null,
                sub: "from the date the mission receives your file",
                approx: null,
              },
              {
                label: "Government fee",
                value: formatFee(
                  ruleSet.governmentFeeMinor,
                  ruleSet.governmentFeeCurrency
                ),
                sub: "paid to the mission, not to Toplance",
                /**
                 * The same fee in the traveller's own money, marked as
                 * the estimate it is. The mission charges the figure
                 * above; this one carries the date of the rate behind
                 * it because a conversion with no date is a promise
                 * about a number that moves every day — and the whole
                 * sheet is built on saying where a figure came from.
                 */
                approx: approximateFee
                  ? `${formatApproximate(approximateFee, "en-NG")} at ${approximateFee.fetchedAt.toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "long" }
                    )} rates`
                  : null,
              },
              // The entry rules the brief's item 6 names. Curated
              // corridors carry none of them, so in practice these are
              // whatever a contributor filled — and the provenance rows
              // in the footer say which one. Rendered only when a rule
              // set actually has them: a dashed rule under "Allowed
              // stay" is honest for a figure the mission publishes and
              // we lack, but this is a strip that simply does not apply
              // to every corridor.
              ...(ruleSet.allowedStay
                ? [
                    {
                      label: "Allowed stay",
                      value: ruleSet.allowedStay,
                      sub: "on this visa, per entry",
                      approx: null,
                    },
                  ]
                : []),
              ...(ruleSet.passportValidity
                ? [
                    {
                      label: "Passport validity",
                      value: ruleSet.passportValidity,
                      sub: "a common reason a file is refused",
                      approx: null,
                    },
                  ]
                : []),
            ].map((stat) => (
              <div
                key={stat.label}
                className="border-b border-border px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-e sm:px-6 sm:last:border-e-0"
              >
                <dt className="special-caps">{stat.label}</dt>
                <dd className="t-h3 num mt-3">
                  <Figure value={stat.value} label={stat.label} />
                </dd>
                <dd className="t-muted mt-1.5">{stat.sub}</dd>
                {/* Only the fee has one, and only when a fresh rate
                    covers the pair. Absent rather than dashed: an
                    approximation nobody can compute is not a figure the
                    mission owes us, it is simply one we do not have. */}
                {stat.approx && (
                  <dd className="num mt-1.5 text-[13px] font-semibold text-ink-2">
                    {stat.approx}
                  </dd>
                )}
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-surface-2/60 px-5 py-3.5 sm:px-6">
            {/* Official places to go, when a corridor has them. Not
                every route has an eVisa portal or an arrival form, so
                these are links or nothing — never a disabled control
                implying a step that does not exist. */}
            {ruleSet.evisaUrl && (
              <a
                href={ruleSet.evisaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[var(--row-h)] items-center gap-2 text-base font-semibold text-brand-text hover:underline"
              >
                Official eVisa portal
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            {ruleSet.registrationName && ruleSet.registrationUrl && (
              <a
                href={ruleSet.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[var(--row-h)] items-center gap-2 text-base font-semibold text-brand-text hover:underline"
              >
                {ruleSet.registrationName} registration
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            {ruleSet.embassyUrl && (
              <a
                href={ruleSet.embassyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[var(--row-h)] items-center gap-2 text-base font-semibold text-brand-text hover:underline"
              >
                Embassy contact
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            {/* The mission's own date, and nothing about our internal
                confidence in it. Whether anybody here has checked this
                rule set against the mission lately is a real question,
                but it is ours to answer and staff's to act on — it now
                sits on the corridor's page in the ops console, where
                somebody can actually go and verify it. Asking the
                traveller to weigh our own sourcing is asking them to do
                the job they came here to have done. */}
            <span className="t-muted">In effect since {effective}</span>
            {ruleSet.sourceUrl && (
              <a
                href={ruleSet.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-auto inline-flex min-h-[var(--row-h)] items-center gap-2 text-base font-semibold text-brand-text hover:underline"
              >
                {ruleSet.sourceName ?? "Source"}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
            {/*
              A licence credit the provider obliges us to display, not
              decoration — `basis-full` keeps it on its own line rather
              than competing with the source link for the same row.
            */}
            {ruleSet.attribution && (
              <p className="t-muted basis-full">{ruleSet.attribution}</p>
            )}

            {/*
              Where a figure came from, when it did not come from the
              source named above. The heading over this sheet promises
              "Nothing here is our interpretation", and a single source
              line under a composed rule set would make that false — so
              each provider that filled a blank says which blank it
              filled. Empty for every single-provider rule set, which is
              all of them until a corridor has a gap.
            */}
            {ruleSet.contributions.map((c) => (
              <p key={c.provider} className="t-muted basis-full">
                {c.fields.join(" and ")}{" "}
                {c.fields.length > 1 ? "come" : "comes"} from{" "}
                {c.sourceUrl ? (
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-text hover:underline"
                  >
                    {c.sourceName ?? c.provider}
                  </a>
                ) : (
                  <span className="font-semibold">
                    {c.sourceName ?? c.provider}
                  </span>
                )}
                .{c.attribution ? ` ${c.attribution}` : ""}
              </p>
            ))}
          </div>
        </Panel>

        <Panel className="mt-6">
          <PanelHeader
            label="What you must provide"
            aside={
              <Badge variant="brand">
                <span className="num">{required.length}</span> documents
              </Badge>
            }
          />
          <ol>
            {required.map((r, i) => (
              <li
                key={r.docKey}
                className="flex gap-5 border-b border-border px-5 py-5 last:border-0 sm:px-6"
              >
                <span className="num shrink-0 pt-0.5 text-[13px] font-semibold text-ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="t-title">{r.name}</p>
                  {r.description && (
                    <p className="t-muted mt-1.5 max-w-[74ch]">
                      {r.description}
                    </p>
                  )}
                  <RequirementSource url={r.sourceUrl} />
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        {conditional.length > 0 && (
          <Panel className="mt-6">
            <PanelHeader
              label="Only if it applies"
              aside={
                <Badge variant="outline">
                  <span className="num">{conditional.length}</span> conditional
                </Badge>
              }
            />
            <ul>
              {conditional.map((r) => (
                <li
                  key={r.docKey}
                  className="border-b border-dashed border-border-strong px-5 py-5 last:border-0 sm:px-6"
                >
                  <p className="t-title">{r.name}</p>
                  {r.description && (
                    <p className="t-muted mt-1.5 max-w-[74ch]">
                      {r.description}
                    </p>
                  )}
                  <RequirementSource url={r.sourceUrl} />
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="mt-8">
          <Button asChild>
            <Link href="/app/documents">
              Start uploading ({docs.length} on your checklist) <ArrowRight />
            </Link>
          </Button>
        </div>
      </Shell>
    </main>
  );
}
