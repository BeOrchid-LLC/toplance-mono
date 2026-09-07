"use client";

import * as React from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setCaseHandler } from "@/app/[locale]/agency/actions";
import { useT } from "@/components/locale-provider";
import { CASE_COMMON } from "@/lib/i18n/case-review-actions";

/**
 * Take an unheld case, from the roster rather than from inside it.
 *
 * It has to be here, because since 2026-09-07 a reviewer cannot open a
 * case nobody has taken — `handlesCase` refuses it, and the case screen
 * with it. What they can still do is claim it: `canAssignCase` is
 * deliberately wider, and the row this button sits on carries a name, a
 * route and a completion score, which is everything the progress view
 * holds and nothing a document could hide in.
 *
 * `claimCase` refuses if somebody won the race, so two reviewers
 * clicking at once end with one holder and one honest error.
 */
export function TakeCaseButton({
  applicationId,
  viewerId,
}: {
  applicationId: string;
  viewerId: string;
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();

  function take() {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("assignee_id", viewerId);

    startTransition(async () => {
      const result = await setCaseHandler(formData);
      if ("error" in result) toast.error(result.error);
    });
  }

  return (
    <Button size="sm" onClick={take} disabled={pending}>
      <UserCheck /> {t(CASE_COMMON.takeCase)}
    </Button>
  );
}
