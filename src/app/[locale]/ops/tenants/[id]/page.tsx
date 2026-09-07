import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppBar } from "@/components/app/app-bar";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { StaffAccessRefused, StaffEnrollmentRequired } from "@/components/ops/refusal";
import { TenantControls } from "@/components/ops/tenant-controls";
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
import { getTenant } from "@/lib/data/tenants";
import { isUuid } from "@/lib/domain/uuid";
import { SetupNotice } from "@/components/shared/setup-notice";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { id } = await params;

  // Never throws for a bad id: metadata for a page that is about to 404
  // should be the section's own title, not an error.
  if (!isUuid(id) || !hasDatabaseEnv) return { title: OPS_TENANTS.heading[locale] };

  const tenant = await getTenant(id.toLowerCase());
  return { title: tenant?.name ?? OPS_TENANTS.heading[locale] };
}

export default async function OpsTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole();
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const { id } = await params;

  /**
   * A malformed id must be indistinguishable from a missing one.
   * Postgres throws on a bad uuid before any row logic runs, so without
   * this a typed URL like /ops/tenants/1 is a 500 where a
   * wrong-but-well-formed id is a 404.
   */
  if (!isUuid(id)) notFound();

  /**
   * `getTenant` finds its row with a JS `===` over `listTenants()`'s
   * output (a plan-sanctioned shortcut — see its own doc comment), not a
   * `where` clause Postgres evaluates. Postgres's `uuid` comparison is
   * case-insensitive; `===` is not. Every existing caller passes an id
   * that came out of `listTenants` itself, so the case always matches.
   * This page is the first caller to pass an id straight off the URL,
   * where a visitor (or a bookmarked/typed link) may use different
   * letter case than the lowercase Postgres stores and returns. Without
   * lower-casing here, such a URL would 404 a tenant that exists.
   * Lower-casing is the correct normal form: `isUuid` already accepted
   * only hex digits and hyphens in the fixed positions, so this cannot
   * change which value it names — it only matches the case Postgres
   * itself returns.
   */
  const normalizedId = id.toLowerCase();

  const [tenant, notifications, unreadCount] = await Promise.all([
    getTenant(normalizedId),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  if (!tenant) notFound();

  const counters = [
    {
      label: OPS_TENANTS.tableHead.members[locale],
      value: `${tenant.members} ${OPS_TENANTS.seatsOf[locale]} ${tenant.seatsPurchased}`,
      sub: OPS_TENANTS.counters.seats.sub[locale],
      tone: "text-ink",
    },
    {
      label: OPS_TENANTS.tableHead.applications[locale],
      value: String(tenant.applicationsTotal),
      sub: OPS_TENANTS.counters.liveTenants.sub[locale],
      tone: "text-ink",
    },
    {
      label: OPS_COMMON.awaitingReview[locale],
      value: String(tenant.withReviewer),
      sub: OPS_TENANTS.counters.openEnquiries.sub[locale],
      tone: tenant.withReviewer ? "text-warning-ink" : "text-ink",
    },
    {
      label: OPS_COMMON.approved[locale],
      value: String(tenant.approved),
      sub: OPS_TENANTS.counters.liveTenants.sub[locale],
      tone: "text-success-ink",
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
          <Link
            href="/ops/tenants"
            className="t-muted inline-flex items-center gap-2 hover:underline"
          >
            <ArrowLeft className="size-4" /> {OPS_TENANTS.detailBackToList[locale]}
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="t-h2">{tenant.name}</h1>
            <Badge variant={tenant.suspendedAt ? "warning" : "success"}>
              {tenant.suspendedAt
                ? OPS_TENANTS.suspendedBadge[locale]
                : OPS_TENANTS.live[locale]}
            </Badge>
          </div>
          {tenant.domain && <p className="t-muted mt-2">{tenant.domain}</p>}

          <CounterRow counters={counters} />

          <Panel className="mt-8">
            <PanelHeader
              label={OPS_TENANTS.invitesPanel[locale]}
              aside={
                <Badge variant="outline">
                  <span className="num">{tenant.pendingInvites.length}</span>
                </Badge>
              }
            />
            {tenant.pendingInvites.length === 0 ? (
              <PanelBody>
                <p className="t-muted max-w-[62ch]">{OPS_TENANTS.emptyInvites[locale]}</p>
              </PanelBody>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{OPS_TENANTS.invitesHead.email[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.invitesHead.kind[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.invitesHead.sent[locale]}</TableHead>
                    <TableHead>{OPS_TENANTS.invitesHead.expires[locale]}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenant.pendingInvites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        {i.email}
                        {i.fullName && <span className="t-muted block">{i.fullName}</span>}
                      </TableCell>
                      <TableCell>
                        {i.kind === "staff"
                          ? OPS_TENANTS.kindStaff[locale]
                          : OPS_TENANTS.kindClient[locale]}
                      </TableCell>
                      <TableCell className="t-muted">
                        {i.createdAt.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "t-muted",
                          i.expiresAt < new Date() && "text-danger-ink"
                        )}
                      >
                        {i.expiresAt.toISOString().slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>

          <div className="mt-8 mb-16">
            <TenantControls tenant={tenant} />
          </div>
        </Shell>
      </div>
    </div>
  );
}
