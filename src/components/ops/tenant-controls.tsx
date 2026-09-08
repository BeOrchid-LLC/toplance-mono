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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  restoreTenant,
  suspendTenant,
  updateMemberRole,
  updateTenantBilling,
} from "@/app/[locale]/ops/tenants/actions";
import type { TenantDetail } from "@/lib/data/tenants";
import { useLocale, useT } from "@/components/locale-provider";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/**
 * Everything ops can change about one agency.
 *
 * Suspension asks before it commits. This file used to argue the other
 * way — that the sentence above the button was the confirmation, the
 * stance `CorridorDecision` still takes, because what makes suspension
 * weighty is not that it is hard to undo (it is one click back) but
 * that it is immediate and total. The client asked for a dialog and
 * that is the call taken; the argument is recorded here rather than
 * deleted, because it was not wrong about *why* suspension is weighty.
 * The dialog inherited that reasoning instead of overruling it: it
 * states the immediacy in the present tense at the moment of clicking
 * rather than asking a bare "Are you sure?".
 *
 * The general rule this now follows is in `AGENTS.md` — destructive
 * controls confirm — and `CorridorDecision` is deliberately outside it.
 * Approving a corridor publishes something; it takes nothing away.
 */
export function TenantControls({ tenant }: { tenant: TenantDetail }) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirmingSuspend, setConfirmingSuspend] = React.useState(false);
  /**
   * The member being demoted, or `null`. Promotion hands capability
   * over and needs no dialog, so only one direction of this toggle is
   * gated — and the dialog has to name the person, because the button
   * that opened it is one of many identical ones down a table.
   */
  const [demoting, setDemoting] = React.useState<TenantDetail["members_"][number] | null>(
    null
  );

  /** Every control here posts the same way; only the action differs. */
  function run(
    action: (fd: FormData) => Promise<{ ok: true } | { error: string }>,
    formData: FormData,
    success: string,
    /** Runs only when the action came back `ok` — see `changeAccess`. */
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      const result = await action(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(success);
      onSuccess?.();
      router.refresh();
    });
  }

  function changeRole(userId: string, role: "owner" | "reviewer") {
    const formData = new FormData();
    formData.set("org_id", tenant.id);
    formData.set("user_id", userId);
    formData.set("role", role);
    run(updateMemberRole, formData, t(OPS_TENANTS.toastRoleChanged), () =>
      setDemoting(null)
    );
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
      suspend ? t(OPS_TENANTS.toastSuspended) : t(OPS_TENANTS.toastRestored),
      // Only on success. A failed suspend leaves the dialog standing so
      // the operator reads the error against the question they asked,
      // rather than watching it close and having to work out from a
      // toast whether the agency is suspended or not.
      () => setConfirmingSuspend(false)
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
                  m.role === "owner"
                    ? setDemoting(m)
                    : changeRole(m.userId, "owner")
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

      <ConfirmDialog
        open={demoting !== null}
        onOpenChange={(next) => {
          if (!next) setDemoting(null);
        }}
        title={t(OPS_TENANTS.demoteConfirmTitle).replace(
          "{name}",
          demoting?.fullName ?? ""
        )}
        body={t(OPS_TENANTS.demoteConfirmBody)}
        confirmLabel={t(OPS_TENANTS.demoteButton)}
        cancelLabel={t(OPS_COMMON.cancel)}
        pending={pending}
        onConfirm={() => demoting && changeRole(demoting.userId, "reviewer")}
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
            /* Restoring is the undo, not the destructive half. It gives
               access back, so it commits on the click — putting a
               confirmation in front of the way out of a suspension
               would make the recovery harder than the mistake. */
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
              onClick={() => setConfirmingSuspend(true)}
            >
              <Ban /> {t(OPS_TENANTS.suspendButton)}
            </Button>
          )}

          <ConfirmDialog
            open={confirmingSuspend}
            onOpenChange={setConfirmingSuspend}
            title={t(OPS_TENANTS.suspendConfirmTitle).replace("{name}", tenant.name)}
            body={t(OPS_TENANTS.suspendConfirmBody).replace("{name}", tenant.name)}
            confirmLabel={t(OPS_TENANTS.suspendButton)}
            cancelLabel={t(OPS_COMMON.cancel)}
            icon={<Ban />}
            pending={pending}
            onConfirm={() => changeAccess(true)}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}
