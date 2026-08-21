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
          if (result?.error) {
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
