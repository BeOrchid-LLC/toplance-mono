"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/shared/data-table";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import {
  assignDemoRequest,
  updateDemoRequestStatus,
} from "@/app/[locale]/ops/enquiries/actions";
import type { DemoRequestRow, PlatformStaff } from "@/lib/data/demo-requests";
import type { EnquirySort } from "@/lib/domain/enquiry-table";
import type { SortDir } from "@/lib/domain/sorting";
import { useT, useLocale } from "@/components/locale-provider";
import { OPS_ENQUIRIES } from "@/lib/i18n/ops-enquiries";
import { formatDate, formatDateTime } from "@/lib/format/date";

/**
 * The row's selects are `NativeSelect`, the header's own control, at the
 * row's height rather than the header's — beside a 44px `size="sm"`
 * button a 36px select sat short of every neighbour.
 *
 * No `w-full` on the assignee select. In the content-sized table
 * (`ui/table.tsx`) the column asks its content how wide to be, and a
 * `w-full` control answers "100% of you", which resolves to nothing —
 * the flex row squeezed the select to a 34px chevron. Left to its own
 * width a native select asks for its widest option, which is the honest
 * claim. Honest, but not unbounded: its options are the staff roster,
 * labelled `fullName || email`, and one colleague whose label falls back
 * to a long address would widen the Assignee column on every pending
 * row, so it carries a ceiling at the call site below.
 */
const rowSelectClass = "h-[var(--row-h)]";

/**
 * The enquiries that have not become an agency yet.
 *
 * The status a row can be moved to is deliberately not the full enum.
 * `converted` is written only by `provisionTenantTx`, together with the
 * organisation it names, so the action refuses it — and an option that
 * is always refused is worse than no option at all. Converting is the
 * Provision button in the last column, which is the honest control for
 * it.
 */
const CHOOSABLE = ["new", "contacted", "scheduled", "declined"] as const;

const STATUS_VARIANT = {
  new: "brand" as const,
  contacted: "info" as const,
  scheduled: "warning" as const,
  converted: "success" as const,
  declined: "neutral" as const,
};

export function EnquiryTable({
  rows,
  staff,
  viewerId,
  sort,
  dir,
  total,
  unfilteredTotal,
  pagination,
  className,
}: {
  /** This page of enquiries: already filtered, sorted and sliced. */
  rows: DemoRequestRow[];
  /** Everyone the assignee picker may offer. */
  staff: PlatformStaff[];
  /** Who is reading, so "Assign to me" can skip the picker. */
  viewerId: string;
  sort: EnquirySort;
  dir: SortDir;
  total: number;
  unfilteredTotal: number;
  pagination: { page: number; pageCount: number; size: number };
  className?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  /**
   * Both writes are the same shape — post two fields, toast an error,
   * refresh — so they share one runner rather than two copies that can
   * drift in how they report a failure.
   */
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

  return (
    <DataTable
      numbered
      className={className}
      rows={rows}
      rowKey={(r) => r.id}
      locale={locale}
      total={total}
      unfilteredTotal={unfilteredTotal}
      label={t(OPS_ENQUIRIES.panel)}
      basePath="/ops/enquiries"
      sort={sort}
      dir={dir}
      pagination={pagination}
      toolbar={{
        placeholder: t(OPS_ENQUIRIES.searchPlaceholder),
        filters: [
          {
            param: "status",
            label: t(OPS_ENQUIRIES.head.status),
            options: [
              { value: "", label: t(OPS_ENQUIRIES.statusFilterAll) },
              // Every status, `converted` included: unlike the per-row
              // editor, filtering to the finished ones is a reasonable
              // question to ask of a queue.
              ...(["new", "contacted", "scheduled", "converted", "declined"] as const).map(
                (s) => ({ value: s, label: t(OPS_ENQUIRIES.status[s]) })
              ),
            ],
          },
          {
            param: "assignee",
            label: t(OPS_ENQUIRIES.head.assignee),
            options: [
              { value: "", label: t(OPS_ENQUIRIES.assigneeFilterAll) },
              // "Mine" and "Nobody" ahead of the roster: they are the two
              // questions this queue is actually opened to answer.
              { value: viewerId, label: t(OPS_ENQUIRIES.assigneeFilterMine) },
              { value: "nobody", label: t(OPS_ENQUIRIES.assigneeFilterNobody) },
              ...staff
                .filter((s) => s.id !== viewerId)
                .map((s) => ({ value: s.id, label: s.fullName || s.email })),
            ],
          },
        ],
      }}
      columns={[
        {
          id: "who",
          width: "w-[16%]",
          // An invited address carries its invitation token, so these
          // run to 50+ characters. `truncate` alone does not hold them:
          // the column sizes to its content, and a `whitespace-nowrap`
          // span's content is the whole address, so one enquiry pushed
          // this column to 624px. The floor is what lets the address
          // give that width back; see `DataColumn.floor`.
          floor: "min-w-[9rem]",
          label: t(OPS_ENQUIRIES.head.who),
          sort: "text",
          cell: (r) => (
            <>
              <span className="block truncate font-semibold" title={r.fullName}>
                {r.fullName}
              </span>
              <span className="t-muted block truncate" title={r.email}>
                {r.email}
              </span>
            </>
          ),
        },
        {
          id: "company",
          width: "w-[12%]",
          floor: "min-w-[7rem]",
          label: t(OPS_ENQUIRIES.head.company),
          sort: "text",
          cell: (r) => (
            <>
              <span className="block truncate" title={r.companyName ?? undefined}>
                {r.companyName}
              </span>
              <span className="t-muted block truncate" title={r.jobTitle ?? undefined}>
                {r.jobTitle}
              </span>
            </>
          ),
        },
        {
          id: "requested",
          width: "w-[13%]",
          label: t(OPS_ENQUIRIES.head.requested),
          sort: "date",
          className: "t-muted",
          // The page's default order, so it has to be on screen: a sort
          // nobody can see is one nobody can reverse. In UTC, the
          // helper's default, because this cell renders on the server
          // first and the browser's own zone would disagree on hydration.
          cell: (r) => formatDate(r.createdAt, locale),
        },
        {
          id: "preferred",
          width: "w-[14%]",
          label: t(OPS_ENQUIRIES.head.preferred),
          sort: "date",
          className: "t-muted",
          // The zone is stored beside the instant precisely so this reads
          // the requester's own wall clock — "14:00 GMT+1" — rather than a
          // UTC number the operator has to convert in their head. One
          // line: the GMT offset says what the IANA name under it used to.
          cell: (r) => (
            <span title={r.preferredTz}>
              {formatDateTime(r.preferredAt, locale, r.preferredTz)}
            </span>
          ),
        },
        {
          id: "status",
          width: "w-[10%]",
          label: t(OPS_ENQUIRIES.head.status),
          sort: "text",
          // A select on most rows and a pill on the converted ones, one
          // width for both — measured as the select, the wider of the two.
          pill: {
            labels: Object.values(OPS_ENQUIRIES.status).map((l) => t(l)),
            control: true,
          },
          cell: (r) =>
            r.status === "converted" ? (
              <Badge variant={STATUS_VARIANT.converted}>
                {t(OPS_ENQUIRIES.status.converted)}
              </Badge>
            ) : (
              <NativeSelect
                aria-label={t(OPS_ENQUIRIES.head.status)}
                className={rowSelectClass}
                value={r.status}
                disabled={pending}
                onChange={(e) =>
                  post(updateDemoRequestStatus, {
                    request_id: r.id,
                    status: e.currentTarget.value,
                  })
                }
              >
                {CHOOSABLE.map((s) => (
                  <option key={s} value={s}>
                    {t(OPS_ENQUIRIES.status[s])}
                  </option>
                ))}
              </NativeSelect>
            ),
        },
        {
          id: "assignee",
          width: "w-[16%]",
          label: t(OPS_ENQUIRIES.head.assignee),
          sort: "text",
          /**
           * A converted enquiry shows a name and no control: the work is
           * done, and the action refuses the write anyway — a picker
           * that always errors is worse than no picker.
           *
           * "Assign to me" sits beside the picker rather than replacing it,
           * because taking a row yourself is the common case and doing
           * it through a roster of colleagues is three interactions for
           * the one everybody wants.
           */
          cell: (r) =>
            r.status === "converted" ? (
              <span className="t-muted">
                {r.assigneeName ?? t(OPS_ENQUIRIES.unassigned)}
              </span>
            ) : (
              // Wraps, so the pair asks the column for the wider of the
              // two rather than both side by side: the table has to fit
              // a laptop without scrolling sideways (`ui/table.tsx`), and
              // on a wide screen they still sit on one line.
              <div className="flex flex-wrap items-center gap-2">
                <NativeSelect
                  aria-label={t(OPS_ENQUIRIES.head.assignee)}
                  // The ceiling on the roster's unbounded labels — see
                  // the `rowSelectClass` note. On the control itself
                  // rather than a wrapper: a select is not a table cell,
                  // so its `max-width` holds in every browser.
                  className={`${rowSelectClass} max-w-[240px]`}
                  value={r.assigneeId ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    post(assignDemoRequest, {
                      request_id: r.id,
                      assignee_id: e.currentTarget.value,
                    })
                  }
                >
                  <option value="">{t(OPS_ENQUIRIES.unassigned)}</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName || s.email}
                    </option>
                  ))}
                </NativeSelect>
                {r.assigneeId === null && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      post(assignDemoRequest, {
                        request_id: r.id,
                        assignee_id: viewerId,
                      })
                    }
                  >
                    {t(OPS_ENQUIRIES.claimButton)}
                  </Button>
                )}
              </div>
            ),
        },
        {
          id: "action",
          // No width hint — see the actions column in `support-table`.
          label: t(OPS_ENQUIRIES.head.action),
          align: "end",
          cell: (r) =>
            r.convertedOrgId ? (
              <Link
                href={`/ops/tenants/${r.convertedOrgId}`}
                className="font-semibold text-brand-text hover:underline"
              >
                {r.convertedOrgName}
              </Link>
            ) : (
              /* `sm`, which `ProvisionTenant`'s own prop documentation
                 has always said this call site passes — it did not, so
                 the button fell back to `bar` and rendered 36px beside
                 44px neighbours. */
              <ProvisionTenant demoRequest={r} size="sm" />
            ),
        },
      ]}
      empty={<p className="t-muted max-w-[62ch]">{t(OPS_ENQUIRIES.empty)}</p>}
    />
  );
}
