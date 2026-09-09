"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSupport } from "@/app/[locale]/agency/support/actions";
import { useT } from "@/components/locale-provider";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";

/**
 * The agency's way of reaching BeOrchid.
 *
 * Sending is additive, so there is no confirmation dialog — the toast
 * afterwards says "Sent", which is the confirmation that is actually
 * useful. The fields clear on success because the next message is a
 * different request rather than an edit of this one, and the list
 * underneath is where the sent one now lives.
 */
export function ContactSupport() {
  const t = useT();
  const [pending, startTransition] = React.useTransition();
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  function submit() {
    const formData = new FormData();
    formData.set("subject", subject);
    formData.set("body", body);

    startTransition(async () => {
      const result = await contactSupport(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSubject("");
      setBody("");
      toast.success(t(OPS_SUPPORT.sent));
    });
  }

  return (
    <div>
      <div>
        <label className="t-label" htmlFor="support-subject">
          {t(OPS_SUPPORT.subjectLabel)}
        </label>
        <Input
          id="support-subject"
          className="mt-2"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          disabled={pending}
        />
      </div>

      <div className="mt-4">
        <label className="t-label" htmlFor="support-body">
          {t(OPS_SUPPORT.bodyLabel)}
        </label>
        <Textarea
          id="support-body"
          className="mt-2"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t(OPS_SUPPORT.bodyPlaceholder)}
          rows={6}
          maxLength={4000}
          disabled={pending}
        />
      </div>

      <div className="mt-4">
        <Button
          type="button"
          disabled={pending || !subject.trim() || !body.trim()}
          onClick={submit}
        >
          {t(OPS_SUPPORT.send)}
        </Button>
      </div>
    </div>
  );
}
