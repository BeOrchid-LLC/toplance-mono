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
import {
  KYB_SORTS,
  kybMatches,
  kybMatchesStanding,
  kybSortKey,
} from "@/lib/domain/kyb-table";
import { readDir, readPageSize, readSort, resolvePage, sortRows } from "@/lib/domain/sorting";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getLocale } from "@/lib/i18n/server";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
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

export default async function OpsKybPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    standing?: string;
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

  const [rows, notifications, unreadCount, counts] = await Promise.all([
    kybQueue(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
    getOpsCounts(),
  ]);

  const params = await searchParams;
  const { q, standing } = params;
  const search = q ?? "";

  // Empty by default, unlike every other table on this console. The
  // queue arrives already ordered by what is owed a decision, and
  // defaulting a sort here would silently overrule that on first paint —
  // see `KybTable`. `readSort` needs a member of the union as its
  // fallback, so the empty string is applied after it.
  const sort = params.sort ? readSort(params.sort, KYB_SORTS, "agency") : "";
  const dir = readDir(params.dir, "asc");

  const filtered = Boolean(search.trim() || standing);

  const visible = rows.filter(
    (r) => kybMatchesStanding(r, standing ?? "") && kybMatches(r, search)
  );

  const sorted = sort ? sortRows(visible, (r) => kybSortKey(r, sort), dir) : visible;

  // Allow-listed, so `?size=1000000` cannot ask this page to render
  // every row it holds.
  const size = readPageSize(params.size);
  const { page, pageCount, start, end } = resolvePage(params.page, sorted.length, size);

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
      <KybTable
        rows={sorted.slice(start, end)}
        locale={locale}
        sort={sort}
        dir={dir}
        params={params}
        total={sorted.length}
        unfilteredTotal={rows.length}
        filteredLabel={
          // Whether the reader narrowed the list, not whether the counts
          // happen to agree — the rule `/ops/corridors` states. A filter
          // that matches every row still filtered.
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
