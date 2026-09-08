"use client";

import * as React from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cancelSubscription } from "@/app/[locale]/agency/billing/actions";
import { useT } from "@/components/locale-provider";
import { BILLING } from "@/lib/i18n/billing";

/**
 * The way out, beside the way in.
 *
 * Destructive under the rule in `AGENTS.md` — every member stops being
 * able to open a case, at once — so it asks first, through the shared
 * `ConfirmDialog`. The body says the three things this screen does not:
 * that it happens now, that it happens to colleagues who are in the
 * middle of a case, and that the days already paid for go with it.
 *
 * `tertiary` rather than the `danger` the ops console gives suspension.
 * That button is an operator acting on somebody else and should look
 * like it; this is an agency's own quiet exit, sitting under a price,
 * and the red belongs on the confirm inside the dialog.
 *
 * No `router.refresh()`, unlike `PayPlan` next door. The action calls
 * `revalidatePath`, so the re-rendered billing page comes back in the
 * same response — and it is a page the director may still stand on,
 * which is exactly why paying had to navigate and leaving does not.
 */
export function CancelPlan({ paidUntil }: { paidUntil: string }) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  function submit() {
    startTransition(async () => {
      const result = await cancelSubscription();
      if ("error" in result) {
        // The dialog stays open on a failure, the way suspension's does,
        // so the error is read against the question that was asked
        // rather than as a toast over a screen that may or may not have
        // changed.
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      toast.success(t(BILLING.planEnded));
    });
  }

  return (
    <>
      <Button variant="tertiary" disabled={pending} onClick={() => setConfirming(true)}>
        <Ban /> {pending ? t(BILLING.cancelling) : t(BILLING.cancelPlan)}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t(BILLING.cancelConfirmTitle)}
        body={t(BILLING.cancelConfirmBody).replace("{date}", paidUntil)}
        confirmLabel={t(BILLING.cancelPlan)}
        cancelLabel={t(BILLING.keepPlan)}
        icon={<Ban />}
        pending={pending}
        onConfirm={submit}
      />
    </>
  );
}
