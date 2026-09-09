"use client";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import type { ClientRow } from "@/lib/domain/kpis";
import { formatMoney } from "@/lib/domain/pricing";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/** A rate as a whole percentage, or an em dash when there is nothing to divide. */
function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/** What one client has been billed and has actually paid, in minor units. */
export type ClientMoney = { billedMinor: number; paidMinor: number };

/**
 * Every client on the platform, busiest first, as columns over the
 * shared `DataTable`.
 *
 * A table rather than §6's ruled rows, for the queue page's reason and
 * one of its own: this is read by scanning a money column down the page
 * to find the client worth chasing, and column alignment is the whole
 * affordance. Ruled rows put the same fact at a different horizontal
 * position on every line.
 *
 * It was that table already, built by hand inside the dashboard — its
 * own panel, header, badge, overflow wrapper and column widths, none of
 * which was different from what `DataTable` does for `/ops/tenants` and
 * `/ops/corridors`. Moved onto the shared component on 2026-09-08 at the
 * client's request, which leaves this file holding the only part that
 * was ever actually particular to it: the columns.
 *
 * No toolbar, no sort links, no pager. The rows arrive ordered by the
 * dashboard's single query pass, and every tab on that screen is built
 * from it — a sort that wrote `?sort=` into the URL would reload all
 * four.
 */
export function ClientsTable({
  rows,
  money,
  currency,
  locale,
  totalClients,
  dormant,
  params,
  sort,
  dir,
  total,
  unfilteredTotal,
  pagination,
  filteredLabel,
  searchPlaceholder,
}: {
  /** The clients with activity. The dormant tail is counted, not listed. */
  rows: ClientRow[];
  /** Billed and paid per `orgId`, so no row makes a second pass over the invoices. */
  money: Record<string, ClientMoney>;
  currency: string;
  locale: Locale;
  /** Every client, dormant ones included — the badge's figure. */
  totalClients: number;
  dormant: number;
  params?: Record<string, string | undefined>;
  sort?: string;
  dir?: "asc" | "desc";
  total?: number;
  unfilteredTotal?: number;
  pagination?: { page: number; pageCount: number; size: number };
  filteredLabel?: string;
  searchPlaceholder?: string;
}) {
  const columns: DataColumn<ClientRow>[] = [
    {
      id: "client",
      label: "Client",
      className: "w-[24%]",
      cell: (client) => (
        <>
          <span className="t-title block truncate">{client.name}</span>
          {/* One line about this client, and the one worth acting on
              wins: somebody stuck at 100% is a phone call, an approval
              rate is just a fact. A client with neither gets nothing
              rather than an em dash standing in for a number that does
              not exist. */}
          {client.stalled > 0 ? (
            <span className="special">{client.stalled} waiting to submit</span>
          ) : client.approvalRate !== null ? (
            <span className="special">{pct(client.approvalRate)} approved</span>
          ) : null}
        </>
      ),
    },
    {
      id: "seats",
      label: "Seats",
      className: "w-[12%]",
      cell: (client) => (
        <>
          <span className="num block">{client.seatsPurchased}</span>
          {client.seatUtilisation !== null && (
            <span className="special">{pct(client.seatUtilisation)} used</span>
          )}
        </>
      ),
    },
    {
      id: "invited",
      label: "Invited",
      className: "w-[14%]",
      cell: (client) => (
        <>
          <span className="num block">{client.invited}</span>
          {/* The gap between invited and accepted is the client's
              activation problem, so it is said under the figure rather
              than left for the reader to subtract. */}
          {client.invited > 0 && (
            <span className="special">{client.accepted} accepted</span>
          )}
        </>
      ),
    },
    {
      id: "applied",
      label: "Applied",
      className: "w-[12%]",
      cell: (client) => <span className="num block">{client.applicants}</span>,
    },
    {
      id: "approved",
      label: "Approved",
      className: "w-[12%]",
      cell: (client) => (
        <>
          <span className="num block">{client.approved}</span>
          {client.rejected > 0 && (
            <span className="special">{client.rejected} rejected</span>
          )}
        </>
      ),
    },
    {
      id: "billed",
      label: "Billed",
      className: "w-[13%]",
      cell: (client) => (
        <span className="num block">
          {formatMoney(money[client.orgId]?.billedMinor ?? 0, currency)}
        </span>
      ),
    },
    {
      id: "paid",
      label: "Paid",
      className: "w-[13%]",
      cell: (client) => {
        const billedMinor = money[client.orgId]?.billedMinor ?? 0;
        const paidMinor = money[client.orgId]?.paidMinor ?? 0;
        return (
          <span
            className={cn(
              "num block",
              // Only worth a colour when there is a shortfall to chase.
              paidMinor < billedMinor && "text-warning-ink font-semibold"
            )}
          >
            {formatMoney(paidMinor, currency)}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      rows={rows}
      rowKey={(client) => client.orgId}
      numbered
      columns={columns}
      label="Every agency, busiest first"
      filteredLabel={filteredLabel}
      count={totalClients}
      countLabel="agencies"
      locale={locale}
      total={total ?? rows.length}
      unfilteredTotal={unfilteredTotal ?? rows.length}
      basePath="/ops/dashboard"
      params={params}
      sort={sort}
      dir={dir}
      pagination={pagination}
      toolbar={
        searchPlaceholder ? { placeholder: searchPlaceholder, filters: [] } : undefined
      }
      empty={
        <p className="t-muted max-w-[62ch]">
          No agency has invited anybody yet. A row appears here as soon as one
          sends its first invitation.
        </p>
      }
      footer={
        dormant > 0 ? (
          <p className="t-muted">
            <span className="num">{dormant}</span> further{" "}
            {dormant === 1 ? "client has" : "clients have"} an account but have
            not invited anybody yet.
          </p>
        ) : undefined
      }
    />
  );
}
