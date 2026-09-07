import type { Metadata } from "next";
import Link from "next/link";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { DemoRequestQueue } from "@/components/ops/demo-request-queue";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { localizedOpsNav } from "@/components/ops/ops-nav";
import { CounterRow } from "@/components/shared/counter-row";
import { Shell } from "@/components/shared/shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listTenants } from "@/lib/data/tenants";
import { listDemoRequests } from "@/lib/data/demo-requests";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_TENANTS.heading[locale] };
}

export default async function OpsTenantsPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [tenants, demoRequests, notifications, unreadCount] = await Promise.all([
    listTenants(),
    listDemoRequests(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  const live = tenants.filter((t) => !t.suspendedAt);
  const suspended = tenants.filter((t) => t.suspendedAt);
  const seatsUsed = tenants.reduce((sum, t) => sum + t.members, 0);
  const seatsPurchased = tenants.reduce((sum, t) => sum + t.seatsPurchased, 0);
  const openEnquiries = demoRequests.filter(
    (r) => r.status !== "converted" && r.status !== "declined"
  );

  const counters = [
    {
      label: OPS_TENANTS.counters.liveTenants.label[locale],
      value: String(live.length),
      sub: OPS_TENANTS.counters.liveTenants.sub[locale],
      tone: "text-ink",
    },
    {
      label: OPS_TENANTS.counters.suspended.label[locale],
      value: String(suspended.length),
      sub: OPS_TENANTS.counters.suspended.sub[locale],
      tone: suspended.length ? "text-warning-ink" : "text-ink",
    },
    {
      label: OPS_TENANTS.counters.seats.label[locale],
      value: `${seatsUsed} ${OPS_TENANTS.seatsOf[locale]} ${seatsPurchased}`,
      sub: OPS_TENANTS.counters.seats.sub[locale],
      tone: "text-info-ink",
    },
    {
      label: OPS_TENANTS.counters.openEnquiries.label[locale],
      value: String(openEnquiries.length),
      sub: OPS_TENANTS.counters.openEnquiries.sub[locale],
      tone: openEnquiries.length ? "text-brand-text" : "text-ink",
    },
  ];

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

      <div className="relative isolate">
        <div
          aria-hidden
          className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px]"
        />

        <Shell className="pt-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="t-h2">{OPS_TENANTS.heading[locale]}</h1>
              <p className="t-muted mt-2 max-w-[62ch]">{OPS_TENANTS.intro[locale]}</p>
            </div>
            <ProvisionTenant />
          </div>

          <CounterRow counters={counters} />

          <Panel className="mt-8">
            <PanelHeader
              label={OPS_TENANTS.tenantsPanel[locale]}
              aside={
                <Badge variant="outline">
                  <span className="num">{tenants.length}</span>{" "}
                  {OPS_TENANTS.agenciesWord[locale]}
                </Badge>
              }
            />
            {tenants.length === 0 ? (
              <PanelBody>
                <p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyTenants[locale]}</p>
              </PanelBody>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{OPS_TENANTS.tableHead.agency[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.members[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.applications[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.progress[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.state[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.tableHead.added[locale]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/ops/tenants/${t.id}`}
                          className="font-semibold text-brand-text hover:underline"
                        >
                          {t.name}
                        </Link>
                        {t.domain && <span className="t-muted block">{t.domain}</span>}
                      </TableCell>
                      <TableCell className="num">
                        {t.members} {OPS_TENANTS.seatsOf[locale]} {t.seatsPurchased}
                      </TableCell>
                      <TableCell className="num">{t.applicationsTotal}</TableCell>
                      <TableCell className="t-muted">
                        {/* Four numbers, not four badges: this is a scan
                            column, and colour here would compete with the
                            state pill beside it. */}
                        <span className="num">{t.inProgress}</span> ·{" "}
                        <span className="num">{t.withReviewer}</span> ·{" "}
                        <span className="num">{t.approved}</span> ·{" "}
                        <span className="num">{t.rejected}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.suspendedAt ? "warning" : "success"}>
                          {t.suspendedAt
                            ? OPS_TENANTS.suspendedBadge[locale]
                            : OPS_TENANTS.live[locale]}
                        </Badge>
                      </TableCell>
                      <TableCell className="t-muted">
                        {t.createdAt.toISOString().slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>

          <DemoRequestQueue requests={demoRequests} className="mt-8 mb-16" />
        </Shell>
      </div>
    </div>
  );
}
