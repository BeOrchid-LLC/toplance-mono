"use client";

import * as React from "react";
import { FilePlus } from "lucide-react";
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
import { requestDocument } from "@/app/[locale]/agency/actions";
import { useT } from "@/components/locale-provider";
import { DOCUMENT_REQUESTS } from "@/lib/i18n/document-requests";

/**
 * Ask this one traveller for a document the corridor never listed.
 *
 * The gap this closes is the one the client photographed on 10
 * September: the desk could send a case back saying "Additional
 * documents needed" and write a sentence about what it wanted, but had
 * nowhere to put the document. The traveller read "Everything is
 * verified. Nothing else is waiting on you" beside a status card asking
 * for documents, and had no upload button for the thing being asked for.
 *
 * A dialog, and beside `InviteAttendance` and `AskAboutCase` rather than
 * inside the decision panel, on the same argument those two make: asking
 * for a document is a detour from reviewing a case and happens once or
 * twice in a case's life, so it should not stand open above the verdict
 * buttons. It is deliberately *not* part of the send-back control —
 * a reviewer half-way through a file who spots a gap should be able to
 * ask and keep reading, without bouncing the case to
 * `additional_documents` to do it.
 *
 * Not a destructive control: it adds a requirement and takes nothing
 * away, so the button commits on the click with no confirmation. The
 * withdrawal beside it on the row is the one that asks.
 *
 * The name is free text and there is no catalogue to pick from, which is
 * a decision rather than an omission. `precheckDocument` takes an
 * `expectedName` string rather than a fixed key, so a reviewer can ask
 * for something nobody anticipated and the AI check still reads the
 * upload against it.
 */
export function RequestDocument({ applicationId }: { applicationId: string }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState("");
  const [guidance, setGuidance] = React.useState("");

  function submit() {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("name", name);
    formData.set("guidance", guidance);

    startTransition(async () => {
      const result = await requestDocument(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      // Cleared because the next request on this case is a different
      // document, not an edit of this one — the same reason
      // `InviteAttendance` clears its fields.
      setName("");
      setGuidance("");
      setOpen(false);
      toast.success(t(DOCUMENT_REQUESTS.sent));
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm">
          <FilePlus className="size-4" aria-hidden />
          {t(DOCUMENT_REQUESTS.trigger)}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(DOCUMENT_REQUESTS.panelTitle)}</DialogTitle>
          {/* The two things a reviewer has to know before typing: it
              reaches this traveller only, and it holds their submit
              until it is verified. The second is why the corridor is
              named as the alternative rather than left to be guessed. */}
          <DialogDescription>{t(DOCUMENT_REQUESTS.panelLead)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="t-label" htmlFor="request-document-name">
              {t(DOCUMENT_REQUESTS.nameLabel)}
            </label>
            <Input
              id="request-document-name"
              className="mt-2"
              value={name}
              placeholder={t(DOCUMENT_REQUESTS.namePlaceholder)}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </div>

          <div>
            <label className="t-label" htmlFor="request-document-guidance">
              {t(DOCUMENT_REQUESTS.guidanceLabel)}
            </label>
            <p className="t-muted mt-1 text-sm">
              {t(DOCUMENT_REQUESTS.guidanceHint)}
            </p>
            <Textarea
              id="request-document-guidance"
              className="mt-2"
              rows={3}
              value={guidance}
              placeholder={t(DOCUMENT_REQUESTS.guidancePlaceholder)}
              onChange={(e) => setGuidance(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex justify-end">
          {/* Disabled on an empty name rather than left to fail in the
              action: the transaction refuses a name that slugifies to
              nothing, and a red toast is a poor way to learn that the
              field you left blank was required. */}
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {t(DOCUMENT_REQUESTS.send)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
