"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/shared/data-table";
import { claimSupport, resolveSupport } from "@/app/[locale]/ops/support/actions";
import type { SupportRequestRow } from "@/lib/data/support";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";

/**
 * The support queue.
 *
 * Neither control confirms. Claiming puts a name on a row and resolving
 * closes a thread the operator has just answered — per AGENTS.md a
 * control is destructive when committing it removes access, deletes
 * data, or stops work somebody else is mid-way through, and neither of
 * these does any of that. Nothing here is ever deleted; resolving
 * stamps a date, and the row stays as the record of the dispute.
 *
 * Handing a row back is offered only to whoever holds it. Anyone *may*
 * take a row from anyone — the assignee is a label rather than a lock,
 * exactly as on the demo queue — but a "hand back" on somebody else's
 * row would read as taking their work away rather than putting yours
 * down.
 */
const STATE_LABEL = {
  open: OPS_SUPPORT.stateOpen,
  claimed: OPS_SUPPORT.stateClaimed,
  resolved: OPS_SUPPORT.stateResolved,
} as const;

const STATE_VARIANT = {
  open: "warning" as const,
  claimed: "brand" as const,
  resolved: "success" as const,
};

export function SupportTable({
  rows,
  locale,
  viewerId,
  className,
  params,
  total,
  unfilteredTotal,
  pagination,
  filteredLabel,
}: {
  rows: SupportRequestRow[];
  locale: Locale;
  /** Who is looking, so the queue can offer "hand back" on their own rows. */
  viewerId: string;
  className?: string;
  params?: Record<string, string | undefined>;
  total?: number;
  unfilteredTotal?: number;
  pagination?: { page: number; pageCount: number; size: number };
  filteredLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  /** Both writes post one field, toast a failure and refresh. */
  function post(
    action: (formData: FormData) => Promise<{ error?: string } | { ok: true }>,
    fields: Record<string, string>
  ) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);

    startTransition(async () => {
      const result = await action(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const columns: DataColumn<SupportRequestRow>[] = [
    {
      id: "agency",
      width: "w-[16%]",
      ceiling: "max-w-[220px]",
      label: OPS_SUPPORT.tableHead.agency[locale],
      cell: (r) => (
        <Link
          href={`/ops/tenants/${r.orgId}`}
          title={r.orgName ?? undefined}
          className="block truncate font-semibold text-brand-text hover:underline"
        >
          {r.orgName ?? "—"}
        </Link>
      ),
    },
    {
      id: "subject",
      width: "w-[26%]",
      ceiling: "max-w-[340px]",
      label: OPS_SUPPORT.tableHead.subject[locale],
      cell: (r) => (
        <>
          {/* The subject is the way into the conversation. The agency
              name beside it goes to the tenant, which is where somebody
              clicking it landed before this page existed — and was the
              wrong place to end up when what they wanted was the
              request. */}
          <Link
            href={`/ops/support/${r.id}`}
            title={r.subject}
            className="t-title block truncate font-semibold text-brand-text hover:underline"
          >
            {r.subject}
          </Link>
          {/* Still the body in full. A dispute is usually three
              sentences, and an operator scanning the queue for the one
              they can answer should not have to open each row to find
              out what it says. The thread page is for replying, not for
              discovering what was asked. */}
          <span className="t-muted mt-1 block max-w-[74ch] whitespace-pre-wrap">
            {r.body}
          </span>
          {r.raisedByName && <span className="t-muted mt-1 block">— {r.raisedByName}</span>}
        </>
      ),
    },
    {
      id: "raised",
      width: "w-[12%]",
      label: OPS_SUPPORT.tableHead.raised[locale],
      className: "t-muted",
      cell: (r) => r.createdAt.toISOString().slice(0, 10),
    },
    {
      id: "state",
      width: "w-[12%]",
      label: OPS_SUPPORT.tableHead.state[locale],
      cell: (r) => (
        <Badge variant={STATE_VARIANT[r.state]}>{STATE_LABEL[r.state][locale]}</Badge>
      ),
    },
    {
      id: "assignee",
      width: "w-[14%]",
      label: OPS_SUPPORT.tableHead.assignee[locale],
      className: "t-muted",
      cell: (r) => r.assigneeName ?? OPS_SUPPORT.unassigned[locale],
    },
    {
      id: "actions",
      // No width hint: this cell is three buttons that cannot shrink or
      // wrap, so it takes what they measure and the rest of the table
      // shares what is left. Giving it 15% is what put them on top of
      // the Status and Assignee cells — see `ui/table.tsx`.
      label: OPS_SUPPORT.tableHead.actions[locale],
      labelHidden: true,
      // Start-aligned, unlike the other action columns, because this is
      // the one whose set changes per row: a resolved request keeps only
      // Chat, and end-aligned that lone button sat at the far edge, out
      // of line with the Chat that leads every other row. Chat is always
      // first, so anchoring the column at its start edge lines them up.
      cell: (r) => (
        <div className="flex gap-2">
          {/* Always first, and always present — including on a resolved
              request, where every other control is hidden and the row
              would otherwise have no way into the conversation at all.
              The subject is a link too, but a link styled as a title in
              a row whose other affordances are buttons is not somewhere
              anybody looks. */}
          <Button asChild variant="neutral" size="sm">
            <Link href={`/ops/support/${r.id}`}>
              <MessagesSquare className="size-4" aria-hidden />
              {OPS_SUPPORT.chatAction[locale]}
            </Link>
          </Button>
          {r.state !== "resolved" && (
            <Button
              type="button"
              variant="neutral"
              size="sm"
              disabled={pending}
              onClick={() =>
                post(claimSupport, {
                  request_id: r.id,
                  release: r.assigneeId === viewerId ? "1" : "",
                })
              }
            >
              {r.assigneeId === viewerId
                ? OPS_SUPPORT.release[locale]
                : OPS_SUPPORT.claim[locale]}
            </Button>
          )}
          {r.state !== "resolved" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pending}
              onClick={() => post(resolveSupport, { request_id: r.id })}
            >
              {OPS_SUPPORT.resolve[locale]}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      className={className}
      rows={rows}
      rowKey={(r) => r.id}
      numbered
      columns={columns}
      locale={locale}
      label={OPS_SUPPORT.panel[locale]}
      filteredLabel={filteredLabel}
      countLabel={OPS_SUPPORT.requestsWord[locale]}
      total={total ?? rows.length}
      unfilteredTotal={unfilteredTotal ?? rows.length}
      basePath="/ops/support"
      params={params}
      pagination={pagination}
      toolbar={{
        placeholder: OPS_SUPPORT.searchPlaceholder[locale],
        filters: [
          {
            param: "state",
            label: OPS_SUPPORT.anyState[locale],
            options: [
              { value: "open", label: OPS_SUPPORT.stateOpen[locale] },
              { value: "claimed", label: OPS_SUPPORT.stateClaimed[locale] },
              { value: "resolved", label: OPS_SUPPORT.stateResolved[locale] },
            ],
          },
        ],
      }}
      empty={<p className="t-muted max-w-[62ch]">{OPS_SUPPORT.empty[locale]}</p>}
    />
  );
}
