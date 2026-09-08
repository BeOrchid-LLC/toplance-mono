"use client";

import * as React from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
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

  function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    startTransition(async () => {
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
        toast.success(t(INVITATION_ROSTER.sentAgainTemplate).replace("{email}", email));
      } else {
        toast.warning(
          t(INVITATION_ROSTER.couldNotEmailTemplate).replace("{email}", email)
        );
      }
    });
  }

  return (
    <Button variant="tertiary" size="sm" onClick={submit} disabled={pending}>
      <Send /> {t(INVITATION_ROSTER.resend)}
    </Button>
  );
}

export function RevokeInvitationButton({
  invitationId,
  action,
}: {
  invitationId: string;
  action: (formData: FormData) => Promise<RevokeResult>;
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t(INVITATION_ROSTER.revoked));
    });
  }

  return (
    <Button variant="tertiary" size="sm" onClick={submit} disabled={pending}>
      <X /> {t(INVITATION_ROSTER.revoke)}
    </Button>
  );
}
