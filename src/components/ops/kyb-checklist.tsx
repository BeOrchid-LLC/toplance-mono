"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  activateTenant,
  fileKybDocument,
  removeKybDocument,
  reviewKybRequirement,
} from "@/app/[locale]/ops/kyb/actions";
import type { AgencyKyb, KybRequirementRow } from "@/lib/data/kyb";
import type { KybState } from "@/lib/db/schema";
import { ACCEPT } from "@/lib/domain/uploads";
import { useT } from "@/components/locale-provider";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_KYB } from "@/lib/i18n/ops-kyb";

/** The four states, as the words and colours a row wears. */
const STATE: Record<
  KybState,
  { key: keyof typeof OPS_KYB.state; variant: "neutral" | "info" | "success" | "danger" }
> = {
  not_started: { key: "notStarted", variant: "neutral" },
  in_review: { key: "inReview", variant: "info" },
  verified: { key: "verified", variant: "success" },
  rejected: { key: "rejected", variant: "danger" },
};

/**
 * Everything BeOrchid does to one agency's KYB file.
 *
 * Six rows and one button. The button is the only act on this screen
 * that changes anything outside it — the rest is filing and judging,
 * both of which an admin can undo by doing the other thing.
 *
 * Under the rule in `AGENTS.md`, the split here is:
 *
 * - **Activation does not confirm.** It opens a console and sends a
 *   letter; it takes nothing away. Same reading as `purchaseSubscription`
 *   and `CorridorDecision`. What stands in its way instead is the
 *   checklist itself: the button is inert until all six read verified,
 *   and `activateAgency` re-counts inside its transaction because a
 *   disabled button was never a control.
 * - **Removing and replacing a document do confirm.** Both delete an
 *   object from a private bucket that holds the only copy — the same
 *   fact `app/document-row.tsx` asks about, in a row that looks exactly
 *   like the five beside it.
 *
 * There is no deactivate here on purpose. An agency that turns out badly
 * is stopped by `suspendTenant` on its own page, which already exists
 * and already asks; a second control for one outcome is two rules.
 */
export function KybChecklist({ agency }: { agency: AgencyKyb }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  /** The requirement whose filed document is about to be deleted, or null. */
  const [removing, setRemoving] = React.useState<KybRequirementRow | null>(null);
  /**
   * The requirement whose document is about to be overwritten, held with
   * the file already chosen — the confirm has to know both, because the
   * dialog opens from a change event on a hidden input and the file is
   * gone by the time the user answers.
   */
  const [replacing, setReplacing] = React.useState<{
    requirement: KybRequirementRow;
    file: File;
  } | null>(null);

  /** Every control here posts the same way; only the action differs. */
  function run(
    action: (fd: FormData) => Promise<{ ok: true } | { error: string }>,
    formData: FormData,
    success: string,
    onSuccess?: () => void
  ) {
    formData.set("org_id", agency.orgId);
    startTransition(async () => {
      const result = await action(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(success);
      onSuccess?.();
      router.refresh();
    });
  }

  function file(requirement: KybRequirementRow, chosen: File) {
    const formData = new FormData();
    formData.set("doc_key", requirement.docKey);
    formData.set("file", chosen);
    run(fileKybDocument, formData, t(OPS_KYB.toastFiled), () => setReplacing(null));
  }

  /**
   * A row that already holds a document asks before the new one lands,
   * because the upload is what deletes the old object. A row that holds
   * none files straight away — there is nothing to take away.
   */
  function chooseFile(requirement: KybRequirementRow, chosen: File | undefined) {
    if (!chosen) return;
    if (requirement.hasDocument) {
      setReplacing({ requirement, file: chosen });
      return;
    }
    file(requirement, chosen);
  }

  function remove(requirement: KybRequirementRow) {
    const formData = new FormData();
    formData.set("doc_key", requirement.docKey);
    run(removeKybDocument, formData, t(OPS_KYB.toastRemoved), () => setRemoving(null));
  }

  function review(requirement: KybRequirementRow, state: KybState, note: string) {
    const formData = new FormData();
    formData.set("doc_key", requirement.docKey);
    formData.set("state", state);
    formData.set("note", note);
    run(reviewKybRequirement, formData, t(OPS_KYB.toastVerdict));
  }

  function activate() {
    const formData = new FormData();
    startTransition(async () => {
      formData.set("org_id", agency.orgId);
      const result = await activateTenant(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // A colleague activated it while this tab was open. Nothing was
      // sent by this call, so nothing is claimed about an email.
      if (result.alreadyActivated) {
        toast.info(t(OPS_KYB.toastAlreadyActivated));
        router.refresh();
        return;
      }

      // The letter is the point of the act, so a dead mail provider is
      // said out loud rather than folded into a success message. The
      // console is open either way; whether the director knows is the
      // difference between these two sentences.
      if (result.emailSent) {
        toast.success(t(OPS_KYB.toastActivated));
      } else {
        toast.warning(t(OPS_KYB.toastActivatedNoEmail));
      }
      router.refresh();
    });
  }

  const outstanding = agency.progress.total - agency.progress.verified;

  return (
    <div className="flex flex-col gap-8">
      <Panel>
        <PanelHeader
          label={t(OPS_KYB.checklistPanel)}
          aside={
            <Badge variant={agency.progress.canActivate ? "success" : "neutral"}>
              {t(OPS_KYB.verifiedOf)
                .replace("{verified}", String(agency.progress.verified))
                .replace("{total}", String(agency.progress.total))}
            </Badge>
          }
        />
        <PanelBody className="flex flex-col gap-6">
          {agency.requirements.map((requirement) => (
            <RequirementRow
              /**
               * Keyed on the server's own values, not on the id alone.
               *
               * `RequirementRow` seeds its select and its note field from
               * props with `useState`, and an initialiser runs once. With
               * a stable key React reused the instance across
               * `router.refresh()`, so the draft state survived a write
               * that had changed the row underneath it: remove a
               * document, and the badge correctly reads "Not started"
               * while the select beside it still says "Verified" —
               * pressing Save then re-verifies a requirement with no
               * document on file, and the activate button unlocks. Same
               * divergence when a colleague takes a different verdict in
               * another tab.
               *
               * Remounting is the right reset here because there is no
               * draft worth preserving: the only values that change the
               * key are ones the server has just confirmed.
               */
              key={`${requirement.id}:${requirement.state}:${requirement.note ?? ""}`}
              requirement={requirement}
              agencyId={agency.orgId}
              pending={pending}
              onChooseFile={(chosen) => chooseFile(requirement, chosen)}
              onRemove={() => setRemoving(requirement)}
              onReview={(state, note) => review(requirement, state, note)}
            />
          ))}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody className="flex flex-col items-start gap-3">
          {agency.activatedAt ? (
            <p className="flex items-center gap-2 text-sm text-success-ink">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              {t(OPS_KYB.activatedOn).replace(
                "{date}",
                agency.activatedAt.toISOString().slice(0, 10)
              )}
            </p>
          ) : (
            <>
              <Button
                onClick={activate}
                disabled={pending || !agency.progress.canActivate}
              >
                <ShieldCheck className="size-4" aria-hidden />
                {pending ? t(OPS_KYB.activating) : t(OPS_KYB.activate)}
              </Button>
              {/* Named, not merely disabled. A greyed button with no
                  sentence beside it is a screen refusing to say why. */}
              {!agency.progress.canActivate && (
                <p className="t-muted max-w-[62ch]">
                  {t(OPS_KYB.activateBlocked).replace("{n}", String(outstanding))}
                </p>
              )}
            </>
          )}

          {/* Suspension and activation are different questions about the
              same agency, and an operator here should not assume this
              button answers the other one. */}
          {agency.suspendedAt && (
            <p className="t-muted max-w-[62ch]">{t(OPS_KYB.suspendedNotice)}</p>
          )}
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t(OPS_KYB.removeTitle)}
        body={t(OPS_KYB.removeBody)}
        confirmLabel={t(OPS_KYB.removeConfirm)}
        cancelLabel={t(OPS_COMMON.cancel)}
        onConfirm={() => removing && remove(removing)}
        pending={pending}
        icon={<Trash2 className="size-4" aria-hidden />}
      />

      <ConfirmDialog
        open={!!replacing}
        onOpenChange={(open) => !open && setReplacing(null)}
        title={t(OPS_KYB.replaceTitle)}
        body={t(OPS_KYB.replaceBody)}
        confirmLabel={t(OPS_KYB.replaceConfirm)}
        cancelLabel={t(OPS_COMMON.cancel)}
        onConfirm={() => replacing && file(replacing.requirement, replacing.file)}
        pending={pending}
        icon={<Upload className="size-4" aria-hidden />}
      />
    </div>
  );
}

/**
 * One requirement: what it is, what was filed against it, and the
 * verdict.
 *
 * Its own component because it holds two pieces of draft state — the
 * chosen state and the note — which must not be shared across six rows.
 * Lifting them into `KybChecklist` as a keyed record is the same state
 * with a bookkeeping problem attached.
 */
function RequirementRow({
  requirement,
  agencyId,
  pending,
  onChooseFile,
  onRemove,
  onReview,
}: {
  requirement: KybRequirementRow;
  agencyId: string;
  pending: boolean;
  onChooseFile: (file: File | undefined) => void;
  onRemove: () => void;
  onReview: (state: KybState, note: string) => void;
}) {
  const t = useT();
  const [state, setState] = React.useState<KybState>(requirement.state);
  const [note, setNote] = React.useState(requirement.note ?? "");
  const inputId = `kyb-file-${requirement.docKey}`;
  const badge = STATE[requirement.state];

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-6 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{requirement.name}</p>
          {requirement.description && (
            <p className="t-muted max-w-[70ch]">{requirement.description}</p>
          )}
        </div>
        <Badge variant={badge.variant}>{t(OPS_KYB.state[badge.key])}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {requirement.hasDocument ? (
          <>
            <a
              href={`/api/kyb/${agencyId}/${encodeURIComponent(requirement.docKey)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand-text hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden />
              {t(OPS_KYB.openDocument)}
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={pending}
              type="button"
            >
              <Trash2 className="size-4" aria-hidden />
              {t(OPS_KYB.remove)}
            </Button>
          </>
        ) : (
          <span className="t-muted">{t(OPS_KYB.noDocument)}</span>
        )}

        {/* A label over a hidden input, which is how a file picker gets
            to look like the buttons beside it. */}
        <Button asChild variant="secondary" size="sm" disabled={pending}>
          <label htmlFor={inputId} className="cursor-pointer">
            <Upload className="size-4" aria-hidden />
            {requirement.hasDocument ? t(OPS_KYB.replace) : t(OPS_KYB.fileLabel)}
          </label>
        </Button>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            onChooseFile(event.target.files?.[0]);
            // Cleared so choosing the same file twice still fires a
            // change event — otherwise a cancelled confirm can never be
            // retried with the same document.
            event.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`kyb-state-${requirement.docKey}`}>
            {t(OPS_KYB.tableHead.standing)}
          </Label>
          {/* A native select behind a styled face, the same shape
              `PageSizeSelect` and the toolbar filters use: on a phone it
              opens the system picker, in the reader's own language. */}
          <div className="relative">
            <select
              id={`kyb-state-${requirement.docKey}`}
              value={state}
              disabled={pending}
              onChange={(event) => setState(event.target.value as KybState)}
              className="h-9 w-44 appearance-none rounded-[var(--radius-sm)] border border-border-strong bg-surface ps-3 pe-8 text-base font-semibold text-ink"
            >
              {(Object.keys(STATE) as KybState[]).map((value) => (
                <option key={value} value={value}>
                  {t(OPS_KYB.state[STATE[value].key])}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
          </div>
        </div>

        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <Label htmlFor={`kyb-note-${requirement.docKey}`}>
            {t(OPS_KYB.noteLabel)}
          </Label>
          <Input
            id={`kyb-note-${requirement.docKey}`}
            value={note}
            placeholder={t(OPS_KYB.notePlaceholder)}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => onReview(state, note)}
          disabled={pending}
          type="button"
        >
          {t(OPS_KYB.saveVerdict)}
        </Button>
      </div>

      {requirement.reviewedByName && (
        <p className="t-muted">
          {t(OPS_KYB.reviewedBy).replace("{name}", requirement.reviewedByName)}
        </p>
      )}
    </div>
  );
}
