"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganisation } from "@/app/employer/actions";

/**
 * A brand-new employer's only act on this screen: name the
 * organisation. `createOrganisation` decides everything else — who may
 * do this, and what it writes — so the form just carries the name and
 * reports the result.
 */
export function CreateOrganisation({
  defaultName = "",
}: {
  /**
   * The name a director already typed at sign-up, when the transaction
   * refused it. Prefilled so the fix is an edit rather than a retype of
   * something long enough to have been rejected for its length.
   */
  defaultName?: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createOrganisation(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Organisation created");
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Organisation name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="organization"
          placeholder="Acme Logistics Ltd"
          defaultValue={defaultName}
          maxLength={160}
          required
        />
      </div>
      <Button type="submit" size="block" disabled={pending}>
        {pending ? "Creating…" : "Create organisation"}
      </Button>
    </form>
  );
}
