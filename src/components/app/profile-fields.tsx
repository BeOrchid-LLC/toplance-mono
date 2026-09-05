"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/auth/phone-field";
import { updateProfile } from "@/app/(app)/actions";
import { formatPhone } from "@/lib/domain/countries";
import { DIGEST_OPTIONS, type DigestFrequency } from "@/lib/domain/digest";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { useT } from "@/components/locale-provider";
import { PROFILE_FIELDS } from "@/lib/i18n/profile-fields";

/**
 * The profile rows a traveller owns, editable in place. Each row saves
 * only its own field — the action ignores anything absent from the
 * payload — so an interrupted edit can never blank a neighbour.
 *
 * Email is deliberately not here: it is the Clerk credential, and
 * changing it is a re-verification flow, not a text field.
 */

function useSave(close: () => void) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();
  const save = (formData: FormData) =>
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t(PROFILE_FIELDS.saved));
      close();
    });
  return { pending, save };
}

/** An answer nobody has given yet — an absence, never an invented value. */
function Absent() {
  const t = useT();
  return (
    <span
      aria-label={t(PROFILE_FIELDS.notProvidedAria)}
      className="inline-block w-[64px] border-b-2 border-dashed border-border-strong align-middle"
    />
  );
}

/**
 * Display mode matches the read-only `DetailField` geometry exactly —
 * caps label over a wrapping value — plus a pencil that swaps the field
 * for its editor. The editor block carries its own label, so the field
 * heading does not double up; while editing, the field takes the full
 * width of the sheet so the input has room to breathe.
 */
function Row({
  label,
  editAriaLabel,
  value,
  editor,
}: {
  label: string;
  /** Full sentence, not derived from `label` — some scripts have no case to lower. */
  editAriaLabel: string;
  value: React.ReactNode;
  editor: (close: () => void) => React.ReactNode;
}) {
  const [editing, setEditing] = React.useState(false);

  if (editing) {
    return (
      <div className="border-b border-border py-4 sm:col-span-2">
        {editor(() => setEditing(false))}
      </div>
    );
  }

  return (
    <div className="border-b border-border py-3">
      <dt className="special-caps">{label}</dt>
      <dd className="mt-1 flex items-center justify-between gap-2">
        <span className="min-w-0 break-words text-base font-semibold">
          {value}
        </span>
        <button
          type="button"
          aria-label={editAriaLabel}
          onClick={() => setEditing(true)}
          className="-my-2 -me-2 grid size-[var(--row-h)] shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Pencil className="size-4" />
        </button>
      </dd>
    </div>
  );
}

function SaveCancel({
  pending,
  onCancel,
}: {
  pending: boolean;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-3 flex gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t(PROFILE_FIELDS.saving) : t(PROFILE_FIELDS.save)}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="neutral"
        onClick={onCancel}
        disabled={pending}
      >
        {t(PROFILE_FIELDS.cancel)}
      </Button>
    </div>
  );
}

const inputClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

export function EditableName({ fullName }: { fullName: string }) {
  const t = useT();
  return (
    <Row
      label={t(PROFILE_FIELDS.fullNameLabel)}
      editAriaLabel={t(PROFILE_FIELDS.editFullNameAria)}
      value={fullName || <Absent />}
      editor={(close) => {
        return <NameEditor fullName={fullName} close={close} />;
      }}
    />
  );
}

function NameEditor({
  fullName,
  close,
}: {
  fullName: string;
  close: () => void;
}) {
  const t = useT();
  const { pending, save } = useSave(close);
  return (
    <form
      action={save}
      onKeyDown={(e) => e.key === "Escape" && close()}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="full_name">{t(PROFILE_FIELDS.fullNameFieldLabel)}</Label>
      <input
        id="full_name"
        name="full_name"
        defaultValue={fullName}
        autoFocus
        autoComplete="name"
        className={inputClass}
      />
      <SaveCancel pending={pending} onCancel={close} />
    </form>
  );
}

export function EditablePhone({
  countryIso,
  digits,
}: {
  countryIso: string;
  /** National digits only — the dial code comes from the country. */
  digits: string;
}) {
  const t = useT();
  return (
    <Row
      label={t(PROFILE_FIELDS.phoneLabel)}
      editAriaLabel={t(PROFILE_FIELDS.editPhoneAria)}
      value={digits ? formatPhone(countryIso, digits) : <Absent />}
      editor={(close) => (
        <PhoneEditor countryIso={countryIso} digits={digits} close={close} />
      )}
    />
  );
}

function PhoneEditor({
  countryIso,
  digits,
  close,
}: {
  countryIso: string;
  digits: string;
  close: () => void;
}) {
  const t = useT();
  const { pending, save } = useSave(close);
  return (
    <form action={save} onKeyDown={(e) => e.key === "Escape" && close()}>
      <PhoneField
        label={t(PROFILE_FIELDS.mobileNumberLabel)}
        defaultCountry={countryIso}
        defaultDigits={digits}
        hint={t(PROFILE_FIELDS.phoneHint)}
      />
      <SaveCancel pending={pending} onCancel={close} />
    </form>
  );
}

export function EditableLanguage({ locale }: { locale: Locale }) {
  const t = useT();
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  return (
    <Row
      label={t(PROFILE_FIELDS.languageLabel)}
      editAriaLabel={t(PROFILE_FIELDS.editLanguageAria)}
      value={current.native}
      editor={(close) => <LanguageEditor locale={locale} close={close} />}
    />
  );
}

function LanguageEditor({
  locale,
  close,
}: {
  locale: Locale;
  close: () => void;
}) {
  const t = useT();
  const { pending, save } = useSave(close);
  return (
    <form
      action={save}
      onKeyDown={(e) => e.key === "Escape" && close()}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="locale">{t(PROFILE_FIELDS.preferredLanguageLabel)}</Label>
      <select id="locale" name="locale" defaultValue={locale} className={inputClass}>
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
      <SaveCancel pending={pending} onCancel={close} />
    </form>
  );
}

/**
 * Re-exported under its old name so the profile page keeps one import
 * for the editor and the type it takes. The list itself now lives in
 * `@/lib/domain/digest` — the cron route enforces the same cadences,
 * and two copies of "how often" would drift the day one is widened.
 */
export type CompanionDigest = DigestFrequency;

export function EditableDigest({ digest }: { digest: CompanionDigest }) {
  const t = useT();
  const current = DIGEST_OPTIONS.find((d) => d.value === digest) ?? DIGEST_OPTIONS[0];
  return (
    <Row
      label={t(PROFILE_FIELDS.digestLabel)}
      editAriaLabel={t(PROFILE_FIELDS.editDigestAria)}
      // `current.label` ("Weekly", "Daily"…) comes from
      // `@/lib/domain/digest`, a shared file outside this translation
      // pass's ownership — left in English on purpose, see the handover.
      value={current.label}
      editor={(close) => <DigestEditor digest={digest} close={close} />}
    />
  );
}

function DigestEditor({
  digest,
  close,
}: {
  digest: CompanionDigest;
  close: () => void;
}) {
  const t = useT();
  const { pending, save } = useSave(close);
  return (
    <form
      action={save}
      onKeyDown={(e) => e.key === "Escape" && close()}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="companion_digest">{t(PROFILE_FIELDS.digestFieldLabel)}</Label>
      <select
        id="companion_digest"
        name="companion_digest"
        defaultValue={digest}
        className={inputClass}
      >
        {DIGEST_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      {/* This switch governs the safety-advisory email too, so it has to
          say so — a setting a traveller believes covers everything and
          quietly does not is worse than no setting. Visa-expiry
          reminders are named as the exception rather than left for
          someone to discover, because turning updates off and then
          missing a date on your own leave to remain is not a surprise
          anyone should get from us. */}
      <p className="t-muted">{t(PROFILE_FIELDS.digestNote)}</p>
      <SaveCancel pending={pending} onCancel={close} />
    </form>
  );
}
