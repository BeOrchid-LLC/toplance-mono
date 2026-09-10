"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
import { DOCUMENTS } from "@/lib/i18n/documents";
import { submitApplication } from "@/app/[locale]/(app)/actions";

export function SubmitButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  // These three were the only English left on this screen: a Hausa
  // reader finished their checklist and was told they had succeeded in
  // a language they had not chosen anywhere in this product.
  const t = useT();

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
          toast.success(t(DOCUMENTS.submitToast));
          router.refresh();
        })
      }
    >
      <Send /> {pending ? t(DOCUMENTS.submitPending) : t(DOCUMENTS.submitCta)}
    </Button>
  );
}
