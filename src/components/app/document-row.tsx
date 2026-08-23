"use client";

import * as React from "react";
import { Camera, Eye, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DocStateBadge } from "@/components/shared/status-badge";
import { documentUrl, removeDocument, uploadDocument } from "@/app/(app)/actions";
import type { DocumentRow as Doc } from "@/lib/data/applications";
import { cn } from "@/lib/utils";

/**
 * Camera first. Most applicants are photographing a paper document on a
 * phone, so "Take a photo" is the primary action on small screens and
 * the file picker is the fallback — not the other way round.
 */
export function DocumentRow({
  doc,
  applicationId,
  description,
}: {
  doc: Doc;
  applicationId: string;
  description?: string | null;
}) {
  const [pending, startTransition] = React.useTransition();
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const needsAttention = doc.state === "flagged" || doc.state === "failed";

  function upload(file: File) {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("doc_key", doc.docKey);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(`${doc.name} uploaded — checking it now`);
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await removeDocument(applicationId, doc.docKey);
      if (result?.error) toast.error(result.error);
      else toast.info(`${doc.name} removed`);
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
        toast.error(result.error ?? "That file could not be opened.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border p-5",
        needsAttention
          ? doc.state === "failed"
            ? "border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_7%,var(--mix))]"
            : "border-[color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,var(--mix))]"
          : "border-border bg-surface"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[280px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="t-h3">{doc.name}</h3>
            <DocStateBadge state={doc.state} />
            {!doc.isRequired && (
              <span className="special">ONLY IF IT APPLIES TO YOU</span>
            )}
          </div>
          {doc.reason ? (
            <p className="t-body mt-2 text-ink-2">{doc.reason}</p>
          ) : description ? (
            <p className="t-muted mt-2">{description}</p>
          ) : null}
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
          {doc.state === "verified" || doc.state === "checking" ? (
            <Button
              variant="tertiary"
              size="sm"
              onClick={reset}
              disabled={pending}
              aria-label={`Replace ${doc.name}`}
            >
              <Trash2 /> Replace
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
                <Camera /> Take a photo
              </Button>
              <Button
                size="sm"
                variant={needsAttention ? "warning" : "primary"}
                onClick={() => fileRef.current?.click()}
                disabled={pending}
              >
                {needsAttention ? <RotateCcw /> : <Upload />}
                {pending
                  ? "Uploading…"
                  : needsAttention
                    ? "Replace file"
                    : "Upload"}
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
