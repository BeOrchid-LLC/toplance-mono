"use client";

import * as React from "react";
import { UserCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { claimCase, releaseCase } from "@/app/ops/actions";

/**
 * Ownership, one button. Unassigned shows "Claim this case"; assigned
 * shows "Release" to whoever may act on it — the case's own owner, or
 * any staff member with `staff_role` `owner`. `canRelease` is decided by
 * the server component that renders this, the same way `StatusControl`
 * is only ever handed the exits its caller has already worked out.
 */
export function ClaimButton({
  applicationId,
  isAssigned,
  canRelease,
}: {
  applicationId: string;
  isAssigned: boolean;
  canRelease: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function submit(action: typeof claimCase, successMessage: string) {
    const formData = new FormData();
    formData.set("application_id", applicationId);

    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
    });
  }

  if (!isAssigned) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => submit(claimCase, "This case is now yours")}
        disabled={pending}
      >
        <UserCheck /> Claim this case
      </Button>
    );
  }

  if (!canRelease) return null;

  return (
    <Button
      variant="tertiary"
      size="sm"
      onClick={() => submit(releaseCase, "Released back to the queue")}
      disabled={pending}
    >
      <UserMinus /> Release
    </Button>
  );
}
