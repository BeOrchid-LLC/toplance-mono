"use client";

import Link from "next/link";

import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { AgencyRuleSetRow } from "@/lib/data/agency-rule-sets";
import { countryName, freshnessLabel } from "@/lib/domain/corridor-table";
import type { RuleSetSort } from "@/lib/domain/rule-set-table";
import type { SortDir } from "@/lib/domain/sorting";
import { AGENCY_RULE_SETS } from "@/lib/i18n/agency-rule-sets";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_CORRIDOR_REVIEW } from "@/lib/i18n/ops-corridor-review";
import { OPS_CORRIDORS } from "@/lib/i18n/ops-corridors";

/**
 * The routes an agency files on, as columns over the shared `DataTable`.
 *
 * A client module holding nothing but column definitions, for the reason
 * `CorridorsTable` gives: a column's `cell` is a function and the page
 * above is a server component, so only the rows on screen come down.
 *
 * It is deliberately *not* `CorridorsTable` with a flag. That table's
 * job is review — its state column exists so a reviewer can find the
 * pending drafts, and every row on it links into a screen with approve
 * and reject buttons. This one answers a different question: what is my
 * client being asked for, and what does it cost. The two share the
 * headings and the freshness label, which is the part that must not
 * drift; they do not share a purpose.
 */
export function RuleSetsTable({
  rows,
  locale,
  sort,
  dir,
  params,
  purposes,
  total,
  unfilteredTotal,
  filteredLabel,
  pagination,
}: {
  rows: AgencyRuleSetRow[];
  locale: Locale;
  sort: RuleSetSort;
  dir: SortDir;
  params: Record<string, string | undefined>;
  /** Every purpose present in this agency's own rows, so the filter offers only real ones. */
  purposes: AgencyRuleSetRow["purpose"][];
  total: number;
  unfilteredTotal: number;
  filteredLabel?: string;
  pagination: { page: number; pageCount: number; size: number };
}) {
  const columns: DataColumn<AgencyRuleSetRow>[] = [
    {
      id: "route",
      width: "w-[25%]",
      label: OPS_CORRIDORS.tableHead.route[locale],
      sortable: true,
      cell: (row) => {
        const route = `${countryName(row.nationalityIso)} → ${countryName(row.destinationIso)}`;
        return (
          <>
            <Link
              href={`/agency/rule-sets/${row.id}`}
              // The full pair is on the `title` and on the page this
              // links to, so an ellipsis here costs a reader nothing.
              // Wrapping cost them a row three times as tall.
              title={route}
              className="block truncate font-semibold text-brand-text hover:underline"
            >
              {route}
            </Link>
            <span className="t-muted block truncate" title={row.visaName}>
              {row.visaName}
            </span>
          </>
        );
      },
    },
    {
      id: "purpose",
      width: "w-[12%]",
      label: OPS_CORRIDORS.tableHead.purpose[locale],
      sortable: true,
      cell: (row) => OPS_COMMON.purpose[row.purpose][locale],
    },
    {
      id: "cases",
      width: "w-[9%]",
      label: AGENCY_RULE_SETS.tableHead.cases[locale],
      sortable: true,
      className: "num",
      cell: (row) => row.caseCount,
    },
    {
      id: "documents",
      width: "w-[11%]",
      label: OPS_CORRIDORS.tableHead.documents[locale],
      sortable: true,
      className: "num",
      cell: (row) => row.requirementCount,
    },
    {
      id: "fee",
      width: "w-[12%]",
      label: AGENCY_RULE_SETS.tableHead.fee[locale],
      cell: (row) =>
        row.governmentFeeMinor == null ? (
          <span className="t-muted">{OPS_CORRIDOR_REVIEW.notSet[locale]}</span>
        ) : (
          <span className="num">
            {row.governmentFeeCurrency ?? ""}{" "}
            {(row.governmentFeeMinor / 100).toFixed(2)}
          </span>
        ),
    },
    {
      id: "version",
      width: "w-[13%]",
      label: OPS_CORRIDORS.tableHead.version[locale],
      sortable: true,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="num">v{row.version}</span>
          {/* Live is worth saying because its absence is: a superseded
              version still built somebody's checklist, and a director
              comparing this page against the mission's own site needs to
              know which of the two they are reading. */}
          {row.isLive && <Badge variant="brand">{OPS_COMMON.live[locale]}</Badge>}
        </div>
      ),
    },
    {
      id: "checked",
      width: "w-[13%]",
      label: OPS_CORRIDORS.tableHead.lastChecked[locale],
      cell: (row) => {
        // The same verdict the platform console prints, from the same
        // function. An agency reading "Stale" here and a reviewer
        // reading "Checked" there would be looking at one row.
        const fresh = freshnessLabel(
          { ...row, reviewState: "approved", approvedAt: null, approverName: null },
          locale
        );
        return <span className={fresh.tone}>{fresh.text}</span>;
      },
    },
  ];

  return (
    <DataTable
      className="mt-6"
      rows={rows}
      rowKey={(row) => row.id}
      numbered
      columns={columns}
      label={AGENCY_RULE_SETS.panel[locale]}
      filteredLabel={filteredLabel}
      countLabel={AGENCY_RULE_SETS.routesWord[locale]}
      basePath="/agency/rule-sets"
      params={params}
      sort={sort}
      dir={dir}
      locale={locale}
      total={total}
      unfilteredTotal={unfilteredTotal}
      toolbar={{
        placeholder: AGENCY_RULE_SETS.searchPlaceholder[locale],
        filters: [
          {
            param: "purpose",
            label: OPS_CORRIDORS.anyPurpose[locale],
            options: purposes.map((p) => ({
              value: p,
              label: OPS_COMMON.purpose[p][locale],
            })),
          },
        ],
      }}
      pagination={pagination}
      empty={<p className="t-muted max-w-[62ch]">{AGENCY_RULE_SETS.empty[locale]}</p>}
    />
  );
}
