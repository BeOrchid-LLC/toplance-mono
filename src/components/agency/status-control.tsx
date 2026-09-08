"use client";

import * as React from "react";
import { Check, FileWarning, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { changeCaseStatus } from "@/app/[locale]/agency/actions";
import {
  STAFF_TRANSITIONS,
  isTerminalStatus,
  type ApplicationStatus,
} from "@/lib/domain/status";
import { STATUS_COPY } from "@/lib/i18n/status";
import { useT } from "@/components/locale-provider";
import { CASE_COMMON, STATUS_CONTROL } from "@/lib/i18n/case-review-actions";

const ICON: Partial<Record<ApplicationStatus, React.ComponentType<{ className?: string }>>> = {
  under_review: Search,
  additional_documents: FileWarning,
  approved: Check,
  rejected: X,
};

/**
 * The decision panel — one button per exit `STAFF_TRANSITIONS`
 * allows from the case's current status, sharing one message box: every
 * status change carries a message to the traveller, so there is nothing
 * to send until that box has something in it.
 *
 * `approved` and `rejected` close the case for good, so each takes two
 * clicks on the same button — the first swaps its label to "Confirm
 * approval"/"Confirm rejection", the second actually sends it. No
 * dialog: the case is right there on screen, and a modal would only
 * hide it.
 *
 * `STAFF_TRANSITIONS` keeps its name: the transitions are the same four,
 * and #51 moved who is entitled to make them rather than what they are.
 * The guard that decides that is `canDecideCase`, not this component.
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
      toast.success(
        t(STATUS_CONTROL.toastMoved).replace("{status}", t(STATUS_COPY[to].label))
      );
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
    return <p className="t-muted">{t(STATUS_CONTROL.noAction)}</p>;
  }

  return (
    <div>
      <Textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setConfirming(null);
        }}
        placeholder={t(STATUS_CONTROL.messagePlaceholder)}
        rows={3}
        maxLength={2000}
        disabled={pending}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {exits.map((to) => {
          const Icon = ICON[to];
          const isConfirming = confirming === to;
          const label = isConfirming
            ? to === "approved"
              ? t(STATUS_CONTROL.confirmApproval)
              : t(STATUS_CONTROL.confirmRejection)
            : t(STATUS_COPY[to].label);
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
                  {t(CASE_COMMON.cancel)}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
