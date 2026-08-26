"use client";

import * as React from "react";
import { Check, Copy, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteTraveller } from "@/app/employer/actions";
import { DESTINATION_ISO, PURPOSE_ISO } from "@/lib/domain/corridors";

const inputClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

/**
 * The invite form and its result, both behind one trigger. `email` is
 * the only field `createInvitation` requires; the rest — full name, job
 * title, destination, purpose — prefill the accept page and, later, the
 * intake this invitee will run (deferred by design; see Task 10's brief).
 *
 * On success the dialog does not close: it swaps the form for the
 * link `inviteTraveller` returned. `sendEmail` no-ops without
 * `RESEND_API_KEY` (true in local dev), so the copyable link is not a
 * fallback for that case — it is the primary hand-off, the email a
 * bonus when Resend is configured.
 */
export function InviteDialog() {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteTraveller(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setInviteUrl(result.inviteUrl);
      toast.success("Invitation sent");
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset once the close animation has somewhere to land, so a
      // reopen never flashes the previous invite's link for a frame.
      setInviteUrl(null);
      setCopied(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    // `navigator.clipboard` throws (or is simply absent) outside a
    // secure context — an http, non-localhost deploy, say. Uncaught,
    // that is a dead button with no feedback; caught, the link is still
    // right there in the dialog to select by hand.
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the link text instead.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Mail /> Invite someone
        </Button>
      </DialogTrigger>
      <DialogContent>
        {inviteUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation sent</DialogTitle>
              <DialogDescription>
                Share this link directly, or wait for the email to arrive.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-4 py-3">
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-2">
                {inviteUrl}
              </code>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={copyLink}
                aria-label="Copy invite link"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite someone</DialogTitle>
              <DialogDescription>
                They complete their own intake. You see their progress here,
                never their documents.
              </DialogDescription>
            </DialogHeader>
            <form action={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite_email">Email</Label>
                <Input
                  id="invite_email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="person@example.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite_full_name">Full name</Label>
                <Input
                  id="invite_full_name"
                  name="full_name"
                  autoComplete="name"
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite_job_title">Job title</Label>
                <Input
                  id="invite_job_title"
                  name="job_title"
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite_destination">Destination</Label>
                <select
                  id="invite_destination"
                  name="destination_iso"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {Object.entries(DESTINATION_ISO).map(([name, iso]) => (
                    <option key={iso} value={iso}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite_purpose">Purpose</Label>
                <select
                  id="invite_purpose"
                  name="purpose"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">Not set</option>
                  {Object.entries(PURPOSE_ISO).map(([label, purpose]) => (
                    <option key={purpose} value={purpose}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="block" disabled={pending}>
                {pending ? "Sending…" : "Send invitation"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
