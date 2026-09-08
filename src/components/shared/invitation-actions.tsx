"use client";

import * as React from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/components/locale-provider";
import { fill } from "@/lib/i18n/fill";
import { INVITATION_ROSTER } from "@/lib/i18n/invitation-roster";

/**
 * The two acts on a pending invitation, shared by both consoles.
 *
 * They take their server action as a prop rather than importing one.
 * These used to live under `components/agency/` and import the agency's
 * actions directly, which made them unusable from `/ops` — and the
 * alternative was a second copy of a roster that already renders exactly
 * these rows.
 *
 * The toasts were English literals until this move: a Yoruba director
 * revoking an invitation was told "Invitation revoked" in English. They
 * are localised here, which changes what the agency console says as well
 * — deliberately, and it is a fix rather than a side effect.
 */

/**
 * What these buttons need back, which is less than either action
 * promises. Written as what is *read* here — an error, or a delivery
 * flag — so a console can hand over its own action without having to
 * match a result type letter for letter.
 *
 * `delivered` is not the same as `ok`: the invitation was written either
 * way, and the email is the part that can silently fail.
 */
export type ResendResult = { error: string } | { ok: boolean; delivered: boolean };
export type RevokeResult = { error: string } | { ok: boolean };

/**
 * A trigger, the question it raises, and the two answers to it.
 *
 * Both acts reach somebody outside this screen: a revoke kills a link a
 * person may be holding open in another tab, and a resend puts a second
 * letter in their inbox. Neither asked anything before firing, and both
 * sit as small text buttons at the end of a table row — the easiest
 * thing on this page to hit while aiming for the row above. Client's
 * call, 2026-09-08.
 *
 * One component for both because the pair differ only in their words and
 * in which button carries the weight; two dialogs would be the same
 * markup twice, drifting.
 *
 * The dismissal never says "Cancel", and `confirmRevokeDismiss` in
 * `invitation-roster.ts` carries the reason: in five of this product's
 * ten languages the word for "cancel" *is* the word for "revoke", so
 * that pair would put two identical buttons side by side with no way to
 * tell the destructive one from the way out. Both dismissals name what
 * they leave alone instead.
 */
function ConfirmedAction({
  trigger,
  title,
  body,
  confirmLabel,
  confirmVariant,
  dismissLabel,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  /** `danger` for the revoke; the resend is an ordinary primary act. */
  confirmVariant: "primary" | "danger";
  dismissLabel: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {/* Narrower than the 560px default. This asks one question about
          one row; a sheet the width of the invite form would suggest
          there is something here to fill in. */}
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {/* Leaving is the safe answer, so it is the one you can reach
              without reading: the dismissal is a real button rather than
              a text link, and the act it guards is the one that has to
              be aimed at. */}
          <DialogClose asChild>
            <Button variant="neutral" size="sm" disabled={pending}>
              {dismissLabel}
            </Button>
          </DialogClose>
          <Button
            variant={confirmVariant}
            size="sm"
            disabled={pending}
            onClick={() =>
              // Closed after the action settles, not before it: the
              // toast is the only report either act makes, and a dialog
              // that vanishes on the click would leave a failed revoke
              // looking exactly like a successful one.
              startTransition(async () => {
                await onConfirm();
                setOpen(false);
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResendInvitationButton({
  invitationId,
  email,
  action,
}: {
  invitationId: string;
  email: string;
  action: (formData: FormData) => Promise<ResendResult>;
}) {
  const t = useT();

  async function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    const result = await action(formData);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    // Resending is the documented remedy for an invitation that did
    // not arrive. Reporting a second silent failure as success is how
    // someone presses this four times and still wonders why nobody
    // has joined. The message names the address rather than saying
    // "sent", because a typo there is the likeliest cause.
    if (result.delivered) {
      toast.success(fill(t(INVITATION_ROSTER.sentAgainTemplate), { email }));
    } else {
      toast.warning(fill(t(INVITATION_ROSTER.couldNotEmailTemplate), { email }));
    }
  }

  return (
    <ConfirmedAction
      trigger={
        <Button variant="tertiary" size="sm">
          <Send /> {t(INVITATION_ROSTER.resend)}
        </Button>
      }
      title={t(INVITATION_ROSTER.confirmResendTitle)}
      // The address is the whole point of the question. A resend aimed
      // at a typo is the failure this dialog exists to catch, and it is
      // only catchable if the dialog says which address it is aimed at.
      body={fill(t(INVITATION_ROSTER.confirmResendBody), { email })}
      confirmLabel={t(INVITATION_ROSTER.confirmResendConfirm)}
      confirmVariant="primary"
      dismissLabel={t(INVITATION_ROSTER.confirmResendDismiss)}
      onConfirm={submit}
    />
  );
}

export function RevokeInvitationButton({
  invitationId,
  email,
  action,
}: {
  invitationId: string;
  /** Named in the confirmation, for the same reason the resend names it. */
  email: string;
  action: (formData: FormData) => Promise<RevokeResult>;
}) {
  const t = useT();

  async function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    const result = await action(formData);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(t(INVITATION_ROSTER.revoked));
  }

  return (
    <ConfirmedAction
      trigger={
        <Button variant="tertiary" size="sm">
          <X /> {t(INVITATION_ROSTER.revoke)}
        </Button>
      }
      title={t(INVITATION_ROSTER.confirmRevokeTitle)}
      body={fill(t(INVITATION_ROSTER.confirmRevokeBody), { email })}
      confirmLabel={t(INVITATION_ROSTER.confirmRevokeConfirm)}
      confirmVariant="danger"
      dismissLabel={t(INVITATION_ROSTER.confirmRevokeDismiss)}
      onConfirm={submit}
    />
  );
}
