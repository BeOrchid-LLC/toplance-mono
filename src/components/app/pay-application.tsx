"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { purchaseApplication } from "@/app/[locale]/checkout/actions";
import { useT } from "@/components/locale-provider";
import { CHECKOUT } from "@/lib/i18n/billing";

/**
 * The traveller's one act on the checkout screen.
 *
 * Pushes to `/app` rather than refreshing: this page sits outside the
 * `(app)` group, so nothing about it re-renders into the console once
 * the payment lands — the visitor has to be moved there.
 */
export function PayApplication() {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await purchaseApplication();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      router.push("/app");
    });
  }

  return (
    <Button onClick={submit} disabled={pending}>
      {pending ? t(CHECKOUT.paying) : t(CHECKOUT.pay)}
    </Button>
  );
}
