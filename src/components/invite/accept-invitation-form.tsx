"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/app/invite/actions";

/**
 * The only write on the accept surface, and the only place this button
 * exists — an explicit click, posting to a server action, never a form
 * whose `action` could fire from a prefetch or a GET. Success redirects
 * from inside `acceptInvitation` itself, so there is no success branch
 * here to handle.
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const [pending, startTransition] = React.useTransition();

  function onSubmit() {
    startTransition(async () => {
      const result = await acceptInvitation(token);
      if (result && "error" in result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="mt-8">
      <Button type="submit" size="block" disabled={pending}>
        {pending ? "Accepting…" : "Accept invitation"}
      </Button>
    </form>
  );
}
