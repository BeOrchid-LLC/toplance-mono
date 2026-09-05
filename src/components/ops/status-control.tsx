"use client";

import * as React from "react";
import { Check, FileWarning, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { changeCaseStatus } from "@/app/ops/actions";
import {
  STAFF_TRANSITIONS,
  STATUS,
  isTerminalStatus,
  type ApplicationStatus,
} from "@/lib/domain/status";
import { useT } from "@/components/locale-provider";
import { OPS_STATUS_CONTROL } from "@/lib/i18n/ops-case-actions";
import { OPS_COMMON } from "@/lib/i18n/ops-common";

const ICON: Partial<Record<ApplicationStatus, React.ComponentType<{ className?: string }>>> = {
  under_review: Search,
  additional_documents: FileWarning,
  approved: Check,
  rejected: X,
};

/**
 * The desk's decision panel — one button per exit `STAFF_TRANSITIONS`
 * allows from the case's current status, sharing one message box: every
 * status change carries a message to the traveller, so there is nothing
 * to send until that box has something in it.
 *
 * `approved` and `rejected` close the case for good, so each takes two
 * clicks on the same button — the first swaps its label to "Confirm
 * approval"/"Confirm rejection", the second actually sends it. No
 * dialog: the case is right there on screen, and a modal would only
 * hide it.
 */
export function StatusControl({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState("");
  const [confirming, setConfirming] = React.useState<ApplicationStatus | null>(null);

  const exits = STAFF_TRANSITIONS[status];

  function submit(to: ApplicationStatus) {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("to", to);
    formData.set("message", message);

    startTransition(async () => {
      const result = await changeCaseStatus(formData);
      if ("error" in result) {
        toast.error(result.error);
        setConfirming(null);
        return;
      }
      setMessage("");
      setConfirming(null);
      // `STATUS[to].label` (`@/lib/domain/status.ts`) is not itself
      // localised — see the review's flags — so this toast is only
      // partly translated until that file gets its own pass.
      toast.success(t(OPS_STATUS_CONTROL.toastMoved).replace("{status}", STATUS[to].label));
    });
  }

  function click(to: ApplicationStatus) {
    if (isTerminalStatus(to) && confirming !== to) {
      setConfirming(to);
      return;
    }
    submit(to);
  }

  if (exits.length === 0) {
    return <p className="t-muted">{t(OPS_STATUS_CONTROL.noAction)}</p>;
  }

  return (
    <div>
      <Textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setConfirming(null);
        }}
        placeholder={t(OPS_STATUS_CONTROL.messagePlaceholder)}
        rows={3}
        maxLength={2000}
        disabled={pending}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {exits.map((to) => {
          const Icon = ICON[to];
          const isConfirming = confirming === to;
          // `STATUS[to].label` (`@/lib/domain/status.ts`) is not itself
          // localised — see the review's flags.
          const label = isConfirming
            ? to === "approved"
              ? t(OPS_STATUS_CONTROL.confirmApproval)
              : t(OPS_STATUS_CONTROL.confirmRejection)
            : STATUS[to].label;
          const variant =
            to === "approved" ? "success" : to === "rejected" ? "danger" : "secondary";

          return (
            <div key={to} className="flex items-center gap-2">
              <Button
                variant={variant}
                size="sm"
                onClick={() => click(to)}
                disabled={pending || !message.trim()}
              >
                {Icon && <Icon />} {label}
              </Button>
              {isConfirming && (
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setConfirming(null)}
                  disabled={pending}
                >
                  {t(OPS_COMMON.cancel)}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
