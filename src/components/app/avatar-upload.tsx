"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { uploadAvatar } from "@/app/(app)/actions";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * The photo window on the traveller's data page, now a real one. A
 * passport photo is a portrait rectangle, not a circle — the geometry is
 * unchanged from the initials placeholder it replaces; the circle in the
 * app bar stays a circle.
 *
 * The whole window is the control: a labelled file input styled as the
 * frame, with a camera strip along the foot naming the action. The
 * `accept` list mirrors `validateAvatarFile` — the server still decides,
 * this only keeps the picker honest.
 */
export function AvatarUpload({
  fullName,
  avatarUrl,
}: {
  fullName: string;
  avatarUrl: string | null;
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
      const result = await uploadAvatar(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Photo saved");
    });
  };

  return (
    <label
      className={
        "group relative grid h-20 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-border-strong bg-[color-mix(in_srgb,var(--brand)_10%,var(--surface))] text-[20px] font-bold tracking-wide text-brand-text shadow-[inset_0_1px_3px_rgb(16_19_28/0.08)] focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)] sm:h-24 sm:w-20 sm:text-[22px]" +
        (pending ? " opacity-60" : "")
      }
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        disabled={pending}
        aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
        className="sr-only"
      />

      {avatarUrl ? (
        // A signed, short-lived URL — next/image's optimizer would cache
        // a link that expires in ten minutes, so the plain element is
        // the correct one here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`${fullName || "Traveller"}'s profile photo`}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(fullName)}</span>
      )}

      {/* The action named on the frame itself, the way a form frame is
          labelled — visible on hover and focus, and always when there is
          no photo yet, so the window never reads as decoration. */}
      <span
        aria-hidden
        className={
          "absolute inset-x-0 bottom-0 grid place-items-center bg-ink/60 py-1 text-bg transition-opacity " +
          (avatarUrl
            ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            : "opacity-100")
        }
      >
        <Camera className="size-4" />
      </span>
    </label>
  );
}
