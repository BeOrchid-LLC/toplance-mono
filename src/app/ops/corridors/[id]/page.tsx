import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { CorridorDecision } from "@/components/ops/corridor-decision";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { opsNav } from "@/components/ops/ops-nav";
import { Shell } from "@/components/shared/shell";
import { hasDatabaseEnv } from "@/lib/db/client";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { corridorDiff, isUnchanged } from "@/lib/domain/corridor-diff";
import { freshnessOf } from "@/lib/domain/freshness";
import { getCorridor, liveVersionOf } from "@/lib/data/corridors";
import { isOwner } from "@/lib/auth/policy";
import { isUuid } from "@/lib/domain/uuid";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Review corridor" };

/**
 * The country's name, or the raw code upper-cased when this file cannot
 * resolve it. Never blank and never invented — a drafted corridor for a
 * code we do not map should still be reviewable.
 */
const countryName = (iso: string) => countryFromIso2(iso)?.name ?? iso.toUpperCase();

/** A source link, or an explicit absence — never a silent blank. */
function Source({ url, label = "Source" }: { url: string | null; label?: string }) {
  if (!url) {
    return (
      <span className="text-sm font-semibold text-danger-ink">
        No source recorded
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
      {label}
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
        nav={opsNav}
        name={profile.fullName}
        email={profile.email}
        subtitle={`Toplance operations · ${actor.staffRole ?? "reviewer"}`}
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
          <ArrowLeft className="size-4" aria-hidden /> Corridor coverage
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <div>
            <h1 className="t-h2">
              {countryName(corridor.nationalityIso)} →{" "}
              {countryName(corridor.destinationIso)}
            </h1>
            <p className="t-muted mt-2">
              {corridor.visaName} · <span className="capitalize">{corridor.purpose}</span>{" "}
              · <span className="num">v{corridor.version}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {corridor.isLive && <Badge variant="brand">Live</Badge>}
            {corridor.reviewState === "pending" && (
              <Badge variant="warning">Awaiting review</Badge>
            )}
            {corridor.reviewState === "rejected" && (
              <Badge variant="neutral">Sent back</Badge>
            )}
            {corridor.reviewState === "approved" && (
              <Badge variant="success">
                Approved{corridor.approverName ? ` by ${corridor.approverName}` : ""}
              </Badge>
            )}
          </div>
        </div>

        {corridor.reviewState === "rejected" && corridor.rejectReason && (
          <p className="t-muted mt-5 max-w-[74ch] rounded-sm border border-border-strong px-5 py-4">
            <span className="special-caps block">Sent back because</span>
            <span className="mt-1 block text-base text-ink-2">
              {corridor.rejectReason}
            </span>
          </p>
        )}

        {/* The corridor's own facts, and where each was read. Fee and
            decision time sit next to the source that stated them because
            an approver's job is to open that link and compare. */}
        <Panel className="mt-8">
          <PanelHeader label="Corridor facts" aside={<Source url={corridor.sourceUrl} />} />
          <dl className="grid sm:grid-cols-3">
            {[
              {
                label: "Government fee",
                value:
                  corridor.governmentFeeMinor == null
                    ? "—"
                    : `${corridor.governmentFeeCurrency ?? ""} ${(
                        corridor.governmentFeeMinor / 100
                      ).toLocaleString("en-GB")}`,
              },
              {
                label: "Decision time",
                value:
                  corridor.processingWeeksMin && corridor.processingWeeksMax
                    ? `${corridor.processingWeeksMin}–${corridor.processingWeeksMax} weeks`
                    : "—",
              },
              {
                label: "Last checked",
                value:
                  freshness.state === "unverified"
                    ? "Never"
                    : freshness.checked,
              },
            ].map((f) => (
              <div
                key={f.label}
                className="border-b border-border px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0"
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
              label={`Changes since v${live?.version}`}
              aside={
                <Badge variant={isUnchanged(diff) ? "neutral" : "warning"}>
                  <span className="num">
                    {diff.fields.length + diff.requirements.length}
                  </span>{" "}
                  changes
                </Badge>
              }
            />
            {isUnchanged(diff) ? (
              <PanelBody>
                <p className="t-muted max-w-[74ch]">
                  Nothing differs from the live version. Publishing this would
                  raise a version number and change nothing a traveller sees —
                  which usually means the draft did not pick up what it was
                  meant to.
                </p>
              </PanelBody>
            ) : (
              <div>
                {diff.fields.map((f) => (
                  <div
                    key={f.label}
                    className="border-b border-border px-5 py-4 last:border-0 sm:px-6"
                  >
                    <p className="special-caps">{f.label}</p>
                    <p className="mt-1.5 text-base">
                      <span className="text-ink-3 line-through">
                        {f.before ?? "not set"}
                      </span>
                      <span aria-hidden> → </span>
                      <span className="font-semibold">{f.after ?? "not set"}</span>
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
                          ? "New document"
                          : r.kind === "removed"
                            ? "No longer asked for"
                            : "Reworded"}
                      </Badge>
                      <p className="t-title">{r.name}</p>
                    </div>
                    {r.kind === "changed" &&
                      r.fields.map((f) => (
                        <p key={f.label} className="t-muted mt-2 max-w-[74ch]">
                          <span className="special-caps">{f.label}: </span>
                          <span className="line-through">{f.before ?? "not set"}</span>
                          <span aria-hidden> → </span>
                          <span className="text-ink-2">{f.after ?? "not set"}</span>
                        </p>
                      ))}
                    {r.kind === "removed" && (
                      <p className="t-muted mt-2 max-w-[74ch]">
                        A traveller who already uploaded this keeps their file —
                        only untouched rows are dropped.
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
            label="Every requirement in this version"
            aside={
              <Badge variant={corridor.requirementCount ? "brand" : "warning"}>
                <span className="num">{corridor.requirementCount}</span> documents
              </Badge>
            }
          />
          {corridor.requirements.length === 0 ? (
            <PanelBody>
              <p className="t-muted max-w-[74ch]">
                This draft has no requirements. It cannot be approved — a
                traveller would get a checklist with nothing on it, no upload
                slots and no way to reach submission.
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
                        <Badge variant="outline">Only if it applies</Badge>
                      )}
                    </div>
                    {r.description && (
                      <p className="t-muted mt-1.5 max-w-[74ch]">{r.description}</p>
                    )}
                    {/* The approver's actual job: open this and compare.
                        A requirement with no source is called out in red
                        rather than left looking merely unlinked. */}
                    <p className="mt-2">
                      <Source url={r.sourceUrl} label="Open the source" />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {decidable && (
          <Panel className="mt-6 mb-16">
            <PanelHeader label="Your decision" />
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
