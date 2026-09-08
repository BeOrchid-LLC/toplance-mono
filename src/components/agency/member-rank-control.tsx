"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setTeamMemberRank } from "@/app/[locale]/agency/actions";
import { useT } from "@/components/locale-provider";
import { AGENCY } from "@/lib/i18n/agency";

/**
 * The one control on a colleague's page: which rank they hold.
 *
 * A single button naming the move rather than a pair of radios, because
 * there are exactly two ranks — the choice is always "make them the
 * other one", and offering the rank they already hold as a selectable
 * option invites a no-op submit.
 *
 * No confirmation step. `CorridorDecision` and `StatusControl` both take
 * the same position for the same reason: the thing being changed is on
 * screen, a dialog would cover it, and this is reversible by clicking
 * once more. The one genuinely destructive case — a director demoting
 * themselves out of an agency's only directorship — is refused by
 * `setMemberRole` inside the transaction, and the refusal says why.
 */
export function MemberRankControl({
  userId,
  rank,
}: {
  userId: string;
  rank: "owner" | "reviewer";
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();

  const next = rank === "owner" ? "reviewer" : "owner";
  const label = next === "owner" ? AGENCY.makeDirector : AGENCY.makeTravelAgent;

  function submit() {
    const formData = new FormData();
    formData.set("user_id", userId);
    formData.set("rank", next);

    startTransition(async () => {
      const result = await setTeamMemberRank(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t(AGENCY.rankChanged));
    });
  }

  return (
    <div>
      <p className="t-muted max-w-[62ch]">{t(AGENCY.rankHelp)}</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        disabled={pending}
        onClick={submit}
      >
        {t(label)}
      </Button>
    </div>
  );
}
