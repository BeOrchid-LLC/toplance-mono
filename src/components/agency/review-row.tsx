"use client";

import * as React from "react";
import { Check, Eye, Flag, Undo2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocStateBadge } from "@/components/shared/status-badge";
import { documentUrl } from "@/app/[locale]/(app)/actions";
import {
  reviewDocument,
  withdrawDocumentRequest,
} from "@/app/[locale]/agency/actions";
import type { DocumentRow as Doc } from "@/lib/data/applications";
import { FLAG_REASON_KEYS } from "@/lib/domain/flag-reason";
import { documentVerdict } from "@/lib/domain/status";
import type { FlagReason } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/components/locale-provider";
import {
  CASE_COMMON,
  FLAG_REASONS,
  REVIEW_ROW,
} from "@/lib/i18n/case-review-actions";
import { DOCUMENT_REQUESTS } from "@/lib/i18n/document-requests";

/**
 * One checklist row as the reviewer sees it: the traveller's
 * `DocumentRow` shows upload controls, this one shows a verdict. Same
 * ruled-row anatomy and the same left-edge rule for a flagged state, so
 * the two consoles describe one document the same way.
 *
 * Recovered from the platform console deleted in #51, where it was the
 * same component pointed at BeOrchid's own actions. What it gained on
 * the way across is the reason class: `reviewDocumentTx` took only the
 * sentence back then, and `flag_reason` arrived with the correction that
 * left BeOrchid unable to open the file — the class is now the only
 * thing support outside the agency can debug from.
 *
 * Flagging asks for both inline rather than in a dialog. The reason is
 * the review, not a confirmation step, and the reviewer needs the
 * document's name and state in view while writing it.
 */
export function ReviewRow({ doc, applicationId }: { doc: Doc; applicationId: string }) {
  const t = useT();
  const { locale } = useLocale();
  const [pending, startTransition] = React.useTransition();
  const [flagging, setFlagging] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [reasonCode, setReasonCode] = React.useState<FlagReason | null>(null);
  const [withdrawing, setWithdrawing] = React.useState(false);

  const reviewable =
    doc.state === "uploaded" ||
    doc.state === "checking" ||
    doc.state === "verified" ||
    doc.state === "flagged";

  /**
   * A row somebody at this desk asked for, rather than one the corridor
   * requires — and, while nothing has been uploaded to it, one they can
   * take back.
   *
   * The second half is the whole of what makes the withdrawal safe to
   * offer: `withdrawDocumentRequestTx` refuses once the state moves off
   * `not_started`, so the button disappears at the same moment the
   * transaction would start saying no. Nothing here can delete a file.
   */
  const requested = doc.source === "agency";
  const withdrawable = requested && doc.state === "not_started";

  function view() {
    startTransition(async () => {
      // The traveller's own signed-URL action, unchanged: it is guarded
      // on `canReadDocuments`, which is the agency too, and a second
      // copy of it here would be a second place to get that wrong.
      const result = await documentUrl(applicationId, doc.docKey);
      if (result.error || !result.url) {
        toast.error(result.error ?? t(REVIEW_ROW.toastOpenFailed));
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function reset() {
    setFlagging(false);
    setReason("");
    setReasonCode(null);
  }

  function withdraw() {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("doc_key", doc.docKey);

    startTransition(async () => {
      const result = await withdrawDocumentRequest(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setWithdrawing(false);
      toast.success(t(DOCUMENT_REQUESTS.withdrawn));
    });
  }

  function submit(verdict: "verified" | "flagged") {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("doc_key", doc.docKey);
    formData.set("verdict", verdict);
    formData.set("reason", verdict === "flagged" ? reason : "");
    formData.set("reason_code", verdict === "flagged" ? (reasonCode ?? "") : "");

    startTransition(async () => {
      const result = await reviewDocument(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      reset();
      toast.success(
        (verdict === "verified"
          ? t(REVIEW_ROW.toastVerified)
          : t(REVIEW_ROW.toastFlagged)
        ).replace("{name}", doc.name)
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
          "border-s-2 border-s-warning bg-[color-mix(in_srgb,var(--warning)_9%,transparent)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-[280px] flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="t-title">{doc.name}</h3>
            <DocStateBadge state={doc.state} locale={locale} verdict={documentVerdict(doc)} />
            {!doc.isRequired && (
              <span className="special-caps">{t(REVIEW_ROW.optional)}</span>
            )}
            {/* Says this row is not the corridor's. Without it a
                reviewer picking up somebody else's case reads a
                checklist of eleven documents with no way to tell which
                one a colleague added by hand on Thursday — and the
                withdraw button appearing on exactly one row would be
                the only clue. */}
            {requested && (
              <span className="special-caps">{t(DOCUMENT_REQUESTS.askedBadge)}</span>
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
              aria-label={`${t(REVIEW_ROW.view)} ${doc.name}`}
            >
              <Eye /> {t(REVIEW_ROW.view)}
            </Button>
          )}
          {reviewable && doc.state !== "verified" && (
            <Button
              size="sm"
              onClick={() => submit("verified")}
              disabled={pending}
              aria-label={`${t(REVIEW_ROW.verify)} ${doc.name}`}
            >
              <Check /> {t(REVIEW_ROW.verify)}
            </Button>
          )}
          {reviewable && doc.state !== "flagged" && !flagging && (
            <Button
              variant="warning"
              size="sm"
              onClick={() => setFlagging(true)}
              disabled={pending}
              aria-label={`${t(REVIEW_ROW.flag)} ${doc.name}`}
            >
              <Flag /> {t(REVIEW_ROW.flag)}
            </Button>
          )}
          {withdrawable && (
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setWithdrawing(true)}
              disabled={pending}
              aria-label={`${t(DOCUMENT_REQUESTS.withdraw)} ${doc.name}`}
            >
              <Undo2 /> {t(DOCUMENT_REQUESTS.withdraw)}
            </Button>
          )}
        </div>
      </div>

      {/* Destructive under the rule in `AGENTS.md` — it takes a listed
          requirement off somebody's checklist — so it goes through the
          shared dialog rather than one assembled here. The body says the
          part the row behind it does not: that the traveller is never
          told, and that asking again means typing it out again. */}
      <ConfirmDialog
        open={withdrawing}
        onOpenChange={setWithdrawing}
        title={t(DOCUMENT_REQUESTS.withdrawConfirmTitle)}
        body={t(DOCUMENT_REQUESTS.withdrawConfirmBody)}
        confirmLabel={t(DOCUMENT_REQUESTS.withdrawConfirm)}
        cancelLabel={t(DOCUMENT_REQUESTS.cancel)}
        onConfirm={withdraw}
        pending={pending}
        icon={<Undo2 className="size-4" aria-hidden />}
      />

      {flagging && (
        <div className="mt-4 max-w-[62ch]">
          {/*
            The class first, then the sentence, because the class is the
            quicker judgement and picking it does not interrupt writing.
            A fieldset of buttons rather than a select: six options at
            this length read faster laid out than folded away, and the
            design system has no select primitive to fold them into.
          */}
          <fieldset>
            <legend className="special-caps">{t(FLAG_REASONS.legend)}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLAG_REASON_KEYS.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant={reasonCode === key ? "secondary" : "tertiary"}
                  size="sm"
                  aria-pressed={reasonCode === key}
                  onClick={() => setReasonCode(key)}
                  disabled={pending}
                >
                  {t(FLAG_REASONS[key])}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="mt-3">
            <Textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(REVIEW_ROW.flagPlaceholder)}
              rows={3}
            />
          </div>

          <div className="mt-3 flex gap-3">
            <Button
              variant="warning"
              size="sm"
              onClick={() => submit("flagged")}
              disabled={pending || !reason.trim() || !reasonCode}
            >
              <Flag /> {t(REVIEW_ROW.flagForTraveler)}
            </Button>
            <Button variant="tertiary" size="sm" onClick={reset} disabled={pending}>
              <X /> {t(CASE_COMMON.cancel)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
