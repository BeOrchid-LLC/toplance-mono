"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { purchaseSubscription } from "@/app/[locale]/agency/billing/actions";
import { useT } from "@/components/locale-provider";
import { BILLING } from "@/lib/i18n/billing";

/**
 * The one act on the billing screen.
 *
 * `router.refresh()` rather than a redirect: the paywall lives in
 * `resolveAgencyConsole`, so once the payment lands the console opens on
 * its own and this page stops being where an unpaid agency is sent. A
 * hardcoded destination here would be a second opinion about where
 * somebody belongs, and the dispatcher already has one.
 */
export function PayPlan() {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await purchaseSubscription();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button onClick={submit} disabled={pending}>
      {pending ? t(BILLING.paying) : t(BILLING.payPlan)}
    </Button>
  );
}
