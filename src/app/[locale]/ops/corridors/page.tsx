import type { Metadata } from "next";
import { ClipboardCheck, Globe2, Route as RouteIcon, ShieldAlert } from "lucide-react";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { CorridorsTable } from "@/components/ops/corridors-table";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { KpiRow } from "@/components/shared/kpi-card";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listCorridors } from "@/lib/data/corridors";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { SetupNotice } from "@/components/shared/setup-notice";
import {
  CORRIDOR_SORTS,
  corridorMatchesState,
  corridorSortKey,
  countryName,
} from "@/lib/domain/corridor-table";
import { readDir, readPageSize, readSort, resolvePage, sortRows } from "@/lib/domain/sorting";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDORS } from "@/lib/i18n/ops-corridors";
import { opsAccount } from "@/app/[locale]/ops/account";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_CORRIDORS.heading[locale] };
}

export default async function OpsCorridorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    state?: string;
    purpose?: string;
    sort?: string;
    dir?: string;
    page?: string;
    size?: string;
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

  const account = await opsAccount(profile, actor, locale);

  const params = await searchParams;
  const { q, state, purpose } = params;
  const search = (q ?? "").trim().toLowerCase();
  const sort = readSort(params.sort, CORRIDOR_SORTS, "route");
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

  // Any narrowing at all, however many rows survive it.
  const filtered = Boolean(search || state || purpose);

  const visible = rows.filter((r) => {
    if (state && !corridorMatchesState(r, state)) return false;
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

  const sorted = sortRows(visible, (r) => corridorSortKey(r, sort, locale), dir);

  // 99 versions today and climbing, so this is the table the pager was
  // written for. Sliced after the sort, never before: page two has to be
  // the second 25 of the order the reader chose, not 25 arbitrary rows
  // re-sorted among themselves.
  // Allow-listed, so `?size=1000000` cannot ask this page to render
  // every row it holds.
  const size = readPageSize(params.size);
  const { page, pageCount, start, end } = resolvePage(params.page, sorted.length, size);

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
      railSubtitle={account.subtitle}
      account={account}
      title={OPS_CORRIDORS.heading[locale]}
      lead={OPS_CORRIDORS.intro[locale]}
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <KpiRow items={kpis} />

      <CorridorsTable
        rows={sorted.slice(start, end)}
        locale={locale}
        sort={sort}
        dir={dir}
        params={params}
        purposes={purposes}
        total={sorted.length}
        unfilteredTotal={rows.length}
        filteredLabel={
          // Whether the reader narrowed the list, not whether the counts
          // happen to agree. A filter that matches every row still
          // filtered — calling that "All versions" tells somebody the
          // search box is empty when it is not.
          filtered
            ? ADMIN_CONSOLE.showingTemplate[locale]
                .replace("{shown}", String(visible.length))
                .replace("{total}", String(rows.length))
            : undefined
        }
        pagination={{ page, pageCount, size }}
      />
    </AdminShell>
  );
}
