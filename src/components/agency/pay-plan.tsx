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
 * The button says "Pay and open the console", so it opens the console.
 *
 * A `router.refresh()` was not enough: the paywall lives in
 * `resolveAgencyConsole`, so refreshing re-renders this page as a
 * receipt and leaves the director standing on their own bill, one
 * unexplained click from the thing they just paid for.
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
      router.push("/agency");
    });
  }

  return (
    <Button onClick={submit} disabled={pending}>
      {pending ? t(BILLING.paying) : t(BILLING.payPlan)}
    </Button>
  );
}
