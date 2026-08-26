"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/app/(app)/actions";

/**
 * The thread's composer. Cloned from `AddCaseNote` — same shape, same
 * `useTransition` + sonner idiom — but posts through the one shared
 * `sendMessage` action both sides of the desk call: the traveller here,
 * staff from the case screen.
 */
export function MessageComposer({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = React.useTransition();
  const [body, setBody] = React.useState("");

  function submit() {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("body", body);

    startTransition(async () => {
      const result = await sendMessage(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setBody("");
      toast.success("Message sent");
    });
  }

  return (
    <div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a message…"
        rows={3}
      />
      <Button
        size="sm"
        className="mt-3"
        onClick={submit}
        disabled={pending || !body.trim()}
      >
        <Send /> Send
      </Button>
    </div>
  );
}
