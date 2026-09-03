"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveCorridor, rejectCorridor } from "@/app/ops/actions";

/**
 * The two decisions an owner can take on a drafted corridor.
 *
 * `canApprove` is decided by the server component that renders this, the
 * same way `ClaimButton` is only ever handed the exits its caller has
 * already worked out. A reviewer sees the draft and the sources in full
 * — reading it is the point of letting them in — but gets no controls.
 * The action re-checks anyway: a server action is a POST endpoint with a
 * public id, not a private function of the page that drew its button.
 */
export function CorridorDecision({
  corridorId,
  canApprove,
}: {
  corridorId: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [reason, setReason] = React.useState("");
  const [rejecting, setRejecting] = React.useState(false);

  if (!canApprove) {
    return (
      <p className="t-muted max-w-[62ch]">
        Only a super admin can approve a corridor. You can read this draft
        and its sources, but the decision is not yours to record.
      </p>
    );
  }

  function decide(action: "approve" | "reject") {
    const formData = new FormData();
    formData.set("corridor_id", corridorId);
    if (action === "reject") formData.set("reason", reason);

    startTransition(async () => {
      const result = await (action === "approve"
        ? approveCorridor(formData)
        : rejectCorridor(formData));

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "approve"
          ? "Approved — travellers on this corridor see it now"
          : "Sent back with your reason"
      );
      setReason("");
      setRejecting(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The confirmation is the sentence above the button rather than a
          dialog. What makes this decision weighty is not that it is hard
          to undo — a further version supersedes it — but that it is
          immediately public, and that is worth saying in words. */}
      <p className="t-muted max-w-[62ch]">
        Approving publishes this version to every traveller on the
        corridor and records you as the person who checked it.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => decide("approve")} disabled={pending}>
          <CheckCircle2 /> Approve and publish
        </Button>
        {!rejecting && (
          <Button
            variant="tertiary"
            onClick={() => setRejecting(true)}
            disabled={pending}
          >
            <XCircle /> Send back
          </Button>
        )}
      </div>

      {rejecting && (
        <div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What is wrong with this draft? Whoever redrafts it reads this."
            rows={3}
          />
          <div className="mt-3 flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => decide("reject")}
              disabled={pending || !reason.trim()}
            >
              Send back
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setRejecting(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
