"use client";

import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { revokeInvitation } from "@/app/employer/actions";

/** One row's own revoke act — only ever rendered on a `pending` row. */
export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const formData = new FormData();
    formData.set("invitation_id", invitationId);

    startTransition(async () => {
      const result = await revokeInvitation(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation revoked");
    });
  }

  return (
    <Button variant="tertiary" size="sm" onClick={submit} disabled={pending}>
      <X /> Revoke
    </Button>
  );
}
