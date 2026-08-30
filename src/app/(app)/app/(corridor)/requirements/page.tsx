import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, Flag } from "lucide-react";

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
import { corridorGap } from "@/lib/domain/corridor-gap";
import {
  DESTINATION_ISO,
  NATIONALITY_ISO,
  PURPOSE_ISO,
} from "@/lib/domain/corridors";
import { resolveRuleSet } from "@/lib/visa";
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
 * A corridor the engine cannot build a checklist for. The wording and the
 * recovery it offers depend on which of the three answers is the blocker,
 * and that decision lives in `corridorGap` so it can be asserted directly
 * — it is the copy that was wrong, so it is the copy under test.
 */
function CorridorGap({
  nationality,
  destination,
  purpose,
}: {
  nationality: string;
  destination: string;
  purpose: string;
}) {
  const gap = corridorGap({ nationality, destination, purpose });

  return (
    <main>
      <Shell className="max-w-[720px] py-16">
        <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--warning)_16%,var(--mix))] text-warning-ink">
          <Flag className="size-5" />
        </span>
        <h1 className="t-h2 mt-5 max-w-[26ch]">{gap.heading}</h1>
        <p className="t-body-lg mt-4 max-w-[62ch] text-ink-2">{gap.lead}</p>
        {/* This used to promise an email. Nothing in the repo can send
            one — no mailer, no list to mail — so it now offers only what
            the demand event actually delivers. */}
        <p className="t-muted mt-4 max-w-[62ch]">
          Nothing has been charged. We cannot alert you when it opens yet, so
          it is worth checking back.
        </p>
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
    return (
      <CorridorGap
        nationality={answers.nationality}
        destination={answers.destination}
        purpose={answers.purpose}
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
    await adoptRuleSet(application.id, ruleSet);
    docs = await getDocuments(application.id);
  }

  const required = ruleSet.requirements.filter((r) => r.isRequired);
  const optional = ruleSet.requirements.filter((r) => !r.isRequired);

  const effective = new Date(ruleSet.effectiveFrom).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
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
                sub: `${optional.length} more only if they apply to you`,
              },
              {
                label: "Typical decision time",
                value:
                  ruleSet.processingWeeksMin && ruleSet.processingWeeksMax
                    ? `${ruleSet.processingWeeksMin}–${ruleSet.processingWeeksMax} weeks`
                    : null,
                sub: "from the date the mission receives your file",
              },
              {
                label: "Government fee",
                value: formatFee(
                  ruleSet.governmentFeeMinor,
                  ruleSet.governmentFeeCurrency
                ),
                sub: "paid to the mission, not to Toplance",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border-b border-border px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0"
              >
                <dt className="special-caps">{stat.label}</dt>
                <dd className="t-h3 num mt-3">
                  <Figure value={stat.value} label={stat.label} />
                </dd>
                <dd className="t-muted mt-1.5">{stat.sub}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-surface-2/60 px-5 py-3.5 sm:px-6">
            <span className="kicker">Rule set v{ruleSet.version}</span>
            <span aria-hidden className="h-3 w-px bg-border-strong" />
            <span className="t-muted">In effect since {effective}</span>
            {ruleSet.sourceUrl && (
              <a
                href={ruleSet.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex min-h-[var(--row-h)] items-center gap-2 text-base font-semibold text-brand-text hover:underline"
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
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        {optional.length > 0 && (
          <Panel className="mt-6">
            <PanelHeader
              label="Only if it applies"
              aside={
                <Badge variant="outline">
                  <span className="num">{optional.length}</span> conditional
                </Badge>
              }
            />
            <ul>
              {optional.map((r) => (
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
