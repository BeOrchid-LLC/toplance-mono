"use client";

import * as React from "react";
import { Check, Eye, Flag, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DocStateBadge } from "@/components/shared/status-badge";
import { documentUrl } from "@/app/(app)/actions";
import { reviewDocument } from "@/app/ops/actions";
import type { DocumentRow as Doc } from "@/lib/data/applications";
import { cn } from "@/lib/utils";

/**
 * One checklist row as the reviewer sees it: the traveller's
 * `DocumentRow` shows upload controls, this one shows a verdict. Same
 * ruled-row anatomy and the same left-edge rule for a flagged state, so
 * the two consoles describe one document the same way.
 *
 * Flagging asks for the reason inline rather than in a dialog — the
 * reason is the review, not a confirmation step, and the reviewer needs
 * the document name and state in view while writing it.
 */
export function ReviewRow({ doc, applicationId }: { doc: Doc; applicationId: string }) {
  const [pending, startTransition] = React.useTransition();
  const [flagging, setFlagging] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const reviewable =
    doc.state === "uploaded" ||
    doc.state === "checking" ||
    doc.state === "verified" ||
    doc.state === "flagged";

  function view() {
    startTransition(async () => {
      const result = await documentUrl(applicationId, doc.docKey);
      if (result.error || !result.url) {
        toast.error(result.error ?? "That file could not be opened.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function submit(verdict: "verified" | "flagged") {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("doc_key", doc.docKey);
    formData.set("verdict", verdict);
    formData.set("reason", verdict === "flagged" ? reason : "");

    startTransition(async () => {
      const result = await reviewDocument(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setFlagging(false);
      setReason("");
      toast.success(
        verdict === "verified"
          ? `${doc.name} verified`
          : `${doc.name} flagged — the traveller sees your reason`
      );
    });
  }

  return (
    <div
      className={cn(
        /* Rows carry their own horizontal padding because they sit
           full-bleed inside a card — the flagged tint has to reach the
           card's edge, matching `document-row.tsx`. */
        "border-b border-border px-5 py-5 last:border-b-0 sm:px-6",
        doc.state === "flagged" &&
          "border-l-2 border-l-warning bg-[color-mix(in_srgb,var(--warning)_9%,transparent)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-[280px] flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="t-title">{doc.name}</h3>
            <DocStateBadge state={doc.state} />
            {!doc.isRequired && (
              <span className="special-caps">Optional</span>
            )}
          </div>
          {doc.reason && (
            <p className="t-body mt-2 max-w-[74ch] text-ink-2">{doc.reason}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {doc.storagePath && (
            <Button
              variant="tertiary"
              size="sm"
              onClick={view}
              disabled={pending}
              aria-label={`View ${doc.name}`}
            >
              <Eye /> View
            </Button>
          )}
          {reviewable && doc.state !== "verified" && (
            <Button
              size="sm"
              onClick={() => submit("verified")}
              disabled={pending}
              aria-label={`Verify ${doc.name}`}
            >
              <Check /> Verify
            </Button>
          )}
          {reviewable && doc.state !== "flagged" && !flagging && (
            <Button
              variant="warning"
              size="sm"
              onClick={() => setFlagging(true)}
              disabled={pending}
              aria-label={`Flag ${doc.name}`}
            >
              <Flag /> Flag
            </Button>
          )}
        </div>
      </div>

      {flagging && (
        <div className="mt-4 max-w-[62ch]">
          <Textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What is wrong, and what should they upload instead? The traveller reads this."
            rows={3}
          />
          <div className="mt-3 flex gap-3">
            <Button
              variant="warning"
              size="sm"
              onClick={() => submit("flagged")}
              disabled={pending || !reason.trim()}
            >
              <Flag /> Flag for the traveller
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => {
                setFlagging(false);
                setReason("");
              }}
              disabled={pending}
            >
              <X /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
