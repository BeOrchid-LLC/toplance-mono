"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";

/**
 * Close a support request from inside the conversation.
 *
 * On both sides, because the person who raised it usually knows first
 * that it is sorted — and an operator who has just written a reply
 * should not have to go back to the queue to close what they were
 * looking at.
 *
 * No confirmation. Closing takes nothing away: the thread stays
 * readable to both sides, and raising a new request is the way back if
 * it turns out to have been premature. Per `AGENTS.md`, that makes it
 * additive rather than destructive.
 *
 * The action is a prop for the same reason the composer's is: each
 * console's gate belongs to that console.
 */
export function SupportResolve({
  requestId,
  action,
}: {
  requestId: string;
  action: (formData: FormData) => Promise<{ error?: string } | { ok: true }>;
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const formData = new FormData();
    formData.set("request_id", requestId);

    startTransition(async () => {
      const result = await action(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t(OPS_SUPPORT.resolvedToast));
    });
  }

  return (
    <Button type="button" variant="neutral" disabled={pending} onClick={submit}>
      <CheckCircle2 className="size-4" aria-hidden />
      {t(OPS_SUPPORT.markResolved)}
    </Button>
  );
}
