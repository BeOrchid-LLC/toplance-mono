"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/locale-provider";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";

/**
 * The composer, on both sides of a support thread.
 *
 * The action is a prop rather than an import, which is the whole
 * reason one component serves both consoles: ops posts through
 * `replyToSupport` and an agency through `replyAsAgency`, and each
 * gate belongs to its own console. Everything the reader sees — the
 * label, the placeholder, the toast — is the same, because it is the
 * same conversation.
 *
 * Sending adds a message and takes nothing away, so no confirmation.
 */
export function SupportReply({
  requestId,
  action,
}: {
  requestId: string;
  action: (formData: FormData) => Promise<{ error?: string } | { ok: true }>;
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();
  const [body, setBody] = React.useState("");

  function submit() {
    const formData = new FormData();
    formData.set("request_id", requestId);
    formData.set("body", body);

    startTransition(async () => {
      const result = await action(formData);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setBody("");
      toast.success(t(OPS_SUPPORT.replySent));
    });
  }

  return (
    <div>
      <label className="t-label" htmlFor="support-reply">
        {t(OPS_SUPPORT.replyLabel)}
      </label>
      <Textarea
        id="support-reply"
        className="mt-2"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t(OPS_SUPPORT.replyPlaceholder)}
        rows={5}
        maxLength={4000}
        disabled={pending}
      />
      <Button
        type="button"
        className="mt-4"
        disabled={pending || !body.trim()}
        onClick={submit}
      >
        {t(OPS_SUPPORT.replySend)}
      </Button>
    </div>
  );
}
