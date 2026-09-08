import type { Metadata } from "next";
import { Building2, MessageSquareText, PauseCircle, UsersRound } from "lucide-react";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
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
import { opsAccount } from "@/app/[locale]/ops/account";

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

  const account = await opsAccount(profile, actor, locale);

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
      // The queue used to be a table at the foot of this page. It is its
      // own screen now, so the card that counts it opens it — a figure
      // an operator acts on should not be a dead end.
      href: "/ops/enquiries",
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
      <KpiRow items={counters} />

      <TenantsTable rows={tenants} locale={locale} className="mt-8" />
    </AdminShell>
  );
}
