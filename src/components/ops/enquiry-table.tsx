"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/**
 * Matches `Input`, which has no `<select>` sibling in the design
 * system — copied from `src/components/site/demo-dialog.tsx` rather
 * than imported from it.
 */
const inputClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

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
  params,
  total,
  unfilteredTotal,
  filteredLabel,
  pagination,
  className,
}: {
  /** This page of enquiries: already filtered, sorted and sliced. */
  rows: DemoRequestRow[];
  /** Everyone the assignee picker may offer. */
  staff: PlatformStaff[];
  /** Who is reading, so "Claim" can assign to them without a picker. */
  viewerId: string;
  sort: EnquirySort;
  dir: SortDir;
  params: Record<string, string | undefined>;
  total: number;
  unfilteredTotal: number;
  filteredLabel?: string;
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
      className={className}
      rows={rows}
      rowKey={(r) => r.id}
      locale={locale}
      total={total}
      unfilteredTotal={unfilteredTotal}
      label={t(OPS_ENQUIRIES.panel)}
      filteredLabel={filteredLabel}
      countLabel=""
      basePath="/ops/enquiries"
      params={params}
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
          label: t(OPS_ENQUIRIES.head.who),
          sortable: true,
          cell: (r) => (
            <>
              <span className="font-semibold">{r.fullName}</span>
              <span className="t-muted block">{r.email}</span>
            </>
          ),
        },
        {
          id: "company",
          label: t(OPS_ENQUIRIES.head.company),
          sortable: true,
          cell: (r) => (
            <>
              {r.companyName}
              <span className="t-muted block">{r.jobTitle}</span>
            </>
          ),
        },
        {
          id: "preferred",
          label: t(OPS_ENQUIRIES.head.preferred),
          sortable: true,
          className: "t-muted",
          cell: (r) => (
            <>
              {/* The zone is stored beside the instant precisely so this
                  reads "14:00 WAT" rather than a UTC number the operator
                  has to convert in their head. */}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: r.preferredTz,
              }).format(r.preferredAt)}
              <span className="block">{r.preferredTz}</span>
            </>
          ),
        },
        {
          id: "status",
          label: t(OPS_ENQUIRIES.head.status),
          sortable: true,
          cell: (r) =>
            r.status === "converted" ? (
              <Badge variant={STATUS_VARIANT.converted}>
                {t(OPS_ENQUIRIES.status.converted)}
              </Badge>
            ) : (
              <select
                aria-label={t(OPS_ENQUIRIES.head.status)}
                className={inputClass}
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
              </select>
            ),
        },
        {
          id: "assignee",
          label: t(OPS_ENQUIRIES.head.assignee),
          sortable: true,
          /**
           * A converted enquiry shows a name and no control: the work is
           * done, and the action refuses the write anyway — a picker
           * that always errors is worse than no picker.
           *
           * "Claim" sits beside the picker rather than replacing it,
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
              <div className="flex items-center gap-2">
                <select
                  aria-label={t(OPS_ENQUIRIES.head.assignee)}
                  className={inputClass}
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
                </select>
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
              <ProvisionTenant demoRequest={r} />
            ),
        },
      ]}
      empty={<p className="t-muted max-w-[62ch]">{t(OPS_ENQUIRIES.empty)}</p>}
    />
  );
}
