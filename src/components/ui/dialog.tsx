"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * The dialog box, capped at the viewport and never scrolled as a whole.
 *
 * It used to centre with `top-1/2 -translate-y-1/2` and nothing else, so
 * a form taller than the window ran off both ends at once: the title and
 * the close button above the top edge, the submit button below the
 * bottom, and the page behind scroll-locked so neither could be reached.
 * The client could not finish "Book a demo" or "Create agency" on a
 * 1920x950 window (review of 2026-09-17).
 *
 * So the box is a flex column capped at `100dvh - 2rem`, and the box
 * itself does not scroll — if it did, the close button, which is
 * positioned inside it, would scroll away with the title. A long dialog
 * puts its fields in `DialogBody`, the one part that scrolls, between a
 * `DialogHeader` and a `DialogFooter` that stay put. A short dialog that
 * never adopts `DialogBody` lays out exactly as it did: the `gap-5`
 * between children is the same gap the old grid had.
 *
 * A form wraps its `DialogBody` and `DialogFooter` together, and takes
 * `flex min-h-0 flex-1 flex-col gap-5` so it is the column the two sit
 * in. That keeps the submit button a real descendant of the `<form>` —
 * Enter submits, `action` and `onSubmit` see it — while the body can
 * still shrink.
 *
 * The width is `100% - 2rem` up to 560px rather than `w-full`, which on
 * a phone narrower than 560px put the box flush against both edges of
 * the screen with its border drawn on the glass.
 */
function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-[rgb(10_14_40/0.45)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-lg)]",
          "duration-[var(--dur-sheet)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute end-4 top-4 grid size-[var(--row-h)] place-items-center rounded-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  // `pe-12`, not `pr-12`: the strip kept clear of the close button, which
  // sits at `end-4` and so swaps sides in Arabic.
  return (
    <div data-slot="dialog-header" className={cn("shrink-0 pe-12", className)} {...props} />
  );
}

/**
 * The part of a long dialog that scrolls.
 *
 * `min-h-0` is what lets it shrink below its content inside the capped
 * column; without it a flex item refuses to be shorter than what it
 * holds and the box overflows as before.
 *
 * The negative margin and matching padding give the scroll area the
 * box's full width and a few pixels above and below, so the scrollbar
 * sits at the box's edge and a focused field's ring — drawn 2px outside
 * it, 2px wide (`:focus-visible` in globals.css) — is not clipped by the
 * `overflow` it needs. The fields land exactly where they would without
 * it.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("-mx-6 -my-2 min-h-0 flex-1 overflow-y-auto px-6 py-2", className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("t-h3", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("t-muted mt-2", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex shrink-0 flex-wrap items-center justify-end gap-3", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};
