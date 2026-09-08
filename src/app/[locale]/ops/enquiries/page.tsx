import type { Metadata } from "next";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { EnquiryTable } from "@/components/ops/enquiry-table";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { SetupNotice } from "@/components/shared/setup-notice";
import { isOwner } from "@/lib/auth/policy";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { hasDatabaseEnv } from "@/lib/db/client";
import { listDemoRequests, listPlatformStaff } from "@/lib/data/demo-requests";
import { getOpsCounts } from "@/lib/data/ops-counts";
import {
  ENQUIRY_SORTS,
  enquirySortKey,
  matchesAssignee,
  readAssigneeFilter,
} from "@/lib/domain/enquiry-table";
import { readDir, readPageSize, readSort, resolvePage, sortRows } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { OPS_ENQUIRIES } from "@/lib/i18n/ops-enquiries";
import { getLocale } from "@/lib/i18n/server";
import {
  getNotifications,
  unreadNotificationCount,
} from "@/lib/notifications/notify";
import { opsAccount } from "@/app/[locale]/ops/account";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_ENQUIRIES.heading[locale] };
}

/**
 * Everyone who has asked for a demo, and who is looking after them.
 *
 * This queue existed before this screen did — as a table at the foot of
 * `/ops/tenants`, below the agency list and its pagination. With a
 * hundred agencies above it, an operator had to scroll past the entire
 * customer base to reach the enquiries nobody had answered yet, which is
 * a good way to own a sales queue and never read it. It has its own rail
 * row now, and the open-enquiry badge moved onto that row: a count of
 * work belongs beside the link that opens the work.
 *
 * Every rank, deliberately — no `isOwner` gate. `/ops/tenants` has
 * always let any reviewer move one of these rows along, and answering a
 * company that enquired this morning is the platform team's shared job.
 * The two writes behind it check staff and a second factor for
 * themselves; this page is not their gate.
 *
 * Assignment is a label rather than a lock. Anyone may take a row, hand
 * it on or put it back, and holding one grants nothing — see
 * `setDemoRequestAssignee`. What it buys is the answer to "is anybody on
 * this", which `status` has never been able to give.
 */
export default async function OpsEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assignee?: string;
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

  const [enquiries, staff, counts, notifications, unreadCount, account] =
    await Promise.all([
      listDemoRequests(),
      listPlatformStaff(),
      getOpsCounts(),
      getNotifications(actor.userId),
      unreadNotificationCount(actor.userId),
      opsAccount(profile, actor, locale),
    ]);

  const params = await searchParams;
  const search = (params.q ?? "").trim().toLowerCase();
  const assigneeFilter = readAssigneeFilter(params.assignee);

  // Oldest-preferred first would be the other reasonable default. This
  // one is "who asked most recently", which is the order the queue was
  // read in when it lived on `/ops/tenants`, and changing the order and
  // the address in the same commit would make a regression impossible to
  // attribute.
  const sort = readSort(params.sort, ENQUIRY_SORTS, "who");
  const dir = readDir(params.dir, "asc");

  // Any narrowing at all, however many rows survive it — the same test
  // `/ops/staff` and `/ops/corridors` use.
  const filtered = Boolean(search || params.status || params.assignee);

  const visible = enquiries.filter((row) => {
    if (params.status && row.status !== params.status) return false;
    if (!matchesAssignee(row, assigneeFilter)) return false;
    if (!search) return true;
    return [row.fullName, row.email, row.companyName].some((field) =>
      field?.toLowerCase().includes(search)
    );
  });

  // Allow-listed, so `?size=1000000` cannot ask this page to render
  // every row it holds.
  const size = readPageSize(params.size);
  const sorted = sortRows(visible, (row) => enquirySortKey(row, sort, locale), dir);
  const { page, pageCount, start, end } = resolvePage(params.page, sorted.length, size);

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: isOwner(actor) })}
      activeId="enquiries"
      railTitle={OPS_RAIL_TITLE}
      railBrand={<OpsWordmark />}
      railSubtitle={account.subtitle}
      account={account}
      title={OPS_ENQUIRIES.heading[locale]}
      lead={OPS_ENQUIRIES.intro[locale]}
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <EnquiryTable
        rows={sorted.slice(start, end)}
        staff={staff}
        viewerId={actor.userId}
        sort={sort}
        dir={dir}
        params={params}
        total={sorted.length}
        unfilteredTotal={enquiries.length}
        filteredLabel={
          filtered
            ? ADMIN_CONSOLE.showingTemplate[locale]
                .replace("{shown}", String(visible.length))
                .replace("{total}", String(enquiries.length))
            : undefined
        }
        pagination={{ page, pageCount, size }}
      />
    </AdminShell>
  );
}
