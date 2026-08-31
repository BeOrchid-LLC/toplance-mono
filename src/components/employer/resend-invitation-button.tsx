"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resendInvitation } from "@/app/employer/actions";

/**
 * One row's own resend act — only ever rendered on a `pending` row, the
 * same rule the revoke button follows.
 *
 * The message names the address rather than saying "sent", because the
 * whole reason someone presses this is that they doubt the first one
 * arrived, and the most useful thing to show them is where it went — a
 * typo in the address is the likeliest cause.
 */
export function ResendInvitationButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    startTransition(async () => {
      const result = await resendInvitation(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation sent again to ${email}`);
    });
  }

  return (
    <Button variant="tertiary" size="sm" onClick={submit} disabled={pending}>
      <Send /> Resend
    </Button>
  );
}
