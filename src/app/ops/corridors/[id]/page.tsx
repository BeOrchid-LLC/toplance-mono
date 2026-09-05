import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { CorridorDecision } from "@/components/ops/corridor-decision";
import { RequirementCondition } from "@/components/ops/requirement-condition";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { localizedOpsNav } from "@/components/ops/ops-nav";
import { Shell } from "@/components/shared/shell";
import { hasDatabaseEnv } from "@/lib/db/client";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { corridorDiff, isUnchanged } from "@/lib/domain/corridor-diff";
import { parseAppliesWhen } from "@/lib/domain/applies-when";
import { freshnessOf } from "@/lib/domain/freshness";
import { getCorridor, liveVersionOf } from "@/lib/data/corridors";
import { isOwner } from "@/lib/auth/policy";
import { isUuid } from "@/lib/domain/uuid";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDOR_REVIEW } from "@/lib/i18n/ops-corridor-review";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_CORRIDOR_REVIEW.metaTitle[locale] };
}

/**
 * The country's name, or the raw code upper-cased when this file cannot
 * resolve it. Never blank and never invented — a drafted corridor for a
 * code we do not map should still be reviewable.
 */
const countryName = (iso: string) => countryFromIso2(iso)?.name ?? iso.toUpperCase();

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
      <span className="text-sm font-semibold text-danger-ink">
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

export default async function ReviewCorridorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const { id } = await params;
  // A malformed id would make Postgres throw on the uuid cast, which is
  // a raw database error where "no such corridor" is the honest answer.
  if (!isUuid(id)) notFound();

  const corridor = await getCorridor(id);
  if (!corridor) notFound();

  const [live, notifications, unreadCount] = await Promise.all([
    liveVersionOf(corridor),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  const diff = corridorDiff(corridor, live);
  const freshness = freshnessOf(
    corridor.lastVerifiedAt?.toISOString() ?? null,
    corridor.purpose
  );
  const decidable = corridor.reviewState === "pending";

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={localizedOpsNav(locale)}
        name={profile.fullName}
        email={profile.email}
        subtitle={`${OPS_COMMON.subtitlePrefix[locale]} · ${OPS_COMMON.staffRole[actor.staffRole ?? "reviewer"][locale]}`}
        notifications={
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/ops"
          />
        }
      />

      <Shell className="py-10">
        <Link
          href="/ops/corridors"
          className="t-muted inline-flex items-center gap-2 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> {OPS_CORRIDOR_REVIEW.backLink[locale]}
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <div>
            <h1 className="t-h2">
              {countryName(corridor.nationalityIso)} →{" "}
              {countryName(corridor.destinationIso)}
            </h1>
            <p className="t-muted mt-2">
              {corridor.visaName} · {OPS_COMMON.purpose[corridor.purpose][locale]}{" "}
              · <span className="num">v{corridor.version}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {corridor.isLive && <Badge variant="brand">{OPS_COMMON.live[locale]}</Badge>}
            {corridor.reviewState === "pending" && (
              <Badge variant="warning">{OPS_COMMON.awaitingReview[locale]}</Badge>
            )}
            {corridor.reviewState === "rejected" && (
              <Badge variant="neutral">{OPS_COMMON.sentBack[locale]}</Badge>
            )}
            {corridor.reviewState === "approved" && (
              <Badge variant="success">
                {OPS_COMMON.approved[locale]}
                {corridor.approverName
                  ? ` ${OPS_CORRIDOR_REVIEW.approvedByPrefix[locale]} ${corridor.approverName}`
                  : ""}
              </Badge>
            )}
          </div>
        </div>

        {corridor.reviewState === "rejected" && corridor.rejectReason && (
          <p className="t-muted mt-5 max-w-[74ch] rounded-sm border border-border-strong px-5 py-4">
            <span className="special-caps block">{OPS_CORRIDOR_REVIEW.sentBackBecause[locale]}</span>
            <span className="mt-1 block text-base text-ink-2">
              {corridor.rejectReason}
            </span>
          </p>
        )}

        {/* How much anybody here still knows about this corridor, said
            to the person who can do something about it. The traveller's
            requirements screen used to carry this sentence, which put
            the doubt in front of the one reader who cannot resolve it —
            they have no source to check and no way to record a check.
            Absent entirely for a corridor verified inside its window. */}
        {freshness.notice && (
          <p
            role="note"
            className="mt-5 max-w-[74ch] rounded-sm border border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--warning)_7%,transparent)] px-5 py-4 text-base text-ink-2"
          >
            {freshness.notice}
          </p>
        )}

        {/* The corridor's own facts, and where each was read. Fee and
            decision time sit next to the source that stated them because
            an approver's job is to open that link and compare. */}
        <Panel className="mt-8">
          <PanelHeader
            label={OPS_CORRIDOR_REVIEW.routeFactsPanel[locale]}
            aside={<Source url={corridor.sourceUrl} locale={locale} />}
          />
          <dl className="grid sm:grid-cols-3">
            {[
              {
                label: OPS_CORRIDOR_REVIEW.fields.governmentFee[locale],
                value:
                  corridor.governmentFeeMinor == null
                    ? "—"
                    : `${corridor.governmentFeeCurrency ?? ""} ${(
                        corridor.governmentFeeMinor / 100
                      ).toLocaleString("en-GB")}`,
              },
              {
                label: OPS_CORRIDOR_REVIEW.fields.decisionTime[locale],
                value:
                  corridor.processingWeeksMin && corridor.processingWeeksMax
                    ? `${corridor.processingWeeksMin}–${corridor.processingWeeksMax} ${OPS_CORRIDOR_REVIEW.weeksSuffix[locale]}`
                    : "—",
              },
              {
                label: OPS_CORRIDOR_REVIEW.fields.lastChecked[locale],
                value:
                  freshness.state === "unverified"
                    ? OPS_CORRIDOR_REVIEW.notYet[locale]
                    : freshness.checked,
              },
            ].map((f) => (
              <div
                key={f.label}
                className="border-b border-border px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-e sm:px-6 sm:last:border-e-0"
              >
                <dt className="special-caps">{f.label}</dt>
                <dd className="t-h3 num mt-3">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* What moved since the version travellers are being served.
            A first version has no prior to compare against, so the full
            list below is the review. */}
        {!diff.isFirstVersion && (
          <Panel className="mt-6">
            <PanelHeader
              label={OPS_CORRIDOR_REVIEW.changesSincePrefix[locale].replace(
                "{version}",
                String(live?.version)
              )}
              aside={
                <Badge variant={isUnchanged(diff) ? "neutral" : "warning"}>
                  <span className="num">
                    {diff.fields.length + diff.requirements.length}
                  </span>{" "}
                  {OPS_CORRIDOR_REVIEW.changesWord[locale]}
                </Badge>
              }
            />
            {isUnchanged(diff) ? (
              <PanelBody>
                <p className="t-muted max-w-[74ch]">{OPS_CORRIDOR_REVIEW.noDiff[locale]}</p>
              </PanelBody>
            ) : (
              <div>
                {/* `f.label` here is generated by `corridorDiff()`
                    (`@/lib/domain/corridor-diff.ts`), outside this pass's
                    ownership, and stays in English — see the review's
                    flags. */}
                {diff.fields.map((f) => (
                  <div
                    key={f.label}
                    className="border-b border-border px-5 py-4 last:border-0 sm:px-6"
                  >
                    <p className="special-caps">{f.label}</p>
                    <p className="mt-1.5 text-base">
                      <span className="text-ink-3 line-through">
                        {f.before ?? OPS_CORRIDOR_REVIEW.notSet[locale]}
                      </span>
                      <span aria-hidden> → </span>
                      <span className="font-semibold">
                        {f.after ?? OPS_CORRIDOR_REVIEW.notSet[locale]}
                      </span>
                    </p>
                  </div>
                ))}
                {diff.requirements.map((r) => (
                  <div
                    key={`${r.kind}-${r.docKey}`}
                    className="border-b border-border px-5 py-4 last:border-0 sm:px-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          r.kind === "added"
                            ? "success"
                            : r.kind === "removed"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {r.kind === "added"
                          ? OPS_CORRIDOR_REVIEW.newDocument[locale]
                          : r.kind === "removed"
                            ? OPS_CORRIDOR_REVIEW.noLongerAskedFor[locale]
                            : OPS_CORRIDOR_REVIEW.reworded[locale]}
                      </Badge>
                      <p className="t-title">{r.name}</p>
                    </div>
                    {r.kind === "changed" &&
                      r.fields.map((f) => (
                        <p key={f.label} className="t-muted mt-2 max-w-[74ch]">
                          <span className="special-caps">{f.label}: </span>
                          <span className="line-through">
                            {f.before ?? OPS_CORRIDOR_REVIEW.notSet[locale]}
                          </span>
                          <span aria-hidden> → </span>
                          <span className="text-ink-2">
                            {f.after ?? OPS_CORRIDOR_REVIEW.notSet[locale]}
                          </span>
                        </p>
                      ))}
                    {r.kind === "removed" && (
                      <p className="t-muted mt-2 max-w-[74ch]">
                        {OPS_CORRIDOR_REVIEW.removedNotice[locale]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        <Panel className="mt-6">
          <PanelHeader
            label={OPS_CORRIDOR_REVIEW.everyRequirementPanel[locale]}
            aside={
              <Badge variant={corridor.requirementCount ? "brand" : "warning"}>
                <span className="num">{corridor.requirementCount}</span>{" "}
                {OPS_COMMON.documentsWord[locale]}
              </Badge>
            }
          />
          {corridor.requirements.length === 0 ? (
            <PanelBody>
              <p className="t-muted max-w-[74ch]">
                {OPS_CORRIDOR_REVIEW.noRequirements[locale]}
              </p>
            </PanelBody>
          ) : (
            <ol>
              {corridor.requirements.map((r, i) => (
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
                    {/* Only a conditional document takes a rule. A
                        required one applies to everybody, and a control
                        offering to narrow it would suggest otherwise. */}
                    {!r.isRequired && (
                      <RequirementCondition
                        requirementId={r.id}
                        rule={parseAppliesWhen(r.appliesWhen)}
                        editable={decidable && isOwner(actor)}
                      />
                    )}
                    {/* The approver's actual job: open this and compare.
                        A requirement with no source is called out in red
                        rather than left looking merely unlinked. */}
                    <p className="mt-2">
                      <Source
                        url={r.sourceUrl}
                        label={OPS_CORRIDOR_REVIEW.openTheSource[locale]}
                        locale={locale}
                      />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {decidable && (
          <Panel className="mt-6 mb-16">
            <PanelHeader label={OPS_CORRIDOR_REVIEW.yourDecisionPanel[locale]} />
            <PanelBody>
              <CorridorDecision corridorId={corridor.id} canApprove={isOwner(actor)} />
            </PanelBody>
          </Panel>
        )}

        {!decidable && <div className="mb-16" />}
      </Shell>
    </div>
  );
}
