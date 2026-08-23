import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hasDatabaseEnv } from "@/lib/db/client";
import {
  getDocuments,
  getIntakeAnswers,
  getOrCreateApplication,
} from "@/lib/data/applications";
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

function formatFee(minor: number | null, currency: string | null) {
  if (minor == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency ?? "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export default async function RequirementsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const application = await getOrCreateApplication();
  if (!application) redirect("/sign-in?next=/app/requirements");
  if (!application.intakeComplete) redirect("/app/agent");

  const [docs, answers] = await Promise.all([
    getDocuments(application.id),
    getIntakeAnswers(application.id),
  ]);

  // Resolved from the answers rather than read from the corridors table,
  // so a provider with no row of ours behind it serves this screen the
  // same way the curated data does.
  const destination = DESTINATION_ISO[answers.destination];
  const purpose = PURPOSE_ISO[answers.purpose];

  const ruleSet =
    destination && purpose
      ? await resolveRuleSet({
          nationalityIso: NATIONALITY_ISO[answers.nationality] ?? "ng",
          destinationIso: destination,
          purpose,
        })
      : null;

  // A corridor we do not serve yet. Say so plainly rather than showing
  // a half-built checklist and letting someone act on it.
  if (!ruleSet) {
    return (
      <main className="mx-auto max-w-[720px] px-4 py-12 sm:px-6">
        <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--warning)_16%,var(--mix))] text-warning-ink">
          <Flag className="size-5" />
        </span>
        <h1 className="t-h2 mt-4">
          We do not cover {answers.destination ?? "that corridor"} yet
        </h1>
        <p className="t-body-lg mt-3 text-ink-2">
          Your answers are saved. {answers.destination ?? "This destination"} for{" "}
          {(answers.purpose ?? "this purpose").toLowerCase()} is in the build queue,
          and your request has been counted towards it — corridors are prioritised by
          real demand, not guesswork.
        </p>
        <p className="t-muted mt-4">
          We will email you the moment it is live. Nothing has been charged.
        </p>
        <Button asChild variant="tertiary" className="mt-6">
          <Link href="/app/agent">
            Change my destination <ArrowRight />
          </Link>
        </Button>
      </main>
    );
  }

  const required = ruleSet.requirements.filter((r) => r.isRequired);
  const optional = ruleSet.requirements.filter((r) => !r.isRequired);

  return (
    <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
      <p className="kicker mb-3">Your corridor</p>
      <h1 className="t-h2">{ruleSet.visaName}</h1>
      <p className="t-body-lg mt-3 text-ink-2 measure">
        {answers.nationality ?? "Nigeria"} → {answers.destination}, for{" "}
        {(answers.purpose ?? "").toLowerCase()}. This is the rule set that built your
        checklist.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
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
                : "—",
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
          <div key={stat.label} className="rounded-md border border-border bg-surface p-5">
            <p className="special-caps">{stat.label}</p>
            <p className="t-h2 mt-2">{stat.value}</p>
            <p className="t-muted mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Every figure is traceable. A checklist nobody can trace is a
          checklist nobody trusts. */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3">
        <Badge variant="brand">Rule set v{ruleSet.version}</Badge>
        <span className="t-muted text-[16px]">
          In effect since{" "}
          {new Date(ruleSet.effectiveFrom).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        {ruleSet.sourceUrl && (
          <a
            href={ruleSet.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex min-h-[var(--row-h)] items-center gap-2 text-base font-semibold text-brand-text hover:underline"
          >
            {ruleSet.sourceName ?? "Source"} <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      <section className="mt-8">
        <h2 className="t-h3">What you must provide</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {required.map((r, i) => (
            <li
              key={r.docKey}
              className="flex gap-4 rounded-md border border-border bg-surface p-5"
            >
              <span className="special mt-1 w-6 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="t-title">{r.name}</p>
                {r.description && <p className="t-muted mt-1">{r.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {optional.length > 0 && (
        <section className="mt-8">
          <h2 className="t-h3">Only if it applies to you</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {optional.map((r) => (
              <li
                key={r.docKey}
                className="rounded-md border border-dashed border-border-strong bg-surface p-5"
              >
                <p className="t-title">{r.name}</p>
                {r.description && <p className="t-muted mt-1">{r.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Button asChild className="mt-8">
        <Link href="/app/documents">
          Start uploading ({docs.length} on your checklist) <ArrowRight />
        </Link>
      </Button>
    </main>
  );
}
