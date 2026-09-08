import type { Metadata } from "next";

import { NotificationsMenu } from "@/components/app/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import {
  OwnerAccessRefused,
  StaffAccessRefused,
  StaffEnrollmentRequired,
} from "@/components/ops/refusal";
import { DashboardTabs } from "@/components/ops/dashboard-tabs";
import { AdminShell } from "@/components/shared/admin-shell";
import { opsAdminNav } from "@/components/shared/admin-nav";
import { CounterRow, type Counter } from "@/components/shared/counter-row";
import { RevenueChart } from "@/components/ops/revenue-chart";
import { SetupNotice } from "@/components/shared/setup-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasDatabaseEnv } from "@/lib/db/client";
import { requireStaffConsole } from "@/lib/auth/staff-gate";
import { getOpsCounts } from "@/lib/data/ops-counts";
import { getNotifications, unreadNotificationCount } from "@/lib/notifications/notify";
import { track } from "@/lib/analytics/track";
import { dashboardData, USAGE_WINDOW_DAYS, type DashboardData } from "@/lib/data/dashboard";
import { countryFromIso2 } from "@/lib/domain/corridors";
import { formatMoney } from "@/lib/domain/pricing";
import type { ClientRow, TopCount } from "@/lib/domain/kpis";
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
export default async function OpsDashboardPage() {
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

  return (
    <AdminShell
      groups={opsAdminNav({ locale, ...counts, isOwner: true })}
      activeId="business"
      railTitle="Toplance"
      railSubtitle={account.subtitle}
      account={account}
      title={OPS_COMMON.nav.dashboard[locale]}
      lead="The state of the business — clients, revenue, the review desk and where demand is going."
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
            label: "Clients",
            value: data.totals.clients,
            sub: "organisations on the platform",
          },
          {
            label: "Seats bought",
            value: data.totals.seatsPurchased,
            sub: `${data.totals.applicants} applicants so far`,
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
        tabs={[
          { value: "overview", label: "Overview", panel: <Overview data={data} /> },
          { value: "clients", label: "Clients", panel: <Clients data={data} /> },
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

function Clients({ data }: { data: DashboardData }) {
  const currency = data.payments.currency;

  // Money per client, so the table can show what each one is worth
  // without a second pass over the invoice list per row.
  const billed = new Map<string, { billedMinor: number; paidMinor: number }>();
  for (const invoice of data.invoices) {
    const entry = billed.get(invoice.orgId) ?? { billedMinor: 0, paidMinor: 0 };
    if (invoice.status !== "draft") entry.billedMinor += invoice.amountMinor;
    if (invoice.status === "paid") entry.paidMinor += invoice.amountMinor;
    billed.set(invoice.orgId, entry);
  }

  // Clients with nothing at all are real rows (a client who bought seats
  // and used none is worth seeing) but there are a great many of them in
  // a pre-launch database, so the ones with activity come first and the
  // dormant tail is counted rather than listed.
  const active = data.clients.filter((c) => c.invited > 0 || c.applicants > 0);
  const dormant = data.clients.length - active.length;

  return (
    <Panel>
      <PanelHeader
        label="Every client, busiest first"
        aside={
          <Badge variant="brand">
            <span className="num">{data.clients.length}</span> clients
          </Badge>
        }
      />

      {active.length === 0 ? (
        <PanelBody>
          <p className="t-muted max-w-[62ch]">
            No client has invited anybody yet. A row appears here as soon as one
            sends its first invitation.
          </p>
        </PanelBody>
      ) : (
        /*
          A table rather than §6's ruled rows, for the queue page's
          reason and one of its own: this is read by scanning a money
          column down the page to find the client worth chasing, and
          column alignment is the whole affordance. Ruled rows put the
          same fact at a different horizontal position on every line.
        */
        <div className="overflow-x-auto px-2 pb-2">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[24%]">Client</TableHead>
                <TableHead className="w-[12%]">Seats</TableHead>
                <TableHead className="w-[14%]">Invited</TableHead>
                <TableHead className="w-[12%]">Applied</TableHead>
                <TableHead className="w-[12%]">Approved</TableHead>
                <TableHead className="w-[13%]">Billed</TableHead>
                <TableHead className="w-[13%]">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((client) => (
                <ClientTableRow
                  key={client.orgId}
                  client={client}
                  money={billed.get(client.orgId)}
                  currency={currency}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dormant > 0 && (
        <div className="border-t border-border px-5 py-3 sm:px-6">
          <p className="t-muted">
            <span className="num">{dormant}</span> further{" "}
            {dormant === 1 ? "client has" : "clients have"} an account but have
            not invited anybody yet.
          </p>
        </div>
      )}
    </Panel>
  );
}

function ClientTableRow({
  client,
  money,
  currency,
}: {
  client: ClientRow;
  money: { billedMinor: number; paidMinor: number } | undefined;
  currency: string;
}) {
  const billedMinor = money?.billedMinor ?? 0;
  const paidMinor = money?.paidMinor ?? 0;

  return (
    <TableRow>
      <TableCell>
        <span className="t-title block truncate">{client.name}</span>
        {/* One line about this client, and the one worth acting on wins:
            somebody stuck at 100% is a phone call, an approval rate is
            just a fact. A client with neither gets nothing rather than
            an em dash standing in for a number that does not exist. */}
        {client.stalled > 0 ? (
          <span className="special">{client.stalled} waiting to submit</span>
        ) : client.approvalRate !== null ? (
          <span className="special">{pct(client.approvalRate)} approved</span>
        ) : null}
      </TableCell>
      <TableCell>
        <span className="num block">{client.seatsPurchased}</span>
        {client.seatUtilisation !== null && (
          <span className="special">{pct(client.seatUtilisation)} used</span>
        )}
      </TableCell>
      <TableCell>
        <span className="num block">{client.invited}</span>
        {/* The gap between invited and accepted is the client's
            activation problem, so it is said under the figure rather
            than left for the reader to subtract. */}
        {client.invited > 0 && (
          <span className="special">{client.accepted} accepted</span>
        )}
      </TableCell>
      <TableCell>
        <span className="num block">{client.applicants}</span>
      </TableCell>
      <TableCell>
        <span className="num block">{client.approved}</span>
        {client.rejected > 0 && (
          <span className="special">{client.rejected} rejected</span>
        )}
      </TableCell>
      <TableCell>
        <span className="num block">{formatMoney(billedMinor, currency)}</span>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "num block",
            // Only worth a colour when there is a shortfall to chase.
            paidMinor < billedMinor && "text-warning-ink font-semibold"
          )}
        >
          {formatMoney(paidMinor, currency)}
        </span>
      </TableCell>
    </TableRow>
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
        <PanelBody className="space-y-4">
          {funnel.map((stage) => {
            // Width against the widest stage, which is always the first —
            // `funnelOf` counts each stage as reached-or-passed, so the
            // series cannot widen and a bar can never overflow.
            const share = funnel[0].count ? stage.count / funnel[0].count : 0;
            return (
              <div key={stage.key}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="t-body">{stage.label}</span>
                  <span className="num text-ink-2">
                    {stage.count}
                    {stage.ofPrevious !== null && (
                      <span className="special ms-2 inline">
                        {pct(stage.ofPrevious)} of previous
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(share * 100, share > 0 ? 1 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
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
