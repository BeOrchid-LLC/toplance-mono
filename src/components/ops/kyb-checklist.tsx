"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CheckCircle,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  IdCard,
  Landmark,
  MapPin,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

/* ── state map ── */
const STATE: Record<
  KybState,
  { key: keyof typeof OPS_KYB.state; variant: "outline" | "neutral" | "info" | "success" | "danger" }
> = {
  not_started: { key: "notStarted", variant: "outline" },
  in_review: { key: "inReview", variant: "info" },
  verified: { key: "verified", variant: "success" },
  rejected: { key: "rejected", variant: "danger" },
};

const STATE_ACCENT: Record<KybState, string> = {
  not_started: "bg-border-strong",
  in_review: "bg-info",
  verified: "bg-success",
  rejected: "bg-danger",
};

const STATE_SOFT: Record<KybState, string> = {
  not_started: "bg-surface-2 text-ink-3",
  in_review: "bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-info-ink",
  verified: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success-ink",
  rejected: "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-danger-ink",
};

/* ── doc icons ── */
const DOC_ICON: Record<string, React.ReactNode> = {
  operating_licence: <ShieldCheck className="size-[18px]" aria-hidden />,
  incorporation_certificate: <Building2 className="size-[18px]" aria-hidden />,
  director_id: <IdCard className="size-[18px]" aria-hidden />,
  business_address: <MapPin className="size-[18px]" aria-hidden />,
  ownership_proof: <Users className="size-[18px]" aria-hidden />,
  bank_account: <Landmark className="size-[18px]" aria-hidden />,
};

function docIndex(docKey: string) {
  const order = [
    "operating_licence",
    "incorporation_certificate",
    "director_id",
    "business_address",
    "ownership_proof",
    "bank_account",
  ];
  const i = order.indexOf(docKey);
  return i >= 0 ? String(i + 1).padStart(2, "0") : "—";
}

/**
 * Everything BeOrchid does to one agency's KYB file.
 * Six rows and one gate. The gate is the only act that changes anything
 * outside this screen — the rest is filing and judging.
 */
export function KybChecklist({ agency }: { agency: AgencyKyb }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [removing, setRemoving] = React.useState<KybRequirementRow | null>(null);
  const [replacing, setReplacing] = React.useState<{
    requirement: KybRequirementRow;
    file: File;
  } | null>(null);

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
      if (result.alreadyActivated) {
        toast.info(t(OPS_KYB.toastAlreadyActivated));
        router.refresh();
        return;
      }
      if (result.emailSent) toast.success(t(OPS_KYB.toastActivated));
      else toast.warning(t(OPS_KYB.toastActivatedNoEmail));
      router.refresh();
    });
  }

  const verified = agency.progress.verified;
  const total = agency.progress.total;
  const outstanding = total - verified;
  const pct = total ? Math.round((verified / total) * 100) : 0;

  const hasRejected = agency.requirements.some((r) => r.state === "rejected");
  const inReviewCount = agency.requirements.filter((r) => r.state === "in_review").length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── progress dossier header ── */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm ovi-edge">
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="special-caps">Dossier</p>
              <h2 className="t-title mt-1">Required documents</h2>
              <p className="mt-1 max-w-[60ch] text-sm leading-5 text-ink-2">
                Six proofs. Each row files one document and records one verdict.
                Only <span className="font-semibold text-ink">Verified</span> counts toward activation.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="num text-sm font-semibold tabular-nums text-ink">
                  {verified} / {total}
                </span>
                <Badge variant={agency.progress.canActivate ? "success" : hasRejected ? "danger" : "neutral"}>
                  {agency.progress.canActivate
                    ? "Ready to activate"
                    : hasRejected
                      ? `${agency.requirements.filter((r) => r.state === "rejected").length} rejected`
                      : `${verified} of ${total} verified`}
                </Badge>
              </div>
              <span className="special text-[12px]">
                {pct}% complete{inReviewCount ? ` · ${inReviewCount} in review` : ""}
                {hasRejected ? ` · needs attention` : ""}
              </span>
            </div>
          </div>

          {/* segmented bar */}
          <div className="mt-5 flex gap-1.5">
            {agency.requirements.map((r) => (
              <div
                key={r.id}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-inset"
                aria-hidden
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    r.state === "verified"
                      ? "bg-success"
                      : r.state === "rejected"
                        ? "bg-danger"
                        : r.state === "in_review"
                          ? "bg-info"
                          : "bg-transparent"
                  )}
                  style={{
                    width: r.state === "verified" || r.state === "rejected" || r.state === "in_review" ? "100%" : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            <span className="special text-[11px] tracking-wide">
              {verified === 0 ? "No documents verified yet" : `${outstanding} remaining`}
            </span>
            <span className="special text-[11px]">6 files · 4 states</span>
          </div>
        </div>
      </div>

      {/* ── requirement rows ── */}
      <div className="flex flex-col gap-3.5">
        {agency.requirements.map((requirement) => (
          <RequirementRow
            key={`${requirement.id}:${requirement.state}:${requirement.note ?? ""}`}
            requirement={requirement}
            agencyId={agency.orgId}
            pending={pending}
            onChooseFile={(chosen) => chooseFile(requirement, chosen)}
            onRemove={() => setRemoving(requirement)}
            onReview={(state, note) => review(requirement, state, note)}
          />
        ))}
      </div>

      {/* ── activation gate ── */}
      <div
        className={cn(
          "overflow-hidden rounded-xl border shadow-sm",
          agency.progress.canActivate
            ? "border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[color-mix(in_srgb,var(--success)_7%,var(--surface))] ovi-edge"
            : "border-border bg-surface ovi-edge"
        )}
      >
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {agency.activatedAt ? (
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success-ink">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-success-ink">Agency activated</p>
                <p className="mt-1 text-sm leading-5 text-ink-2">
                  BeOrchid opened this console on {agency.activatedAt.toISOString().slice(0, 10)}. The director
                  was notified by email.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <span
                  className={cn(
                    "hidden size-11 shrink-0 items-center justify-center rounded-xl border sm:flex",
                    agency.progress.canActivate
                      ? "border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-surface text-success-ink"
                      : "border-border bg-surface-2 text-ink-3"
                  )}
                  aria-hidden
                >
                  <ShieldCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="t-title flex items-center gap-2">
                    {agency.progress.canActivate ? "Ready to activate" : "Activation gated"}
                    {!agency.progress.canActivate && outstanding > 0 && (
                      <span className="inline-flex h-5 items-center rounded-full bg-surface-2 px-2 text-[12px] font-semibold text-ink-2">
                        {outstanding} left
                      </span>
                    )}
                  </p>
                  <p className="mt-1 max-w-[52ch] text-sm leading-5 text-ink-2">
                    {agency.progress.canActivate ? (
                      <>
                        All six requirements are verified. Activation opens the agency console and emails the
                        director a link to billing.
                      </>
                    ) : (
                      <>
                        {t(OPS_KYB.activateBlocked).replace("{n}", String(outstanding))} The button stays locked
                        until every row reads <span className="font-semibold text-ink">Verified</span>.
                      </>
                    )}
                  </p>
                  {/* mini progress inside gate */}
                  {!agency.progress.canActivate && (
                    <div className="mt-3 flex max-w-[320px] gap-1">
                      {agency.requirements.map((r) => (
                        <div
                          key={r.id}
                          className={cn(
                            "h-1 flex-1 rounded-full",
                            r.state === "verified" ? "bg-success" : "bg-surface-inset"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={activate}
                disabled={pending || !agency.progress.canActivate}
                className={cn(
                  "shrink-0",
                  agency.progress.canActivate && "shadow-[0_8px_20px_-12px_rgb(24_147_90/0.6)]"
                )}
              >
                <ShieldCheck className="size-4" aria-hidden />
                {pending ? t(OPS_KYB.activating) : t(OPS_KYB.activate)}
              </Button>
            </div>
          )}

          {agency.suspendedAt && (
            <p className="t-muted mt-4 max-w-[62ch] border-t border-border pt-4 text-sm">
              {t(OPS_KYB.suspendedNotice)}
            </p>
          )}
        </div>
      </div>

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
  const noteId = `kyb-note-${requirement.docKey}`;
  const badge = STATE[requirement.state];
  const hasDoc = requirement.hasDocument;
  const isDirty = state !== requirement.state || note !== (requirement.note ?? "");

  const stateIcon =
    requirement.state === "verified" ? (
      <CheckCircle className="size-3.5" aria-hidden />
    ) : requirement.state === "rejected" ? (
      <AlertCircle className="size-3.5" aria-hidden />
    ) : requirement.state === "in_review" ? (
      <Clock3 className="size-3.5" aria-hidden />
    ) : null;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-[0_4px_24px_-12px_rgb(16_19_28/0.10)]">
      {/* state rail */}
      <div className={cn("absolute inset-y-0 left-0 w-[3px]", STATE_ACCENT[requirement.state])} aria-hidden />

      <div className="flex flex-col gap-0">
        {/* ── header row ── */}
        <div className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
          {/* icon */}
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border text-[15px] sm:size-11",
              requirement.state === "verified"
                ? "border-[color-mix(in_srgb,var(--success)_24%,transparent)] bg-[color-mix(in_srgb,var(--success)_11%,transparent)] text-success-ink"
                : requirement.state === "rejected"
                  ? "border-[color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-danger-ink"
                  : requirement.state === "in_review"
                    ? "border-[color-mix(in_srgb,var(--info)_22%,transparent)] bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-info-ink"
                    : "border-border bg-surface-2 text-ink-3"
            )}
            aria-hidden
          >
            {DOC_ICON[requirement.docKey] ?? <FileText className="size-[18px]" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold leading-5 tracking-[-0.01em] text-ink">
                    {requirement.name}
                  </h3>
                  <Badge variant={badge.variant} className="gap-1">
                    {stateIcon}
                    {t(OPS_KYB.state[badge.key])}
                  </Badge>
                </div>
                {requirement.description && (
                  <p className="mt-1 max-w-[62ch] text-sm leading-5 text-ink-2">{requirement.description}</p>
                )}
              </div>

              {/* filed count / index */}
              <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-ink-3 sm:inline-flex">
                <span className="inline-flex size-5 items-center justify-center rounded-full border border-border bg-surface-2 text-[10px]">
                  {docIndex(requirement.docKey)}
                </span>
                / 06
              </span>
            </div>

            {/* ── file sleeve ── */}
            <div
              className={cn(
                "mt-3.5 rounded-xl border px-3 py-3 sm:px-3.5",
                hasDoc
                  ? "border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-surface-2/60"
                  : "border-dashed bg-bg"
              )}
            >
              {hasDoc ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-success-ink shadow-sm ring-1 ring-border">
                      <FileCheck2 className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-none text-ink">Document on file</p>
                      <p className="mt-1 text-xs leading-none text-ink-3">Stored privately · opens in a new tab</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={`/api/kyb/${agencyId}/${encodeURIComponent(requirement.docKey)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-border-strong hover:text-ink"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      {t(OPS_KYB.openDocument)}
                    </a>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRemove}
                      disabled={pending}
                      type="button"
                      className="h-8 rounded-full px-2.5 text-ink-2 hover:text-danger-ink"
                      aria-label={t(OPS_KYB.remove)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">{t(OPS_KYB.remove)}</span>
                    </Button>

                    <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />

                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      className="h-8 rounded-full"
                    >
                      <label htmlFor={inputId} className="cursor-pointer">
                        <Upload className="size-3.5" aria-hidden />
                        {t(OPS_KYB.replace)}
                      </label>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface text-ink-3">
                      <Upload className="size-3.5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-none text-ink-2">{t(OPS_KYB.noDocument)}</p>
                      <p className="mt-1 hidden text-xs leading-none text-ink-3 sm:block">
                        PDF, JPG or PNG · filed to a private bucket, one object per requirement
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="secondary" size="sm" disabled={pending} className="h-8 rounded-full">
                    <label htmlFor={inputId} className="cursor-pointer">
                      <Upload className="size-3.5" aria-hidden />
                      {t(OPS_KYB.fileLabel)}
                    </label>
                  </Button>
                </div>
              )}

              {/* hidden input shared by both states */}
              <input
                id={inputId}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                disabled={pending}
                onChange={(event) => {
                  onChooseFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>

            {/* ── verdict ── */}
            <div className="mt-3 rounded-xl border border-border bg-bg px-3 py-3 sm:px-3.5 sm:py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-surface text-ink-3 shadow-sm ring-1 ring-border">
                  <FileText className="size-3.5" aria-hidden />
                </span>
                <p className="text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">Reviewer verdict</p>
                {isDirty && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-warning-ink">
                    <span className="size-1.5 rounded-full bg-warning" aria-hidden />
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-1.5 sm:w-[180px] sm:shrink-0">
                  <Label
                    htmlFor={`kyb-state-${requirement.docKey}`}
                    className="text-xs font-semibold text-ink-2"
                  >
                    {t(OPS_KYB.tableHead.standing)} — state
                  </Label>
                  <div className="relative">
                    <select
                      id={`kyb-state-${requirement.docKey}`}
                      value={state}
                      disabled={pending}
                      onChange={(event) => setState(event.target.value as KybState)}
                      className="h-9 w-full appearance-none rounded-lg border border-border-strong bg-surface px-3 pe-8 text-sm font-semibold text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label htmlFor={noteId} className="text-xs font-semibold text-ink-2">
                    {t(OPS_KYB.noteLabel)}
                    <span className="ml-1 font-normal text-ink-3">— why rejected, or what the next reviewer reads first</span>
                  </Label>
                  <Input
                    id={noteId}
                    value={note}
                    placeholder={t(OPS_KYB.notePlaceholder)}
                    onChange={(event) => setNote(event.target.value)}
                    className="h-9 bg-surface"
                  />
                </div>

                <Button
                  variant={isDirty ? "primary" : "secondary"}
                  onClick={() => onReview(state, note)}
                  disabled={pending}
                  type="button"
                  className="h-9 shrink-0 rounded-lg sm:self-end"
                >
                  {isDirty ? (
                    <CheckCircle2 className="size-4" aria-hidden />
                  ) : null}
                  {t(OPS_KYB.saveVerdict)}
                </Button>
              </div>

              {requirement.reviewedByName && (
                <p className="mt-2.5 flex items-center gap-1.5 border-t border-dashed border-border pt-2.5 text-xs leading-4 text-ink-3">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-ink-2">
                    {requirement.reviewedByName.slice(0, 1).toUpperCase()}
                  </span>
                  {t(OPS_KYB.reviewedBy).replace("{name}", requirement.reviewedByName)}
                  {requirement.checkedAt && (
                    <span className="text-ink-3">· {requirement.checkedAt.toISOString().slice(0, 10)}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
