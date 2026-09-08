"use client";

import * as React from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
 *
 * Both ask before they commit, and both ask through `ConfirmDialog` —
 * the rule and the component `AGENTS.md` names. Only the revoke is
 * destructive; the resend's reason for asking is on
 * `INVITATION_ROSTER.resendConfirmTitle`.
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
 * Additive — it puts a second link in an inbox and invalidates nothing,
 * so `confirmVariant` is the ordinary primary rather than `danger`.
 * It confirms all the same, because it sits a hand's breadth from the
 * revoke at the end of the same row and what it sends cannot be recalled.
 */
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
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
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
    });
  }

  return (
    <>
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => setConfirming(true)}
        disabled={pending}
      >
        <Send /> {t(INVITATION_ROSTER.resend)}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t(INVITATION_ROSTER.resendConfirmTitle)}
        // The address is the whole point of the question. A resend aimed
        // at a typo is the failure this dialog exists to catch, and it is
        // only catchable if the dialog says which address it is aimed at.
        body={fill(t(INVITATION_ROSTER.resendConfirmBody), { email })}
        confirmLabel={t(INVITATION_ROSTER.resend)}
        confirmVariant="primary"
        cancelLabel={t(INVITATION_ROSTER.notNow)}
        icon={<Send />}
        pending={pending}
        onConfirm={submit}
      />
    </>
  );
}

/**
 * Destructive, and the only one of the pair that is: revoking kills the
 * link on the spot and there is no un-revoke — the way back in is a new
 * invitation. It takes `email` for the same reason `ResendInvitationButton`
 * does, so the question can name the address rather than leave the
 * operator matching a dialog to a row.
 */
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
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      toast.success(t(INVITATION_ROSTER.revoked));
    });
  }

  return (
    <>
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => setConfirming(true)}
        disabled={pending}
      >
        <X /> {t(INVITATION_ROSTER.revoke)}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={fill(t(INVITATION_ROSTER.revokeConfirmTitle), { email })}
        body={t(INVITATION_ROSTER.revokeConfirmBody)}
        confirmLabel={t(INVITATION_ROSTER.revoke)}
        cancelLabel={t(INVITATION_ROSTER.keepInvitation)}
        icon={<X />}
        pending={pending}
        onConfirm={submit}
      />
    </>
  );
}
