import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Globe2, Route as RouteIcon, ShieldAlert } from "lucide-react";

import { AccountMenu } from "@/components/app/account-menu";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { KpiRow } from "@/components/shared/kpi-card";
import { TableToolbar } from "@/components/shared/table-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasDatabaseEnv } from "@/lib/db/client";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { freshnessOf } from "@/lib/domain/freshness";
import { listCorridors, type CorridorRow } from "@/lib/data/corridors";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { SetupNotice } from "@/components/shared/setup-notice";
import { SortHead } from "@/components/shared/sort-head";
import { readDir, readSort, sortRows } from "@/lib/domain/sorting";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDORS } from "@/lib/i18n/ops-corridors";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_CORRIDORS.heading[locale] };
}

/**
 * The country's name, or the raw code upper-cased when this file cannot
 * resolve it. Never blank and never invented — a drafted corridor for a
 * code we do not map should still be reviewable.
 */
const countryName = (iso: string) => countryFromIso2(iso)?.name ?? iso.toUpperCase();

/**
 * What a row's review state should look like at a glance. `pending` is
 * the only one that is work rather than record, so it is the only one
 * that gets a colour demanding attention. Labels resolve through
 * `OPS_COMMON` rather than living on this object, since the variant is
 * fixed but the word is not.
 */
const STATE_VARIANT = {
  pending: "warning" as const,
  approved: "success" as const,
  rejected: "neutral" as const,
};

function stateLabel(reviewState: keyof typeof STATE_VARIANT, locale: Locale) {
  if (reviewState === "pending") return OPS_COMMON.awaitingReview[locale];
  if (reviewState === "approved") return OPS_COMMON.approved[locale];
  return OPS_COMMON.sentBack[locale];
}

/**
 * How fresh a live corridor is, said in the fewest words that stay
 * honest. The corridor's own page carries the full sentence; a coverage
 * table needs the verdict.
 */
function freshnessLabel(row: CorridorRow, locale: Locale) {
  const f = freshnessOf(row.lastVerifiedAt?.toISOString() ?? null, row.purpose);
  if (f.state === "unverified")
    return { text: OPS_CORRIDORS.notCheckedYetShort[locale], tone: "text-danger-ink" };
  if (f.state === "stale")
    return { text: `${OPS_CORRIDORS.stale[locale]} · ${f.checked}`, tone: "text-warning-ink" };
  return { text: f.checked, tone: "t-muted" };
}

/**
 * The coverage filters, as one map.
 *
 * These cut across the two columns that are not the same question:
 * `reviewState` is where a version is in the approval path, `isLive` is
 * whether the engine serves it, and a superseded version is approved and
 * not live at once. So the filter names the state a person is looking
 * for rather than the column it happens to live in.
 */
function stateFilters(locale: Locale) {
  return [
    { value: "live", label: OPS_COMMON.live[locale] },
    { value: "pending", label: OPS_COMMON.awaitingReview[locale] },
    { value: "unverified", label: OPS_CORRIDORS.notCheckedYetShort[locale] },
    { value: "rejected", label: OPS_COMMON.sentBack[locale] },
  ];
}

function matchesState(row: CorridorRow, state: string) {
  switch (state) {
    case "live":
      return row.isLive;
    case "pending":
      return row.reviewState === "pending";
    case "unverified":
      return row.isLive && !row.lastVerifiedAt;
    case "rejected":
      return row.reviewState === "rejected";
    default:
      return true;
  }
}

/** The columns this table will order by, and nothing else. */
const SORTS = [
  "route",
  "purpose",
  "version",
  "state",
  "documents",
  "checked",
] as const;

export default async function OpsCorridorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    state?: string;
    purpose?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const params = await searchParams;
  const { q, state, purpose } = params;
  const search = (q ?? "").trim().toLowerCase();
  const sort = readSort(params.sort, SORTS, "route");
  const dir = readDir(params.dir, "asc");

  const [rows, notifications, unreadCount, counts] = await Promise.all([
    listCorridors(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
    getOpsCounts(),
  ]);

  const pending = rows.filter((r) => r.reviewState === "pending");
  const live = rows.filter((r) => r.isLive);
  const unverified = live.filter((r) => !r.lastVerifiedAt);
  const purposes = [...new Set(rows.map((r) => r.purpose))].sort();

  const visible = rows.filter((r) => {
    if (state && !matchesState(r, state)) return false;
    if (purpose && r.purpose !== purpose) return false;
    if (!search) return true;
    return [
      countryName(r.nationalityIso),
      countryName(r.destinationIso),
      r.nationalityIso,
      r.destinationIso,
      r.visaName,
      r.purpose,
    ]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(search));
  });

  const sorted = sortRows(
    visible,
    (r) => {
      switch (sort) {
        case "purpose":
          return r.purpose;
        case "version":
          return r.version;
        case "state":
          return stateLabel(r.reviewState, locale);
        case "documents":
          return r.requirementCount;
        case "checked":
          // The date itself, not the words `freshnessLabel` prints: "Not
          // checked yet" would otherwise sort among the Ns. Nulls go last
          // in both directions, which is what `compareCells` does.
          return r.lastVerifiedAt;
        default:
          return `${countryName(r.nationalityIso)} ${countryName(r.destinationIso)}`;
      }
    },
    dir
  );

  const kpis = [
    {
      label: OPS_CORRIDORS.counters.liveRoutes.label[locale],
      value: live.length,
      sub: OPS_CORRIDORS.counters.liveRoutes.sub[locale],
      icon: RouteIcon,
      href: "/ops/corridors?state=live",
      tone: "neutral" as const,
    },
    {
      label: OPS_COMMON.awaitingReview[locale],
      value: pending.length,
      sub: OPS_CORRIDORS.counters.awaitingReviewSub[locale],
      icon: ClipboardCheck,
      href: "/ops/corridors?state=pending",
      tone: "warning" as const,
    },
    {
      // The number the whole plan is measured against, counted the way
      // PRD assumption #1 reads it: destinations, not destination ×
      // purpose. If the client means the other thing, this counter is
      // the first place it will show.
      label: OPS_CORRIDORS.counters.destinations.label[locale],
      value: new Set(live.map((r) => r.destinationIso)).size,
      sub: OPS_CORRIDORS.counters.destinations.sub[locale],
      icon: Globe2,
      href: "/ops/corridors?state=live",
      tone: "info" as const,
    },
    {
      label: OPS_CORRIDORS.counters.notCheckedYet.label[locale],
      value: unverified.length,
      sub: OPS_CORRIDORS.counters.notCheckedYet.sub[locale],
      icon: ShieldAlert,
      href: "/ops/corridors?state=unverified",
      tone: unverified.length ? ("danger" as const) : ("neutral" as const),
    },
  ];

  return (
    <AdminShell
      groups={opsAdminNav({
        locale,
        ...counts,
        isOwner: actor.staffRole === "owner",
      })}
      activeId="routes"
      railTitle="Toplance"
      railSubtitle={`${OPS_COMMON.subtitlePrefix[locale]} · ${OPS_COMMON.staffRole[actor.staffRole ?? "reviewer"][locale]}`}
      railFooter={
        <div className="flex items-center gap-3 px-1.5 py-1 group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0">
          <AccountMenu
            name={profile.fullName}
            email={profile.email}
            subtitle={`${OPS_COMMON.subtitlePrefix[locale]} · ${OPS_COMMON.staffRole[actor.staffRole ?? "reviewer"][locale]}`}
          />
          <div className="min-w-0 group-data-[collapsed]/rail:hidden">
            <p className="t-title truncate">{profile.fullName}</p>
            <p className="special truncate text-ink-3">{profile.email}</p>
          </div>
        </div>
      }
      title={OPS_CORRIDORS.heading[locale]}
      lead={OPS_CORRIDORS.intro[locale]}
      search={
        <TableToolbar
          placeholder={OPS_CORRIDORS.searchPlaceholder[locale]}
          filters={[
            {
              param: "state",
              label: OPS_CORRIDORS.anyState[locale],
              options: stateFilters(locale),
            },
            {
              param: "purpose",
              label: OPS_CORRIDORS.anyPurpose[locale],
              options: purposes.map((p) => ({
                value: p,
                label: OPS_COMMON.purpose[p][locale],
              })),
            },
          ]}
        />
      }
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <KpiRow items={kpis} />

      <Panel className="mt-6">
        <PanelHeader
          label={
            visible.length === rows.length
              ? OPS_CORRIDORS.allVersionsPanel[locale]
              : ADMIN_CONSOLE.showingTemplate[locale]
                  .replace("{shown}", String(visible.length))
                  .replace("{total}", String(rows.length))
          }
          aside={
            <Badge variant="outline">
              <span className="num">{visible.length}</span>{" "}
              {OPS_CORRIDORS.rowsWord[locale]}
            </Badge>
          }
        />
        {rows.length === 0 ? (
          <PanelBody>
            <p className="t-muted max-w-[62ch]">
              {OPS_CORRIDORS.emptyPrefix[locale]} <code>npm run db:seed</code>
              {OPS_CORRIDORS.emptyMiddle[locale]}{" "}
              <code>scripts/draft-corridor.mts</code>.
            </p>
          </PanelBody>
        ) : visible.length === 0 ? (
          <PanelBody>
            <p className="t-muted max-w-[62ch]">
              {ADMIN_CONSOLE.noMatch[locale]}{" "}
              <Link
                href="/ops/corridors"
                className="font-semibold text-brand-text hover:underline"
              >
                {ADMIN_CONSOLE.clearFilters[locale]}
              </Link>
            </p>
          </PanelBody>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  { label: OPS_CORRIDORS.tableHead.route[locale], column: "route" },
                  { label: OPS_CORRIDORS.tableHead.purpose[locale], column: "purpose" },
                  { label: OPS_CORRIDORS.tableHead.version[locale], column: "version" },
                  { label: OPS_CORRIDORS.tableHead.state[locale], column: "state" },
                  { label: OPS_CORRIDORS.tableHead.documents[locale], column: "documents" },
                  { label: OPS_CORRIDORS.tableHead.lastChecked[locale], column: "checked" },
                ].map((c) => (
                  <SortHead
                    key={c.column}
                    label={c.label}
                    column={c.column}
                    sort={sort}
                    dir={dir}
                    basePath="/ops/corridors"
                    params={params}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const fresh = freshnessLabel(row, locale);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/ops/corridors/${row.id}`}
                        className="font-semibold text-brand-text hover:underline"
                      >
                        {countryName(row.nationalityIso)} →{" "}
                        {countryName(row.destinationIso)}
                      </Link>
                      <span className="t-muted block">{row.visaName}</span>
                    </TableCell>
                    <TableCell>{OPS_COMMON.purpose[row.purpose][locale]}</TableCell>
                    <TableCell className="num">v{row.version}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATE_VARIANT[row.reviewState]}>
                          {stateLabel(row.reviewState, locale)}
                        </Badge>
                        {/* Live is a separate fact from approved: a
                            superseded version stays approved for the
                            record and stops being served. */}
                        {row.isLive && (
                          <Badge variant="brand">{OPS_COMMON.live[locale]}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "num",
                        row.requirementCount === 0 && "text-danger-ink"
                      )}
                    >
                      {row.requirementCount}
                    </TableCell>
                    <TableCell className={fresh.tone}>{fresh.text}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </AdminShell>
  );
}
