"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { AssigneeSelect } from "@/components/shared/assignee-select";
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
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";
import { fill } from "@/lib/i18n/fill";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { shortName } from "@/lib/format/name";

/**
 * The status select is `NativeSelect`, the header's own control, at the
 * row's height rather than the header's — beside a 44px row control a
 * 36px select sat short of every neighbour. The assignee select takes
 * the same height from `AssigneeSelect`.
 */
const rowSelectClass = "h-[var(--row-h)]";

/**
 * The enquiries that have not become an agency yet.
 *
 * The status a row can be moved to is deliberately not the full enum.
 * `converted` is written only by `provisionTenantTx`, together with the
 * organisation it names, so the action refuses it — and an option that
 * is always refused is worse than no option at all. Converting is
 * "Create agency" in the row's menu, which is the honest control for
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
  viewerIsOwner,
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
  /** Who is reading, whom "Assign to me" names. */
  viewerId: string;
  /**
   * Whether the reader may assign a row to somebody else — an ops owner
   * (D6, pending the client's confirmation). Mirrors the check
   * `setDemoRequestAssignee` makes; it is not the check.
   */
  viewerIsOwner: boolean;
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
   * The enquiry the Create agency dialog is for. Kept when the dialog
   * closes rather than cleared with it, so the form keeps its pre-filled
   * values while the close animation is still on screen.
   */
  const [provisioning, setProvisioning] = React.useState<DemoRequestRow | null>(null);
  const [provisionOpen, setProvisionOpen] = React.useState(false);
  /** Set by the menu item, so the menu does not refocus its kebab under the dialog. */
  const openingDialog = React.useRef(false);
  /** The kebab that opened the dialog, which takes focus back when it closes. */
  const lastKebab = React.useRef<HTMLButtonElement | null>(null);

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
    <>
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
            floor: "min-w-[7.5rem]",
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
            floor: "min-w-[6rem]",
            label: t(OPS_ENQUIRIES.head.company),
            sort: "text",
            // The company is the way to the agency it became, once it
            // became one — the link that used to fill a column of its own
            // at the end of the row, folded in here at the client's request
            // on 17 September so the table could lose its sideways scroll.
            // The support queue's agency link, copied.
            cell: (r) => (
              <>
                {r.convertedOrgId ? (
                  <Link
                    href={`/ops/tenants/${r.convertedOrgId}`}
                    title={r.convertedOrgName ?? r.companyName ?? undefined}
                    className="block truncate font-semibold text-brand-text hover:underline"
                  >
                    {r.companyName || r.convertedOrgName}
                  </Link>
                ) : (
                  <span className="block truncate" title={r.companyName ?? undefined}>
                    {r.companyName}
                  </span>
                )}
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
            label: t(OPS_ENQUIRIES.head.assignee),
            sort: "text",
            /**
             * One short dropdown until the enquiry is converted — Unassigned,
             * Assign to me, and the colleagues this reader may name (an
             * owner's, D6) — then the name of whoever converted it, as
             * text. The client's review of 17 September: the dropdown stays
             * so a director can reassign while a handler is away, and goes
             * once the agency is fully onboarded, "carrying the name of the
             * last person who worked on that task". `provisionTenantTx`
             * makes the converter the assignee, so that name is this row's.
             */
            cell: (r) => {
              const holder = r.assigneeId
                ? { id: r.assigneeId, fullName: r.assigneeName ?? "", email: r.assigneeEmail ?? "" }
                : null;

              if (r.status === "converted") {
                return holder ? (
                  <span className="t-muted block truncate" title={holder.fullName || holder.email}>
                    {shortName(holder.fullName, holder.email) || "—"}
                  </span>
                ) : (
                  // Converted before anybody recorded who did it, by an
                  // operator whose profile is gone: a dash, never
                  // "Unassigned" — somebody did the work.
                  <span className="t-muted">—</span>
                );
              }

              return (
                <AssigneeSelect
                  label={t(OPS_ENQUIRIES.head.assignee)}
                  value={r.assigneeId}
                  current={holder}
                  viewerId={viewerId}
                  people={staff}
                  canAssignOthers={viewerIsOwner}
                  disabled={pending}
                  onChange={(next) =>
                    post(assignDemoRequest, {
                      request_id: r.id,
                      assignee_id: next ?? "",
                    })
                  }
                />
              );
            },
          },
          {
            id: "actions",
            label: t(OPS_ENQUIRIES.head.actions),
            labelHidden: true,
            align: "end",
            // Tight padding: the column is one 44px button, and every pixel
            // it does not spend is one the text columns can have.
            className: "px-2",
            /**
             * "Create agency" behind a kebab rather than as a button in the
             * row — the client's review of 17 September, to take the table
             * off its sideways scroll. Converting adds an agency and takes
             * nothing away, so it commits through its own form rather than
             * a confirmation (AGENTS.md).
             *
             * No menu on a converted row: its one item would be refused,
             * and the company cell is already the way to the agency.
             */
            cell: (r) =>
              r.status === "converted" ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="icon"
                      aria-label={fill(t(OPS_ENQUIRIES.rowActions), {
                        name: r.companyName || r.fullName || r.email,
                      })}
                      onPointerDown={(e) => {
                        lastKebab.current = e.currentTarget;
                      }}
                      onKeyDown={(e) => {
                        lastKebab.current = e.currentTarget;
                      }}
                    >
                      <MoreVertical aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    // The dialog is about to take focus; handing it back to
                    // the kebab first would only have it taken away again.
                    onCloseAutoFocus={(e) => {
                      if (openingDialog.current) {
                        openingDialog.current = false;
                        e.preventDefault();
                      }
                    }}
                  >
                    <DropdownMenuItem
                      onSelect={() => {
                        openingDialog.current = true;
                        setProvisioning(r);
                        setProvisionOpen(true);
                      }}
                    >
                      <Building2 aria-hidden /> {t(OPS_TENANTS.provisionButton)}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
          },
        ]}
        empty={<p className="t-muted max-w-[62ch]">{t(OPS_ENQUIRIES.empty)}</p>}
      />

      {/* One dialog for the whole table, outside every row. A row's menu
          only opens it: provisioning converts that row, the row
          re-renders without its menu, and a dialog mounted inside it
          would go with it — taking the one-time invitation link along.
          See the deferred refresh in `ProvisionTenant`. */}
      {provisioning && (
        <ProvisionTenant
          demoRequest={provisioning}
          open={provisionOpen}
          onOpenChange={setProvisionOpen}
          onCloseAutoFocus={(e) => {
            // Back to the kebab that opened it. Radix would otherwise aim
            // at the menu item focused when the dialog mounted, which is
            // gone. A row converted since is still on screen here — the
            // refresh that removes its menu waits for this close.
            e.preventDefault();
            lastKebab.current?.focus();
          }}
        />
      )}
    </>
  );
}
