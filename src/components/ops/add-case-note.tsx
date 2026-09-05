"use client";

import * as React from "react";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCaseNote } from "@/app/ops/actions";
import { useT } from "@/components/locale-provider";
import { OPS_ADD_NOTE } from "@/lib/i18n/ops-case-actions";

/**
 * The desk's note composer. The placeholder says who reads it, for the
 * same reason the flag reason's does: a note is written to the
 * traveller as much as about them.
 */
export function AddCaseNote({ applicationId }: { applicationId: string }) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();
  const [body, setBody] = React.useState("");

  function submit() {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("body", body);

    startTransition(async () => {
      const result = await addCaseNote(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setBody("");
      toast.success(t(OPS_ADD_NOTE.toastSuccess));
    });
  }

  return (
    <div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t(OPS_ADD_NOTE.placeholder)}
        rows={3}
      />
      <Button
        size="sm"
        className="mt-3"
        onClick={submit}
        disabled={pending || !body.trim()}
      >
        <NotebookPen /> {t(OPS_ADD_NOTE.button)}
      </Button>
    </div>
  );
}
