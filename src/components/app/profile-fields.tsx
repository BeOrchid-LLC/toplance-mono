"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/auth/phone-field";
import { updateProfile } from "@/app/(app)/actions";
import { formatPhone } from "@/lib/domain/countries";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

/**
 * The profile rows a traveller owns, editable in place. Each row saves
 * only its own field — the action ignores anything absent from the
 * payload — so an interrupted edit can never blank a neighbour.
 *
 * Email is deliberately not here: it is the Clerk credential, and
 * changing it is a re-verification flow, not a text field.
 */

function useSave(close: () => void) {
  const [pending, startTransition] = React.useTransition();
  const save = (formData: FormData) =>
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved");
      close();
    });
  return { pending, save };
}

/** An answer nobody has given yet — an absence, never an invented value. */
function Absent() {
  return (
    <span
      aria-label="Not provided yet"
      className="inline-block w-[64px] border-b-2 border-dashed border-border-strong align-middle"
    />
  );
}

/**
 * Display mode matches the read-only `DetailRow` geometry exactly, plus
 * a pencil that swaps the row for its editor. The editor block carries
 * its own label, so the row heading does not double up.
 */
function Row({
  label,
  value,
  editor,
}: {
  label: string;
  value: React.ReactNode;
  editor: (close: () => void) => React.ReactNode;
}) {
  const [editing, setEditing] = React.useState(false);

  if (editing) {
    return (
      <div className="border-b border-border py-4">
        {editor(() => setEditing(false))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-3">
      <dt className="t-body shrink-0 text-ink-2">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 truncate text-right text-base font-semibold">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Edit ${label.toLowerCase()}`}
          onClick={() => setEditing(true)}
          className="-my-2 -mr-2 grid size-[var(--row-h)] shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
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
  return (
    <div className="mt-3 flex gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="neutral"
        onClick={onCancel}
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  );
}

const inputClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

export function EditableName({ fullName }: { fullName: string }) {
  return (
    <Row
      label="Full name"
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
  const { pending, save } = useSave(close);
  return (
    <form
      action={save}
      onKeyDown={(e) => e.key === "Escape" && close()}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="full_name">Full name, exactly as in your passport</Label>
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
  return (
    <Row
      label="Phone"
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
  const { pending, save } = useSave(close);
  return (
    <form action={save} onKeyDown={(e) => e.key === "Escape" && close()}>
      <PhoneField
        label="Mobile number"
        defaultCountry={countryIso}
        defaultDigits={digits}
        hint="Used by your case handler, never for marketing."
      />
      <SaveCancel pending={pending} onCancel={close} />
    </form>
  );
}

export function EditableLanguage({ locale }: { locale: Locale }) {
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  return (
    <Row
      label="Language"
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
  const { pending, save } = useSave(close);
  return (
    <form
      action={save}
      onKeyDown={(e) => e.key === "Escape" && close()}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="locale">Preferred language</Label>
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
