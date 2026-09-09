import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AgencyShell } from "@/components/agency/agency-shell";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { agencyRuleSet } from "@/lib/data/agency-rule-sets";
import { describeAppliesWhen, parseAppliesWhen } from "@/lib/domain/applies-when";
import { countryName } from "@/lib/domain/corridor-table";
import { freshnessOf } from "@/lib/domain/freshness";
import { isUuid } from "@/lib/domain/uuid";
import { getLocale } from "@/lib/i18n/server";
import { AGENCY_RULE_SETS } from "@/lib/i18n/agency-rule-sets";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDOR_REVIEW } from "@/lib/i18n/ops-corridor-review";
import { requireAgencyConsole } from "@/app/[locale]/agency/console";

/**
 * One rule set, read-only, for the agency whose cases were built from it.
 *
 * There is no decision panel and no condition editor — the two things
 * `/ops/corridors/[id]` exists to offer. What is left is the part a
 * handler actually needs on a phone call: what the mission asks for, in
 * the order the checklist builds it, with the rule that decides who
 * each conditional document is for said in a sentence rather than left
 * as a badge.
 *
 * A corridor this agency has no case on is `notFound`, not "forbidden".
 * See `agencyRuleSet` — telling the two apart would confirm that a
 * corridor exists and that some other agency is filing on it.
 */

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY_RULE_SETS.heading[locale] };
}

/** A source link, or an explicit absence — never a silent blank. */
function Source({
  url,
  label,
  locale,
}: {
  url: string | null;
  label?: string;
  locale: Locale;
}) {
  if (!url) {
    return (
      <span className="text-sm font-semibold text-ink-3">
        {OPS_COMMON.noSourceRecorded[locale]}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text hover:underline"
    >
      {label ?? OPS_COMMON.source[locale]}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

export default async function AgencyRuleSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId } = await requireAgencyConsole();

  const { id } = await params;
  // Checked before the query rather than after: a malformed uuid is a
  // driver error, not a missing row, and it should read as the latter.
  if (!isUuid(id) || !orgId) notFound();

  const ruleSet = await agencyRuleSet(orgId, id);
  if (!ruleSet) notFound();

  const freshness = freshnessOf(
    ruleSet.lastVerifiedAt?.toISOString() ?? null,
    ruleSet.purpose
  );

  const route = `${countryName(ruleSet.nationalityIso)} → ${countryName(
    ruleSet.destinationIso
  )}`;

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="rule-sets"
    >
      <Link
        href="/agency/rule-sets"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-text hover:underline"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {AGENCY_RULE_SETS.backLink[locale]}
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="t-h2 text-balance">{route}</h1>
        <Badge variant="outline">
          {OPS_COMMON.purpose[ruleSet.purpose][locale]}
        </Badge>
        <Badge variant="outline">
          <span className="num">v{ruleSet.version}</span>
        </Badge>
        {ruleSet.isLive && <Badge variant="brand">{OPS_COMMON.live[locale]}</Badge>}
      </div>
      <p className="t-muted mt-2">{ruleSet.visaName}</p>

      {/* A version that is no longer live still built somebody's
          checklist, and a handler comparing this page against the
          mission's own site has to know which of the two they are
          reading. Only shown when it is true — a live version needs no
          sentence explaining that it is current. */}
      {!ruleSet.isLive && (
        <p
          role="note"
          className="mt-5 max-w-[74ch] rounded-sm border border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--warning)_7%,transparent)] px-5 py-4 text-base text-ink-2"
        >
          {AGENCY_RULE_SETS.supersededNotice[locale]}
        </p>
      )}

      <p className="t-muted mt-5 max-w-[74ch]">
        {AGENCY_RULE_SETS.readOnlyNotice[locale]}
      </p>

      {/* The facts a handler is asked for on the phone, with the page
          they were read from beside them. */}
      <Panel className="mt-8">
        <PanelHeader
          label={OPS_CORRIDOR_REVIEW.routeFactsPanel[locale]}
          aside={<Source url={ruleSet.sourceUrl} locale={locale} />}
        />
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: OPS_CORRIDOR_REVIEW.fields.governmentFee[locale],
              value:
                ruleSet.governmentFeeMinor == null
                  ? "—"
                  : `${ruleSet.governmentFeeCurrency ?? ""} ${(
                      ruleSet.governmentFeeMinor / 100
                    ).toLocaleString("en-GB")}`,
            },
            {
              label: OPS_CORRIDOR_REVIEW.fields.decisionTime[locale],
              value:
                ruleSet.processingWeeksMin && ruleSet.processingWeeksMax
                  ? `${ruleSet.processingWeeksMin}–${ruleSet.processingWeeksMax} ${OPS_CORRIDOR_REVIEW.weeksSuffix[locale]}`
                  : "—",
            },
            {
              label: OPS_CORRIDOR_REVIEW.fields.lastChecked[locale],
              value:
                freshness.state === "unverified"
                  ? OPS_CORRIDOR_REVIEW.notYet[locale]
                  : freshness.checked,
            },
            {
              label: AGENCY_RULE_SETS.casesOnThisVersion[locale],
              value: String(ruleSet.caseCount),
            },
          ].map((f) => (
            <div
              key={f.label}
              className="border-b border-border px-5 py-5 last:border-b-0 sm:px-6 lg:border-b-0 lg:border-e lg:last:border-e-0"
            >
              <dt className="special-caps">{f.label}</dt>
              <dd className="t-h3 num mt-3">{f.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel className="mt-6 mb-16">
        <PanelHeader
          label={OPS_CORRIDOR_REVIEW.everyRequirementPanel[locale]}
          aside={
            <span className="t-muted">
              {AGENCY_RULE_SETS.effectiveFrom[locale]}{" "}
              <span className="num">{ruleSet.effectiveFrom}</span>
            </span>
          }
        />
        {ruleSet.requirements.length === 0 ? (
          <PanelBody>
            <p className="t-muted max-w-[74ch]">
              {OPS_CORRIDOR_REVIEW.noRequirements[locale]}
            </p>
          </PanelBody>
        ) : (
          <ol>
            {ruleSet.requirements.map((r, i) => {
              const rule = describeAppliesWhen(parseAppliesWhen(r.appliesWhen));
              return (
                <li
                  key={r.docKey}
                  className="flex gap-5 border-b border-border px-5 py-5 last:border-0 sm:px-6"
                >
                  <span className="num shrink-0 pt-0.5 text-[13px] font-semibold text-ink-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="t-title">{r.name}</p>
                      {!r.isRequired && (
                        <Badge variant="outline">
                          {OPS_CORRIDOR_REVIEW.onlyIfApplies[locale]}
                        </Badge>
                      )}
                    </div>
                    {r.description && (
                      <p className="t-muted mt-1.5 max-w-[74ch]">{r.description}</p>
                    )}
                    {/* The rule as a sentence, not as an editor. This is
                        the answer to "why has my client been asked for
                        this and yours has not", which is the question
                        that sends a handler looking for this screen. A
                        conditional document with no rule recorded
                        applies to nobody yet, and saying "everybody"
                        there would be false — so only a required
                        document gets that line. */}
                    {!r.isRequired && rule && (
                      <p className="t-muted mt-2 max-w-[74ch]">
                        <span className="special-caps">
                          {AGENCY_RULE_SETS.appliesWhenPrefix[locale]}
                        </span>{" "}
                        {rule}
                      </p>
                    )}
                    {r.isRequired && (
                      <p className="t-muted mt-2">
                        {AGENCY_RULE_SETS.everyoneAsked[locale]}
                      </p>
                    )}
                    <p className="mt-2">
                      <Source
                        url={r.sourceUrl}
                        label={OPS_CORRIDOR_REVIEW.openTheSource[locale]}
                        locale={locale}
                      />
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </AgencyShell>
  );
}
