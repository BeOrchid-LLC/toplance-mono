import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MessageSquareText, PauseCircle, UsersRound } from "lucide-react";

import { AccountMenu } from "@/components/app/account-menu";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { DemoRequestQueue } from "@/components/ops/demo-request-queue";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { KpiRow, type Kpi } from "@/components/shared/kpi-card";
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
import { getOpsCounts } from "@/lib/data/ops-counts";
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

  // No `href` on any of these. This console holds one list of agencies
  // and one queue of enquiries, neither of which takes a filter in the
  // URL — so a card offering to open "the suspended ones" would be
  // offering a view that does not exist.
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
      label: OPS_TENANTS.counters.seats.label[locale],
      value: `${seatsUsed} ${OPS_TENANTS.seatsOf[locale]} ${seatsPurchased}`,
      sub: OPS_TENANTS.counters.seats.sub[locale],
      icon: UsersRound,
      tone: "info",
    },
    {
      label: OPS_TENANTS.counters.openEnquiries.label[locale],
      value: String(openEnquiries.length),
      sub: OPS_TENANTS.counters.openEnquiries.sub[locale],
      icon: MessageSquareText,
      tone: openEnquiries.length ? "success" : "neutral",
    },
  ];

  const counts = await getOpsCounts();

  return (
    <AdminShell
      groups={opsAdminNav({
        locale,
        ...counts,
        isOwner: actor.staffRole === "owner",
      })}
      activeId="agencies"
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
      <KpiRow items={counters} />

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
    </AdminShell>
  );
}
