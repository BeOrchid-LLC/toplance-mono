import type { Metadata } from "next";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { FunnelBars } from "@/components/shared/funnel-bars";
import {
  OwnerAccessRefused,
  StaffAccessRefused,
  StaffEnrollmentRequired,
} from "@/components/ops/refusal";
import { ClientsTable } from "@/components/ops/clients-table";
import { DashboardTabs } from "@/components/ops/dashboard-tabs";
import { openTabOf, opsClientMatches } from "@/lib/domain/ops-client-table";
import { readPageSize, resolvePage } from "@/lib/domain/sorting";
import { ADMIN_CONSOLE } from "@/lib/i18n/admin-console";
import { fill } from "@/lib/i18n/fill";
import { OPS_RAIL_TITLE, OpsWordmark } from "@/components/ops/ops-rail";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { CounterRow, type Counter } from "@/components/shared/counter-row";
import { RevenueChart } from "@/components/ops/revenue-chart";
import { SetupNotice } from "@/components/shared/setup-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { hasDatabaseEnv } from "@/lib/db/client";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { track } from "@/lib/analytics/track";
import { dashboardData, USAGE_WINDOW_DAYS, type DashboardData } from "@/lib/data/dashboard";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { formatMoney } from "@/lib/domain/pricing";
import type { TopCount } from "@/lib/domain/kpis";
import type { Invoice } from "@/lib/domain/payments";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { opsAccount } from "@/app/[locale]/ops/account";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: OPS_COMMON.nav.dashboard[locale] };
}

/** A rate as a whole percentage, or an em dash when there is nothing to divide. */
function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/** A count of days, or an em dash before the first sample. */
function days(value: number | null): string {
  return value === null ? "—" : `${value}d`;
}

/** `2026-07-01` → `Jul 2026`. */
function cycleName(cycle: string): string {
  return new Date(`${cycle}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * How the business is doing, on one screen.
 *
 * Director-only, unlike the rest of this console: it carries revenue and
 * per-client billing, and `staff_role` has told a reviewer apart from a
 * director since the corridor approval gate without any screen reading
 * it. `requireStaffConsole` refuses on the role before it asks Clerk
 * about a second factor — enrolling an authenticator app would not get a
 * reviewer in, so sending them to do it first is a walk to a door that
 * stays shut.
 *
 * Four tabs off one query pass. They are tabs rather than four screens
 * because the question behind all of them is the same one — "how is the
 * business doing" — and a director who has to navigate between revenue
 * and the review desk cannot see that they are the same story.
 */
const DASHBOARD_TABS = ["overview", "clients", "operations", "demand"] as const;

export default async function OpsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    page?: string;
    size?: string;
  }>;
}) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  const gate = await requireStaffConsole("owner");
  if (gate.decision === "refuse") return <StaffAccessRefused />;
  if (gate.decision === "refuse-role") return <OwnerAccessRefused />;
  if (gate.decision === "enroll") {
    return <StaffEnrollmentRequired accountsUrl={gate.accountsUrl} />;
  }
  const { profile, actor } = gate;

  const [data, counts, notifications, unreadCount] = await Promise.all([
    dashboardData(),
    getOpsCounts(),
    getNotifications(actor.userId),
    unreadNotificationCount(actor.userId),
  ]);

  // Never awaited and never able to throw — `track` swallows its own
  // errors, because no analytics write is worth failing a page load for.
  void track("toplance.dashboard_viewed", {}, actor.userId);

  const account = await opsAccount(profile, actor, locale);

  const params = await searchParams;
  const openTab = openTabOf(params.tab, DASHBOARD_TABS);

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: true })}
      activeId="business"
      railTitle={OPS_RAIL_TITLE}
      railBrand={<OpsWordmark />}
      railSubtitle={account.subtitle}
      account={account}
      title={OPS_COMMON.nav.dashboard[locale]}
      lead="The state of the business — agencies, revenue, the review desk and where demand is going."
      actions={
        <NotificationsMenu
          notifications={notifications}
          unreadCount={unreadCount}
          fallbackHref="/ops"
        />
      }
    >
      <CounterRow
        className="mt-0"
        counters={[
          {
            label: "Agencies",
            value: data.totals.clients,
            sub: "organisations on the platform",
          },
          {
            // Per application, not per seat. Seats stay on the
            // per-agency table, where they mean team members and a cap
            // is a real thing; up here they were the wrong unit for a
            // business that bills on throughput.
            label: "Applications processed",
            value: data.totals.applicationsProcessed,
            sub: `${data.totals.applicants} started, drafts included`,
          },
          {
            label: "Travellers",
            value: data.totals.travellers,
            sub: `${data.totals.directApplicants} came directly`,
          },
          {
            label: "Open cases",
            value: data.totals.openCases,
            sub: "somebody still has work to do",
            tone: "text-info-ink",
          },
        ]}
      />

      <DashboardTabs
        open={openTab}
        tabs={[
          { value: "overview", label: "Overview", panel: <Overview data={data} /> },
          {
            value: "clients",
            label: "Agencies",
            panel: <Clients data={data} locale={locale} params={params} />,
          },
          {
            value: "operations",
            label: "Operations",
            panel: <Operations data={data} locale={locale} />,
          },
          { value: "demand", label: "Demand", panel: <Demand data={data} /> },
        ]}
      />
    </AdminShell>
  );
}

function Overview({ data }: { data: DashboardData }) {
  const { payments, currency } = { payments: data.payments, currency: data.payments.currency };
  const money = (minor: number) => formatMoney(minor, currency);

  const tiles: Counter[] = [
    {
      label: "Collected",
      value: money(payments.collectedMinor),
      // What `payments` says was actually taken. Reads $0 until the
      // first subscription settles, which is the true figure and not a
      // placeholder — see `listInvoices`.
      sub: "settled against a payment",
      tone: "text-success-ink",
    },
    {
      label: "Outstanding",
      value: money(payments.outstandingMinor),
      sub: `${money(payments.overdueMinor)} of it overdue`,
      tone: "text-warning-ink",
    },
    {
      label: "Accruing",
      value: money(payments.accruingMinor),
      sub: "this cycle, not yet billed",
    },
    {
      label: "MRR",
      value: money(payments.mrrMinor),
      // Named honestly. Nothing in this schema records a subscription,
      // so this is base fees across active clients and not the SaaS
      // metric the acronym implies.
      sub: "base fees, active clients",
    },
    {
      label: "Per client",
      value: money(payments.arpaMinor),
      sub: `across ${payments.payingClients} billed`,
    },
  ];

  return (
    <>
      <CounterRow counters={tiles} columns={5} className="mt-0" />

      <Panel>
        <PanelHeader
          label="Revenue by billing cycle"
          aside={
            <Badge variant="neutral">
              {data.revenue.length}{" "}
              {data.revenue.length === 1 ? "cycle" : "cycles"}
            </Badge>
          }
        />
        <PanelBody>
          <RevenueChart points={data.revenue} currency={currency} />
        </PanelBody>
      </Panel>

      <Exceptions invoices={data.invoices} currency={currency} />
    </>
  );
}

/**
 * Declined charges — the only panel on this screen that asks for an
 * action rather than reporting a state.
 *
 * Failures alone. A refund would belong here too, but `payment_status`
 * has three values and refunded is not among them, so there is nothing
 * to read: a column for a state the schema cannot hold would be a
 * promise this screen could not keep.
 *
 * Rendered only when there is something in it. A permanent "0 failures"
 * panel is a line of furniture on a screen meant to be scanned, and it
 * trains the eye to skip the place a real failure would appear.
 */
function Exceptions({
  invoices,
  currency,
}: {
  invoices: Invoice[];
  currency: string;
}) {
  const problems = invoices
    .filter((i) => i.status === "failed")
    .sort((a, b) => b.cycleStart.getTime() - a.cycleStart.getTime())
    .slice(0, 8);

  if (problems.length === 0) return null;

  return (
    <Panel>
      <PanelHeader
        label="Needs attention"
        aside={<Badge variant="danger">{problems.length}</Badge>}
      />
      <ul className="divide-y divide-border">
        {problems.map((invoice) => (
          <li
            key={invoice.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4 sm:px-6"
          >
            <div className="min-w-0">
              <p className="t-title truncate">{invoice.orgName}</p>
              <p className="special">
                {cycleName(invoice.cycleStart.toISOString().slice(0, 10))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="num font-semibold">
                {formatMoney(invoice.amountMinor, currency)}
              </span>
              <Badge variant="danger">Failed</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Clients({
  data,
  locale,
  params,
}: {
  data: DashboardData;
  locale: Locale;
  params: { tab?: string; q?: string; page?: string; size?: string };
}) {
  // Money per client, so the table can show what each one is worth
  // without a second pass over the invoice list per row.
  const billed: Record<string, { billedMinor: number; paidMinor: number }> = {};
  for (const invoice of data.invoices) {
    const entry = billed[invoice.orgId] ?? { billedMinor: 0, paidMinor: 0 };
    if (invoice.status !== "draft") entry.billedMinor += invoice.amountMinor;
    if (invoice.status === "paid") entry.paidMinor += invoice.amountMinor;
    billed[invoice.orgId] = entry;
  }

  // Clients with nothing at all are real rows (a client who bought seats
  // and used none is worth seeing) but there are a great many of them in
  // a pre-launch database, so the ones with activity come first and the
  // dormant tail is counted rather than listed.
  const active = data.clients.filter((c) => c.invited > 0 || c.applicants > 0);

  const search = (params.q ?? "").trim();
  const visible = active.filter((c) => opsClientMatches(c, search));
  const size = readPageSize(params.size);
  const { page, pageCount, start, end } = resolvePage(params.page, visible.length, size);

  return (
    <ClientsTable
      rows={visible.slice(start, end)}
      // A plain object rather than a `Map`: this crosses the boundary
      // into a client component, and React cannot serialise a `Map`.
      money={billed}
      currency={data.payments.currency}
      locale={locale}
      totalClients={data.clients.length}
      // The dormant tail is a fact about every client, not about the
      // rows a search left behind, so it does not move when the reader
      // narrows the table. A footer that shrank with the search would
      // be answering a question nobody asked.
      dormant={data.clients.length - active.length}
      searchPlaceholder="Search by agency"
      // `tab` rides along so the toolbar's own links come back to this
      // panel instead of dropping the reader on Overview.
      params={{ tab: "clients", q: params.q, size: params.size }}
      total={visible.length}
      unfilteredTotal={active.length}
      pagination={{ page, pageCount, size }}
      filteredLabel={
        search
          ? fill(ADMIN_CONSOLE.showingTemplate[locale], {
              shown: visible.length,
              total: active.length,
            })
          : undefined
      }
    />
  );
}

function Operations({ data, locale }: { data: DashboardData; locale: Locale }) {
  const { operations, documents, funnel } = data;

  return (
    <>
      <CounterRow
        columns={5}
        className="mt-0"
        counters={[
          {
            label: "Unassigned",
            value: operations.unassigned,
            sub: "open, no reviewer",
            tone: operations.unassigned > 0 ? "text-warning-ink" : undefined,
          },
          {
            label: "Past SLA",
            value: operations.overdueSla,
            sub: "open and overdue",
            tone: operations.overdueSla > 0 ? "text-danger-ink" : undefined,
          },
          {
            label: "To decision",
            value: days(operations.medianDaysToDecision),
            sub: "median, from submission",
          },
          {
            label: "Approval rate",
            value: pct(operations.approvalRate),
            sub: `over ${operations.decided} decided`,
          },
          {
            label: "Flagged",
            value: pct(documents.flagRate),
            sub: "of documents reviewed",
          },
        ]}
      />

      <Panel>
        <PanelHeader
          label="Where applications stop"
          aside={
            data.stalled > 0 ? (
              <Badge variant="warning">
                <span className="num">{data.stalled}</span> never submitted
              </Badge>
            ) : undefined
          }
        />
        <PanelBody>
          <FunnelBars
            stages={funnel}
            ofPreviousLabel={(share) => `${share} of previous`}
          />
        </PanelBody>
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel>
          <PanelHeader label="Cases by status" />
          <PanelBody>
            {operations.byStatus.length === 0 ? (
              <p className="t-muted">No applications yet.</p>
            ) : (
              <ul className="space-y-3">
                {operations.byStatus.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between gap-4"
                  >
                    <StatusBadge status={row.status} locale={locale} short />
                    <span className="num font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            label="Most flagged documents"
            aside={<Badge variant="neutral">{documents.flagged} flagged</Badge>}
          />
          <PanelBody>
            {/* The actionable panel on this tab: a checklist item that
                gets flagged repeatedly is usually a guidance problem on
                our side, not a traveller problem. */}
            <CountList
              rows={documents.mostFlagged}
              empty="Nothing has been flagged yet."
              label={(key) => key.replace(/_/g, " ")}
            />
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}

function Demand({ data }: { data: DashboardData }) {
  const { demand } = data;

  return (
    <>
      <CounterRow
        columns={4}
        className="mt-0"
        counters={[
          {
            label: "Sponsored",
            value: demand.sponsored,
            sub: "sent by a client",
          },
          {
            label: "Direct",
            value: demand.direct,
            sub: "came on their own",
          },
          {
            label: "Expiring soon",
            value: demand.expiringSoon,
            sub: "visas inside 90 days",
            tone: demand.expiringSoon > 0 ? "text-warning-ink" : undefined,
          },
          {
            label: "Destinations",
            value: demand.destinations.length,
            sub: "with at least one application",
          },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel>
          <PanelHeader label="Top destinations" />
          <PanelBody>
            <CountList
              rows={demand.destinations}
              empty="No application has a route yet."
              label={(key) => countryFromIso2(key)?.name ?? key.toUpperCase()}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader label="Traveller nationalities" />
          <PanelBody>
            <CountList
              rows={demand.nationalities}
              empty="No travellers yet."
              label={(key) => countryFromIso2(key)?.name ?? key.toUpperCase()}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader label="Purpose of travel" />
          <PanelBody>
            <CountList
              rows={demand.purposes}
              empty="No application has a purpose yet."
              label={(key) => key}
              className="capitalize"
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            label="Product usage"
            aside={
              <Badge variant="neutral">last {USAGE_WINDOW_DAYS} days</Badge>
            }
          />
          <PanelBody>
            <CountList
              rows={demand.events}
              empty="No events recorded in this window."
              // `toplance.document_uploaded` → `document uploaded`. The
              // prefix is a platform convention, not information.
              label={(key) => key.replace(/^toplance\./, "").replace(/_/g, " ")}
              className="capitalize"
            />
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}

/**
 * A ranked list with a bar behind each row.
 *
 * The bar is scaled to the largest row rather than to the total, because
 * the question these panels answer is "which is biggest", not "what
 * share of everything is this".
 */
function CountList({
  rows,
  empty,
  label,
  className,
}: {
  rows: TopCount[];
  empty: string;
  label: (key: string) => string;
  className?: string;
}) {
  if (rows.length === 0) return <p className="t-muted">{empty}</p>;

  const top = rows[0].count;

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-4">
            <span className={cn("t-body truncate", className)}>
              {label(row.key)}
            </span>
            <span className="num font-semibold">{row.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand-2"
              style={{ width: `${(row.count / top) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
