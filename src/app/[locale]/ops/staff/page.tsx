import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AccountMenu } from "@/components/app/account-menu";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { InviteStaff } from "@/components/ops/invite-staff";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { InvitationRoster } from "@/components/shared/invitation-roster";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { isOwner } from "@/lib/auth/policy";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { listPlatformInvitations } from "@/lib/data/invitations";
import { getOpsCounts } from "@/lib/data/ops-counts";
import {
  getNotifications,
  unreadNotificationCount,
} from "@/lib/notifications/notify";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_STAFF } from "@/lib/i18n/ops-staff";
import { getLocale } from "@/lib/i18n/server";
import {
  resendPlatformInvitation,
  revokePlatformInvitationAction,
} from "@/app/[locale]/ops/staff/actions";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_STAFF.heading[locale] };
}

/**
 * Who works at BeOrchid, and who has been asked to.
 *
 * The screen exists because nothing in the product wrote
 * `profiles.staff_role` — platform staff were made by hand in SQL, which
 * is a fine way to make the first one and a poor way to make the fifth.
 *
 * Owner-only, and the redirect is the guard rather than the hidden nav
 * tab: who works here and at what rank is a question about running the
 * platform, and a reviewer typing the path is not an exception to that.
 * The three actions behind it check the rank again for themselves —
 * they are POST endpoints, and this page is not their gate.
 */
export default async function OpsStaffPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  if (!isOwner(actor)) redirect("/ops/corridors");

  const [invitations, notifications, unreadCount] = await Promise.all([
    listPlatformInvitations(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  const counts = await getOpsCounts();

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: true })}
      activeId="colleagues"
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
      title={OPS_STAFF.heading[locale]}
      lead={OPS_STAFF.intro[locale]}
      actions={
        <>
          <InviteStaff />
          <NotificationsMenu
            notifications={notifications}
            unreadCount={unreadCount}
            fallbackHref="/ops"
          />
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-md border border-border bg-surface-2 px-4 py-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
        <p className="t-muted">{OPS_STAFF.secondFactorNotice[locale]}</p>
      </div>

      <div className="mt-8 mb-16">
        <InvitationRoster
          invitations={invitations}
          locale={locale}
          empty={OPS_STAFF.invitationsEmpty[locale]}
          resendAction={resendPlatformInvitation}
          revokeAction={revokePlatformInvitationAction}
        />
      </div>
    </AdminShell>
  );
}
