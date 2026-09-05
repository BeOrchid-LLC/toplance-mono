"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setVisaExpiry } from "@/app/(app)/actions";

const inputClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

/**
 * The one field on the renewal card, and the only place this product
 * ever acquires an expiry date.
 *
 * Its own component rather than a row in `profile-fields.tsx`: those
 * rows all save through `updateProfile` and belong to the person, while
 * this belongs to the application and saves through `setVisaExpiry`.
 *
 * The copy is careful on purpose. It asks the traveller to read the date
 * off their own document, and never suggests we know it — because we do
 * not, and the whole renewal card is built on not pretending otherwise.
 */
export function VisaExpiryField({
  applicationId,
  expiresOn,
}: {
  applicationId: string;
  /** `YYYY-MM-DD`, or null when the traveller has not told us. */
  expiresOn: string | null;
}) {
  const [editing, setEditing] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const save = (formData: FormData) =>
    startTransition(async () => {
      const result = await setVisaExpiry(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(formData.get("visa_expires_on") ? "Saved" : "Date removed");
      setEditing(false);
    });

  if (!editing) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        {expiresOn ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Change the expiry date
          </Button>
        ) : (
          <>
            <p className="t-muted">
              Tell us the expiry date printed on your visa and we will remind
              you before it runs out.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => setEditing(true)}
            >
              Add your expiry date
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <form
      action={save}
      onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
      className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
    >
      <input type="hidden" name="application_id" value={applicationId} />
      <Label htmlFor="visa_expires_on">Expiry date on your visa</Label>
      <input
        id="visa_expires_on"
        name="visa_expires_on"
        type="date"
        defaultValue={expiresOn ?? ""}
        className={inputClass}
      />
      <p className="t-muted">
        Leave it empty to remove the date. We never check it against
        anything — it is only used to time your reminders.
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
