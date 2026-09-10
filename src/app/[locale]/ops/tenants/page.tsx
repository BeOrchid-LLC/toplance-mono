import { Suspense } from "react";
import type { Metadata } from "next";
import { Building2, MessageSquareText, PauseCircle, UsersRound } from "lucide-react";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { TableSkeleton } from "@/components/shared/content-skeleton";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { KpiRow, type Kpi } from "@/components/shared/kpi-card";
import { TenantsTable } from "@/components/ops/tenants-table";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listTenants } from "@/lib/data/tenants";
import { listDemoRequests } from "@/lib/data/demo-requests";
import { getOpsCounts, OPEN_DEMO_STATUSES } from "@/lib/data/ops-counts";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { fill } from "@/lib/i18n/fill";
import {
  TENANT_SORTS,
  tenantMatches,
  tenantSortKey,
} from "@/lib/domain/tenant-table";
import {
  readDir,
  readPageSize,
  readSort,
  resolvePage,
  sortRows,
} from "@/lib/domain/sorting";
import { opsAccount } from "@/app/[locale]/ops/account";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_TENANTS.heading[locale] };
}

/** The tenant list's own query string — see `TenantsContent`. */
type TenantsSearchParams = Promise<{
  q?: string;
  state?: string;
  sort?: string;
  dir?: string;
  page?: string;
  size?: string;
}>;

/**
 * The agency list itself, below the rail.
 *
 * `listTenants` and `listDemoRequests` read every agency on the
 * platform and every enquiry against them, and the counters, the
 * filtering and the paging all run on those two results. None of it
 * is anything the console's chrome needs — the rail's own badges come
 * from `getOpsCounts`, which the page still awaits — so behind a
 * `<Suspense>` the rail, the title and the provision button paint
 * first and the table arrives when it is ready.
 *
 * `searchParams` is handed on unawaited, because awaiting it in the
 * page would put the page back to blocking before it returns.
 */
async function TenantsContent({
  locale,
  searchParams,
}: {
  locale: Awaited<ReturnType<typeof getLocale>>;
  searchParams: TenantsSearchParams;
}) {
  const [tenants, demoRequests] = await Promise.all([
    listTenants(),
    listDemoRequests(),
  ]);

  const live = tenants.filter((t) => !t.suspendedAt);
  const suspended = tenants.filter((t) => t.suspendedAt);
  const memberTotal = tenants.reduce((sum, t) => sum + t.members, 0);
  // The same set the rail badge counts — see `OPEN_DEMO_STATUSES`.
  const openEnquiries = demoRequests.filter((r) =>
    (OPEN_DEMO_STATUSES as readonly string[]).includes(r.status)
  );

  // No `href` on the first three: this console holds one list of
  // agencies, and it takes no filter in the URL — so a card offering to
  // open "the suspended ones" would be offering a view that does not
  // exist. The enquiries card is the exception, because that view now
  // does exist and is a screen of its own.
  const counters: Kpi[] = [
    {
      label: OPS_TENANTS.counters.liveTenants.label[locale],
      value: String(live.length),
      sub: OPS_TENANTS.counters.liveTenants.sub[locale],
      icon: Building2,
      tone: "neutral",
    },
    {
      label: OPS_TENANTS.counters.suspended.label[locale],
      value: String(suspended.length),
      sub: OPS_TENANTS.counters.suspended.sub[locale],
      icon: PauseCircle,
      tone: suspended.length ? "warning" : "neutral",
    },
    {
      label: OPS_TENANTS.counters.members.label[locale],
      value: String(memberTotal),
      sub: OPS_TENANTS.counters.members.sub[locale],
      icon: UsersRound,
      tone: "info",
    },
    {
      label: OPS_TENANTS.counters.openEnquiries.label[locale],
      value: String(openEnquiries.length),
      sub: OPS_TENANTS.counters.openEnquiries.sub[locale],
      icon: MessageSquareText,
      tone: openEnquiries.length ? "success" : "neutral",
      // The queue used to be a table at the foot of this page. It is its
      // own screen now, so the card that counts it opens it — a figure
      // an operator acts on should not be a dead end.
      href: "/ops/enquiries",
    },
  ];

  const params = await searchParams;
  const search = (params.q ?? "").trim();
  const state = params.state ?? "";
  const sort = readSort(params.sort, TENANT_SORTS, "agency");
  const dir = readDir(params.dir, "asc");

  // Any narrowing at all, however many rows survive it — the panel
  // heading has to say "showing 3 of 104" whenever the reader is not
  // looking at everything.
  const narrowed = Boolean(search || state);
  const visible = tenants.filter((t) => tenantMatches(t, search, state));
  const sorted = sortRows(visible, (t) => tenantSortKey(t, sort), dir);

  // Sliced after the sort, never before: page two is the second page of
  // the order the reader chose, not an arbitrary 25 re-sorted among
  // themselves. `readPageSize` allow-lists the size so `?size=1000000`
  // cannot ask this page for every row it holds.
  const size = readPageSize(params.size);
  const { page, pageCount, start, end } = resolvePage(params.page, sorted.length, size);
  return (
    <>
      <KpiRow items={counters} />

      <TenantsTable
        rows={sorted.slice(start, end)}
        locale={locale}
        className="mt-8"
        params={{ q: params.q, state: params.state, size: params.size }}
        sort={sort}
        dir={dir}
        total={sorted.length}
        unfilteredTotal={tenants.length}
        pagination={{ page, pageCount, size }}
        filteredLabel={
          narrowed
            ? fill(ADMIN_CONSOLE.showingTemplate[locale], {
                shown: sorted.length,
                total: tenants.length,
              })
            : undefined
        }
      />
    </>
  );
}

export default async function OpsTenantsPage({
  searchParams,
}: {
  searchParams: TenantsSearchParams;
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

  // The chrome's own reads, and only those. The two agency lists moved
  // to `TenantsContent`, so the rail no longer waits behind them.
  const [notifications, unreadCount, counts] = await Promise.all([
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
    getOpsCounts(),
  ]);

  return (
    <AdminShell
      groups={opsAdminNav({
        locale,
        ...counts,
        isOwner: actor.staffRole === "owner",
      })}
      activeId="agencies"
      railTitle={OPS_RAIL_TITLE}
      railBrand={<OpsWordmark />}
      railSubtitle={account.subtitle}
      account={account}
      title={OPS_TENANTS.heading[locale]}
      lead={OPS_TENANTS.intro[locale]}
      actions={
        <>
          <ProvisionTenant />
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/ops"
          />
        </>
      }
    >
      <Suspense fallback={<TableSkeleton />}>
        <TenantsContent locale={locale} searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
