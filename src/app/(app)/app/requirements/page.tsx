import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Shell } from "@/components/shared/shell";
import { RailSection } from "@/components/shared/rail";
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

  // Intake complete, rule set resolvable, checklist empty: the corridor
  // data arrived after this intake finished (an unseeded environment, or
  // a corridor that opened later). The one-shot build in the intake
  // action already missed its moment, so materialise here — provisioning
  // on first sight, the same stance `getProfile` takes.
  if (docs.length === 0) {
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
      <Shell className="py-10 md:py-12">
        {/* The corridor is named on the card above this screen, so the
            heading is what the rule set *is* rather than a second
            printing of the same three facts. */}
        <h1 className="t-h2 max-w-[26ch]">{ruleSet.visaName}</h1>
        <p className="t-body-lg mt-4 max-w-[62ch] text-ink-2">
          The rule set that built your checklist, as the mission publishes
          it. Nothing here is our interpretation.
        </p>

        {/* Three facts, ruled apart. They were three bordered boxes, which
            made the fee — the one figure that may be missing — look as
            settled as the count that never is. */}
        <dl className="mt-10 grid gap-x-16 border-t border-border-strong sm:grid-cols-3">
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
              className="border-b border-border py-5 sm:border-b-0"
            >
              <dt className="special-caps">{stat.label}</dt>
              <dd className="t-h3 mt-3">
                <Figure value={stat.value} label={stat.label} />
              </dd>
              <dd className="t-muted mt-1.5">{stat.sub}</dd>
            </div>
          ))}
        </dl>

        {/* Every figure above is traceable to the line below it. A
            checklist nobody can trace is a checklist nobody trusts. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border py-4">
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
        </div>

        {/* A rule set is exactly the long scrolling document §6 keeps the
            rail for: you lose track of which of the two lists you are in
            somewhere around the sixth requirement. */}
        <RailSection
          label="What you must provide"
          datum={`${required.length} documents`}
        >
          <ol>
            {required.map((r, i) => (
              <li
                key={r.docKey}
                className="flex gap-5 border-b border-border py-5 first:pt-0 last:border-0"
              >
                <span className="special shrink-0 pt-0.5">
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
        </RailSection>

        {optional.length > 0 && (
          <RailSection
            label="Only if it applies"
            datum={`${optional.length} conditional`}
          >
            <ol>
              {optional.map((r) => (
                <li
                  key={r.docKey}
                  className="border-b border-dashed border-border-strong py-5 first:pt-0 last:border-0"
                >
                  <p className="t-title">{r.name}</p>
                  {r.description && (
                    <p className="t-muted mt-1.5 max-w-[74ch]">
                      {r.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </RailSection>
        )}

        <div className="border-t border-border pt-10">
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
