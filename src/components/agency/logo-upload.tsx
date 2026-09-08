"use client";

import * as React from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { uploadOrgLogo } from "@/app/[locale]/agency/actions";

/**
 * The agency's own logo, picked from its director's profile screen.
 *
 * A wide window rather than the portrait one `AvatarUpload` uses, and
 * the difference is the point: a logo is a horizontal label, and a frame
 * shaped like a passport photo would invite a square crop of one. The
 * proportions here are roughly what the rail gives it — a strip about
 * 200px across and 28px tall — so what somebody sees while picking is
 * what lands.
 *
 * `object-contain` on a plain background, never `cover`: a logo cropped
 * to fill its box is a logo with its edges cut off, and the whole reason
 * to upload one is that it is a specific shape.
 *
 * The `accept` list mirrors `validateLogoFile` — the server still
 * decides, this only keeps the picker honest — and the whole window is
 * the control, the way the avatar's is.
 */
export function LogoUpload({
  orgName,
  logoUrl,
}: {
  orgName: string;
  logoUrl: string | null;
}) {
  const [pending, startTransition] = React.useTransition();

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow re-picking the same file after a failure.
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadOrgLogo(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Logo saved");
    });
  };

  return (
    <label
      className={
        "group relative flex h-20 w-full max-w-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border-strong bg-[color-mix(in_srgb,var(--brand)_10%,var(--surface))] px-4 text-center shadow-[inset_0_1px_3px_rgb(16_19_28/0.08)] focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]" +
        (pending ? " opacity-60" : "")
      }
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        disabled={pending}
        aria-label={logoUrl ? "Change agency logo" : "Add agency logo"}
        className="sr-only"
      />

      {logoUrl ? (
        // A signed, short-lived URL — next/image's optimizer would cache
        // a link that expires in ten minutes, so the plain element is the
        // correct one here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${orgName || "Agency"} logo`}
          className="max-h-12 w-auto max-w-full object-contain"
        />
      ) : (
        <span className="t-muted truncate" aria-hidden>
          {orgName}
        </span>
      )}

      {/* The action named on the frame itself — visible on hover and
          focus, and always when there is no logo yet, so the window never
          reads as decoration. */}
      <span
        aria-hidden
        className={
          "absolute inset-x-0 bottom-0 grid place-items-center bg-ink/60 py-1 text-bg transition-opacity " +
          (logoUrl
            ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            : "opacity-100")
        }
      >
        <ImagePlus className="size-4" />
      </span>
    </label>
  );
}
