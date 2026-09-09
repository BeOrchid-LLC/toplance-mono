"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSupport } from "@/app/[locale]/agency/support/actions";
import { useT } from "@/components/locale-provider";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";

/**
 * Raise a support request from the case it is about.
 *
 * The Contact support page takes a subject and a body and nothing
 * else, so an agency asking about one traveller had to describe which
 * one in prose and an operator had to read it back. Started from here,
 * the request carries the application id and the queue shows the case
 * reference.
 *
 * A dialog rather than a page: this is a detour from reviewing a case,
 * and the case should still be there behind it when the question has
 * been asked.
 */
export function AskAboutCase({ applicationId }: { applicationId: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  function submit() {
    const formData = new FormData();
    formData.set("subject", subject);
    formData.set("body", body);
    formData.set("application_id", applicationId);

    startTransition(async () => {
      const result = await contactSupport(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSubject("");
      setBody("");
      setOpen(false);
      toast.success(t(OPS_SUPPORT.sent));
      // So the agency's own support list has it when they go looking.
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm">
          <LifeBuoy className="size-4" aria-hidden />
          {t(OPS_SUPPORT.askAboutCase)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(OPS_SUPPORT.askAboutCase)}</DialogTitle>
          <DialogDescription>{t(OPS_SUPPORT.askAboutCaseLead)}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label className="t-label" htmlFor="case-support-subject">
            {t(OPS_SUPPORT.subjectLabel)}
          </label>
          <Input
            id="case-support-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            disabled={pending}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="t-label" htmlFor="case-support-body">
            {t(OPS_SUPPORT.bodyLabel)}
          </label>
          <Textarea
            id="case-support-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t(OPS_SUPPORT.bodyPlaceholder)}
            rows={5}
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
      </DialogContent>
    </Dialog>
  );
}
