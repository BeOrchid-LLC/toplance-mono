"use client";

import * as React from "react";
import { Camera, Eye, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocStateBadge } from "@/components/shared/status-badge";
import { RequirementBadge } from "@/components/shared/requirement-badge";
import { documentUrl, removeDocument, uploadDocument } from "@/app/[locale]/(app)/actions";
import { useUploadOutcome } from "@/components/app/upload-outcome";
import type { DocumentRow as Doc } from "@/lib/data/applications";
import { DocumentSpecimen } from "@/components/app/document-specimen";
import { documentGuidance } from "@/lib/domain/document-guidance";
import { specimenFor } from "@/lib/domain/specimens";
import { ACCEPT } from "@/lib/domain/uploads";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/components/locale-provider";
import { DOCUMENT_ROW } from "@/lib/i18n/document-row";

/**
 * Camera first. Most applicants are photographing a paper document on a
 * phone, so "Take a photo" is the primary action on small screens and
 * the file picker is the fallback — not the other way round.
 *
 * A ruled row, never a card and never glass. This is the exact thing
 * guideline §4 names in its deny list: a repeated element down a scroll.
 * Twelve bordered boxes stacked in a column read as twelve objects to
 * decide about; twelve ruled rows read as one list — which is what a
 * checklist is.
 *
 * A row needing attention is marked by a rule down its left edge in the
 * semantic colour, not by turning the row into a tinted box. The state
 * badge beside the name still says it in words, so the colour is never
 * carrying the meaning alone (§8).
 */
export function DocumentRow({
  doc,
  applicationId,
  description,
  completesChecklist = false,
}: {
  doc: Doc;
  applicationId: string;
  description?: string | null;
  /**
   * Whether this row is the last required document still outstanding, so
   * an upload here finishes the traveller's part. Decided by the page,
   * which is the only place that can see the whole checklist.
   */
  completesChecklist?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [pending, startTransition] = React.useTransition();
  const [confirmingRemove, setConfirmingRemove] = React.useState(false);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const needsAttention = doc.state === "flagged" || doc.state === "failed";

  /**
   * The rejection and the guidance answer different questions, so the row
   * shows both. It used to show one *or* the other, which meant a flagged
   * document lost its instructions at the exact moment the traveller was
   * being asked to upload again: told the file was wrong, and no longer
   * told what a right one looks like.
   */
  const { rejection, guidance } = documentGuidance({
    reason: doc.reason,
    description,
  });

  /** The drawn example, where one has been drawn for this document type. */
  const specimen = specimenFor(doc.docKey);

  /**
   * The outcome dialog is owned by the page, not by this row: uploading
   * moves the row between sets, so a dialog living here would be
   * unmounted moments after it opened. The row reports the upload and
   * lends its picker; `UploadOutcomeProvider` does the rest.
   */
  const { report, registerPicker } = useUploadOutcome();

  React.useEffect(
    () => registerPicker(doc.docKey, () => fileRef.current?.click()),
    [doc.docKey, registerPicker]
  );

  function upload(file: File) {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("doc_key", doc.docKey);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      report(doc.docKey, completesChecklist);
    });
  }

  /**
   * Destructive: `removeDocument` deletes the stored file and puts the
   * row back to `not_started`. The button that reaches it is labelled
   * "Replace", which is what makes the confirmation worth having — the
   * word promises a swap, and what actually happens is a deletion with
   * nothing on the other side of it until the traveller uploads again.
   */
  function reset() {
    startTransition(async () => {
      const result = await removeDocument(applicationId, doc.docKey);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setConfirmingRemove(false);
      toast.info(t(DOCUMENT_ROW.removedToast).replace("{name}", doc.name));
    });
  }

  /**
   * The signed URL is minted per click rather than rendered into the
   * page. It expires in ten minutes, so one baked into the HTML would be
   * dead by the time most people scrolled to it — and would sit in the
   * markup for anything reading the page.
   */
  function view() {
    startTransition(async () => {
      const result = await documentUrl(applicationId, doc.docKey);
      if (result.error || !result.url) {
        toast.error(result.error ?? t(DOCUMENT_ROW.openFailed));
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div
      className={cn(
        /* Rows carry their own horizontal padding because they sit
           full-bleed inside a card: the attention tint below has to run
           to the card's edge, and a padded wrapper would inset it. */
        "border-b border-border px-5 py-5 last:border-b-0 sm:px-6",
        /* The tint mixes toward `transparent`, not toward `--mix`. These
           rows sit on a plate, and the same tint has to read correctly
           there and on the inset below it; mixing toward one ground
           would go wrong on the other. */
        needsAttention && "border-s-2",
        needsAttention &&
          (doc.state === "failed"
            ? "border-s-danger bg-[color-mix(in_srgb,var(--danger)_7%,transparent)]"
            : "border-s-warning bg-[color-mix(in_srgb,var(--warning)_9%,transparent)]")
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-[280px] flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="t-title">{doc.name}</h3>
            <DocStateBadge state={doc.state} locale={locale} />
            <RequirementBadge required={doc.isRequired} />
          </div>
          {rejection ? (
            <p className="t-body mt-2 max-w-[74ch] text-ink-2">{rejection}</p>
          ) : null}
          {guidance ? (
            <p className="t-muted mt-2 max-w-[74ch]">{guidance}</p>
          ) : null}
          {specimen ? (
            /* A native disclosure rather than a tooltip. A tooltip has no
               resting place on a touch screen, and this is exactly the
               content someone wants open while they line up the shot. */
            <details className="group mt-2 max-w-[74ch]">
              <summary className="t-muted cursor-pointer list-none underline decoration-dotted underline-offset-4">
                <span className="group-open:hidden">
                  {t(DOCUMENT_ROW.seeExample)}
                </span>
                <span className="hidden group-open:inline">
                  {t(DOCUMENT_ROW.hideExample)}
                </span>
              </summary>
              <DocumentSpecimen
                specimen={specimen}
                caption={t(DOCUMENT_ROW.exampleCaption)}
                pitfallLabel={t(DOCUMENT_ROW.commonlySentBack)}
              />
            </details>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {doc.storagePath && (
            <Button
              variant="tertiary"
              size="sm"
              onClick={view}
              disabled={pending}
              aria-label={t(DOCUMENT_ROW.viewAria).replace("{name}", doc.name)}
            >
              <Eye /> {t(DOCUMENT_ROW.view)}
            </Button>
          )}
          {doc.state === "verified" || doc.state === "checking" ? (
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setConfirmingRemove(true)}
              disabled={pending}
              aria-label={t(DOCUMENT_ROW.replaceAria).replace("{name}", doc.name)}
            >
              <Trash2 /> {t(DOCUMENT_ROW.replace)}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant={needsAttention ? "warning" : "primary"}
                onClick={() => cameraRef.current?.click()}
                disabled={pending}
                className="sm:hidden"
              >
                <Camera /> {t(DOCUMENT_ROW.takePhoto)}
              </Button>
              <Button
                size="sm"
                variant={needsAttention ? "warning" : "primary"}
                onClick={() => fileRef.current?.click()}
                disabled={pending}
              >
                {needsAttention ? <RotateCcw /> : <Upload />}
                {pending
                  ? t(DOCUMENT_ROW.uploading)
                  : needsAttention
                    ? t(DOCUMENT_ROW.replaceFile)
                    : t(DOCUMENT_ROW.upload)}
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={t(DOCUMENT_ROW.takePhotoAria).replace("{name}", doc.name)}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label={t(DOCUMENT_ROW.uploadAria).replace("{name}", doc.name)}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      <ConfirmDialog
        open={confirmingRemove}
        onOpenChange={setConfirmingRemove}
        title={t(DOCUMENT_ROW.removeConfirmTitle).replace("{name}", doc.name)}
        body={t(DOCUMENT_ROW.removeConfirmBody)}
        confirmLabel={t(DOCUMENT_ROW.removeConfirmCta)}
        cancelLabel={t(DOCUMENT_ROW.cancel)}
        icon={<Trash2 />}
        pending={pending}
        onConfirm={reset}
      />
    </div>
  );
}
