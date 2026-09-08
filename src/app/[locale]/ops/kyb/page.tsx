import type { Metadata } from "next";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { KybTable } from "@/components/ops/kyb-table";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { kybQueue } from "@/lib/data/kyb";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { OPS_KYB } from "@/lib/i18n/ops-kyb";
import { opsAccount } from "@/app/[locale]/ops/account";

/**
 * The verification queue.
 *
 * No counter row, deliberately. `/ops/tenants` has four cards because
 * the questions it answers are about the platform's shape; the question
 * this screen answers is "whose turn is it", and that is the table
 * itself, ordered oldest-first. A row of figures above it would be a
 * summary of a list short enough to read.
 */

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_KYB.heading[locale] };
}

export default async function OpsKybPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const account = await opsAccount(profile, actor, locale);

  const [rows, notifications, unreadCount, counts] = await Promise.all([
    kybQueue(),
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
      activeId="kyb"
      railTitle={OPS_RAIL_TITLE}
      railBrand={<OpsWordmark />}
      railSubtitle={account.subtitle}
      account={account}
      title={OPS_KYB.heading[locale]}
      lead={OPS_KYB.intro[locale]}
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <KybTable rows={rows} locale={locale} />
    </AdminShell>
  );
}
