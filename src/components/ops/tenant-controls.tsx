"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { DataTable } from "@/components/shared/data-table";
import {
  restoreTenant,
  suspendTenant,
  updateMemberRole,
  updateTenantBilling,
} from "@/app/[locale]/ops/tenants/actions";
import type { TenantDetail } from "@/lib/data/tenants";
import { useLocale, useT } from "@/components/locale-provider";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/**
 * Everything ops can change about one agency.
 *
 * The confirmation for suspension is the sentence above the button, not
 * a second dialog — the stance `CorridorDecision` takes. What makes
 * suspension weighty is not that it is hard to undo (it is one click
 * back) but that it is immediate and total: every one of that agency's
 * people stops being able to open any case the moment it commits. That
 * is worth saying in words rather than behind an "Are you sure?".
 */
export function TenantControls({ tenant }: { tenant: TenantDetail }) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  /** Every control here posts the same way; only the action differs. */
  function run(
    action: (fd: FormData) => Promise<{ ok: true } | { error: string }>,
    formData: FormData,
    success: string
  ) {
    startTransition(async () => {
      const result = await action(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(success);
      router.refresh();
    });
  }

  function changeRole(userId: string, role: "owner" | "reviewer") {
    const formData = new FormData();
    formData.set("org_id", tenant.id);
    formData.set("user_id", userId);
    formData.set("role", role);
    run(updateMemberRole, formData, t(OPS_TENANTS.toastRoleChanged));
  }

  function saveBilling(formData: FormData) {
    formData.set("org_id", tenant.id);
    run(updateTenantBilling, formData, t(OPS_TENANTS.toastBillingSaved));
  }

  function changeAccess(suspend: boolean) {
    const formData = new FormData();
    formData.set("org_id", tenant.id);
    run(
      suspend ? suspendTenant : restoreTenant,
      formData,
      suspend ? t(OPS_TENANTS.toastSuspended) : t(OPS_TENANTS.toastRestored)
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <DataTable
        rows={tenant.members_}
        rowKey={(m) => m.userId}
        locale={locale}
        total={tenant.members_.length}
        unfilteredTotal={tenant.members_.length}
        label={t(OPS_TENANTS.rosterPanel)}
        countLabel=""
        columns={[
          {
            id: "person",
            label: t(OPS_TENANTS.rosterHead.person),
            cell: (m) => (
              <>
                <span className="font-semibold">{m.fullName}</span>
                <span className="t-muted block">{m.email}</span>
              </>
            ),
          },
          {
            id: "role",
            label: t(OPS_TENANTS.rosterHead.role),
            cell: (m) => (
              <Badge variant={m.role === "owner" ? "brand" : "neutral"}>
                {m.role === "owner" ? t(OPS_TENANTS.roleOwner) : t(OPS_TENANTS.roleReviewer)}
              </Badge>
            ),
          },
          {
            id: "joined",
            label: t(OPS_TENANTS.rosterHead.joined),
            className: "t-muted",
            cell: (m) => m.joinedAt.toISOString().slice(0, 10),
          },
          {
            id: "action",
            label: t(OPS_TENANTS.rosterHead.action),
            cell: (m) => (
              <Button
                variant="tertiary"
                disabled={pending}
                onClick={() =>
                  changeRole(m.userId, m.role === "owner" ? "reviewer" : "owner")
                }
              >
                {m.role === "owner"
                  ? t(OPS_TENANTS.demoteButton)
                  : t(OPS_TENANTS.promoteButton)}
              </Button>
            ),
          },
        ]}
        empty={
          /* Not an error state. A freshly provisioned agency sits here
             until its first person accepts, and saying so stops an
             operator re-provisioning it. */
          <p className="t-muted max-w-[62ch]">{t(OPS_TENANTS.awaitingFirstOwner)}</p>
        }
      />

      <Panel>
        <PanelHeader label={t(OPS_TENANTS.billingPanel)} />
        <PanelBody>
          <form action={saveBilling} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seats">{t(OPS_TENANTS.fieldSeats)}</Label>
              <Input
                id="seats"
                name="seats"
                type="number"
                min={0}
                defaultValue={tenant.seatsPurchased}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing_contact">{t(OPS_TENANTS.fieldBillingContact)}</Label>
              <Input
                id="billing_contact"
                name="billing_contact"
                type="email"
                defaultValue={tenant.billingContact ?? ""}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {t(OPS_TENANTS.saveBillingButton)}
            </Button>
          </form>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader label={t(OPS_TENANTS.dangerPanel)} />
        <PanelBody className="flex flex-col gap-4">
          <p className="t-muted max-w-[62ch]">
            {tenant.suspendedAt
              ? t(OPS_TENANTS.restoreNotice)
              : t(OPS_TENANTS.suspendNotice)}
          </p>
          {tenant.suspendedAt ? (
            <Button
              className="self-start"
              disabled={pending}
              onClick={() => changeAccess(false)}
            >
              <RotateCcw /> {t(OPS_TENANTS.restoreButton)}
            </Button>
          ) : (
            <Button
              variant="danger"
              className="self-start"
              disabled={pending}
              onClick={() => changeAccess(true)}
            >
              <Ban /> {t(OPS_TENANTS.suspendButton)}
            </Button>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
