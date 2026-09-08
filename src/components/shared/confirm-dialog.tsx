"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The gate a destructive control passes through before it commits.
 *
 * The project rule is in `AGENTS.md`: anything that takes access away,
 * deletes, or cuts someone off asks first. This exists so that rule has
 * one answer rather than ten — a dialog assembled by hand at each call
 * site is how "Are you sure?" ends up meaning something different on
 * every screen.
 *
 * It takes finished strings rather than translation records. The i18n
 * keys for a destructive action belong with the rest of that surface's
 * words, so `OPS_TENANTS` keeps them; a shared component reaching into
 * one surface's dictionary is how the next caller inherits a sentence
 * about agencies.
 *
 * `body` says what happens the moment the confirm button commits, in
 * the present tense. It is not a second copy of the sentence above the
 * button on the page — if the dialog can only repeat what the operator
 * has already read, it is a speed bump rather than a confirmation.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending = false,
  icon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  /** Disables both exits while the action is in flight. */
  pending?: boolean;
  /** Rendered inside the confirm button, ahead of its label. */
  icon?: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      /**
       * Escape and a click on the overlay are exits too, so `pending`
       * has to close them the same way it disables the buttons.
       * Otherwise the one dialog in the product whose whole job is to
       * be deliberate can be dismissed by a stray keypress while the
       * action it asked about is already in flight, leaving the
       * operator with no dialog and no answer.
       */
      onOpenChange={(next) => {
        if (pending && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {/* Cancel is the quiet one and it comes first. The destructive
              button is not the default action of this dialog, and
              styling it as the obvious next click would undo the point
              of asking. */}
          <Button
            type="button"
            variant="tertiary"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={onConfirm}
          >
            {icon}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
