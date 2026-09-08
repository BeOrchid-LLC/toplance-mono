import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { InviteStaff } from "@/components/ops/invite-staff";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { InvitationTable } from "@/components/shared/invitation-table";
import { STAFF_SORTS, staffSortKey } from "@/lib/domain/invitation-table";
import { readDir, readPageSize, readSort, resolvePage, sortRows } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
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
import { OPS_STAFF } from "@/lib/i18n/ops-staff";
import { getLocale } from "@/lib/i18n/server";
import {
  resendPlatformInvitation,
  revokePlatformInvitationAction,
} from "@/app/[locale]/ops/staff/actions";
import { opsAccount } from "@/app/[locale]/ops/account";

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
export default async function OpsStaffPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    rank?: string;
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

  if (!isOwner(actor)) redirect("/ops/corridors");

  const account = await opsAccount(profile, actor, locale);

  const [invitations, notifications, unreadCount] = await Promise.all([
    listPlatformInvitations(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  const counts = await getOpsCounts();

  const params = await searchParams;
  const search = (params.q ?? "").trim().toLowerCase();
  const sort = readSort(params.sort, STAFF_SORTS, "invited");
  // Newest first. An invitation roster is read to find out who was asked
  // recently, not who was asked in 2024.
  const dir = readDir(params.dir, params.sort ? "asc" : "desc");

  // Any narrowing at all, however many rows survive it — the same test
  // `/ops/corridors` uses, so the two panels say the same thing about
  // themselves.
  const filtered = Boolean(search || params.status || params.rank);

  const visible = invitations.filter((invite) => {
    if (params.status && invite.status !== params.status) return false;
    if (params.rank && (invite.staffRank ?? "reviewer") !== params.rank) return false;
    if (!search) return true;
    return [invite.fullName, invite.email].some((field) =>
      field?.toLowerCase().includes(search)
    );
  });

  // Allow-listed, so `?size=1000000` cannot ask this page to render
  // every row it holds.
  const size = readPageSize(params.size);
  const sorted = sortRows(visible, (i) => staffSortKey(i, sort, locale), dir);
  const { page, pageCount, start, end } = resolvePage(params.page, sorted.length, size);

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: true })}
      activeId="colleagues"
      railTitle="Toplance"
      railSubtitle={account.subtitle}
      account={account}
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

      <InvitationTable
        rows={sorted.slice(start, end)}
        locale={locale}
        sort={sort}
        dir={dir}
        params={params}
        total={sorted.length}
        unfilteredTotal={invitations.length}
        filteredLabel={
          filtered
            ? ADMIN_CONSOLE.showingTemplate[locale]
                .replace("{shown}", String(visible.length))
                .replace("{total}", String(invitations.length))
            : undefined
        }
        pagination={{ page, pageCount, size }}
        resendAction={resendPlatformInvitation}
        revokeAction={revokePlatformInvitationAction}
      />
    </AdminShell>
  );
}
