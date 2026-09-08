"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ProvisionTenant } from "@/components/ops/provision-tenant";
import { updateDemoRequestStatus } from "@/app/[locale]/ops/tenants/actions";
import type { DemoRequestRow } from "@/lib/data/demo-requests";
import { useT, useLocale } from "@/components/locale-provider";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

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

export function DemoRequestQueue({
  requests,
  className,
}: {
  requests: DemoRequestRow[];
  className?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function changeStatus(requestId: string, status: string) {
    const formData = new FormData();
    formData.set("request_id", requestId);
    formData.set("status", status);

    startTransition(async () => {
      const result = await updateDemoRequestStatus(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <DataTable
      className={className}
      rows={requests}
      rowKey={(r) => r.id}
      locale={locale}
      total={requests.length}
      unfilteredTotal={requests.length}
      label={t(OPS_TENANTS.demoPanel)}
      countLabel=""
      columns={[
        {
          id: "who",
          label: t(OPS_TENANTS.demoHead.who),
          cell: (r) => (
            <>
              <span className="font-semibold">{r.fullName}</span>
              <span className="t-muted block">{r.email}</span>
            </>
          ),
        },
        {
          id: "company",
          label: t(OPS_TENANTS.demoHead.company),
          cell: (r) => (
            <>
              {r.companyName}
              <span className="t-muted block">{r.jobTitle}</span>
            </>
          ),
        },
        {
          id: "preferred",
          label: t(OPS_TENANTS.demoHead.preferred),
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
          label: t(OPS_TENANTS.demoHead.status),
          cell: (r) =>
            r.status === "converted" ? (
              <Badge variant={STATUS_VARIANT.converted}>
                {t(OPS_TENANTS.demoStatus.converted)}
              </Badge>
            ) : (
              <select
                aria-label={t(OPS_TENANTS.demoHead.status)}
                className={inputClass}
                value={r.status}
                disabled={pending}
                onChange={(e) => changeStatus(r.id, e.currentTarget.value)}
              >
                {CHOOSABLE.map((s) => (
                  <option key={s} value={s}>
                    {t(OPS_TENANTS.demoStatus[s])}
                  </option>
                ))}
              </select>
            ),
        },
        {
          id: "action",
          label: t(OPS_TENANTS.demoHead.action),
          cell: (r) =>
            r.convertedOrgId ? (
              <Link
                href={`/ops/tenants/${r.convertedOrgId}`}
                className="font-semibold text-brand-text hover:underline"
              >
                {r.convertedOrgName}
              </Link>
            ) : (
              <ProvisionTenant demoRequest={r} size="sm" />
            ),
        },
      ]}
      empty={<p className="t-muted max-w-[62ch]">{t(OPS_TENANTS.emptyDemoRequests)}</p>}
    />
  );
}
