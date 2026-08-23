"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { submitApplication } from "@/app/(app)/actions";

export function SubmitButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  return (
    <Button
      variant="success"
      className="mt-4"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await submitApplication(applicationId);
          // A discriminated union now, so the failure case cannot be
          // read past by accident.
          if ("error" in result) {
            toast.error(result.error);
            return;
          }
          toast.success("Submitted — the review team has been notified");
          router.refresh();
        })
      }
    >
      <Send /> {pending ? "Submitting…" : "Submit my application"}
    </Button>
  );
}
