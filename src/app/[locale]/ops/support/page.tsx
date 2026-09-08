import type { Metadata } from "next";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { SupportTable } from "@/components/ops/support-table";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { SetupNotice } from "@/components/shared/setup-notice";
import { isOwner } from "@/lib/auth/policy";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listSupportRequests } from "@/lib/data/support";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { readPageSize, resolvePage } from "@/lib/domain/sorting";
import { supportMatches } from "@/lib/domain/support-table";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";
import { getLocale } from "@/lib/i18n/server";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { opsAccount } from "@/app/[locale]/ops/account";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_SUPPORT.heading[locale] };
}

/**
 * Agencies asking BeOrchid for help.
 *
 * The first channel of any kind from a tenant to the operator. Until
 * this screen existed, an agency in dispute — over a suspension, a
 * bill, a case somebody else's handler had claimed — had no way to
 * reach anybody at all, which the client raised on 8 September.
 *
 * Every rank, deliberately, for the reason `/ops/enquiries` gives: an
 * owner-only gate would put one person between a tenant and a reply.
 * The two writes behind it check staff and a second factor themselves.
 *
 * Newest first. An operator opening this screen is answering "what has
 * come in", and the state filter is how they reach the backlog — a
 * queue that opened on the oldest row would bury a dispute raised this
 * morning under one raised last month.
 */
export default async function OpsSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    state?: string;
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

  const [requests, counts, notifications, unreadCount, account] = await Promise.all([
    listSupportRequests(),
    getOpsCounts(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
    opsAccount(profile, actor, locale),
  ]);

  const params = await searchParams;
  const search = (params.q ?? "").trim();
  const state = params.state ?? "";
  const narrowed = Boolean(search || state);

  const visible = requests.filter((r) => supportMatches(r, search, state));

  // Allow-listed, so `?size=1000000` cannot ask this page for every row.
  const size = readPageSize(params.size);
  const { page, pageCount, start, end } = resolvePage(params.page, visible.length, size);

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: isOwner(actor) })}
      activeId="support"
      railTitle={OPS_RAIL_TITLE}
      railBrand={<OpsWordmark />}
      railSubtitle={account.subtitle}
      account={account}
      title={OPS_SUPPORT.heading[locale]}
      lead={OPS_SUPPORT.intro[locale]}
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <SupportTable
        rows={visible.slice(start, end)}
        locale={locale}
        viewerId={actor.userId}
        params={{ q: params.q, state: params.state, size: params.size }}
        total={visible.length}
        unfilteredTotal={requests.length}
        pagination={{ page, pageCount, size }}
        filteredLabel={
          narrowed
            ? ADMIN_CONSOLE.showingTemplate[locale]
                .replace("{shown}", String(visible.length))
                .replace("{total}", String(requests.length))
            : undefined
        }
      />
    </AdminShell>
  );
}
