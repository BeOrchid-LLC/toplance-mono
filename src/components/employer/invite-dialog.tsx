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

/** What the sent sheet states about the invitation it hands over. */
type Recipient = {
  email: string;
  fullName: string;
  destination: string;
};

/**
 * The invite form and its result, both behind one trigger. `email` is
 * the only field `createInvitation` requires; the rest — full name, job
 * title, destination, purpose — prefill the accept page and, later, the
 * intake this invitee will run (deferred by design; see Task 10's brief).
 *
 * On success the dialog does not close: it swaps the form for a small
 * document sheet — who the invitation is for, where to, how long the
 * link lives — with copying the link as its one primary action.
 * `sendEmail` no-ops without `RESEND_API_KEY` (true in local dev), so
 * the copyable link is not a fallback for that case — it is the primary
 * hand-off, the email a bonus when Resend is configured.
 */
export function InviteDialog() {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [recipient, setRecipient] = React.useState<Recipient | null>(null);
  const [copied, setCopied] = React.useState(false);

  function onSubmit(formData: FormData) {
    // Read before the await: the sent sheet names its recipient, and the
    // action only returns the link.
    const iso = String(formData.get("destination_iso") ?? "");
    const destination =
      Object.entries(DESTINATION_ISO).find(([, v]) => v === iso)?.[0] ?? "";
    const submitted: Recipient = {
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      fullName: String(formData.get("full_name") ?? "").trim(),
      destination,
    };

    startTransition(async () => {
      const result = await inviteTraveller(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRecipient(submitted);
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
      setRecipient(null);
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
                {recipient?.email
                  ? `An email is on its way to ${recipient.email}. `
                  : ""}
                Copy the link if you would rather hand it over yourself.
              </DialogDescription>
            </DialogHeader>

            {/* The invitation as a document sheet: the same ruled rows
                as every case-file card, ending in the link itself. Every
                child is min-w-0 so the token can never push the sheet
                past the dialog's edge — the grid parent would let it. */}
            <div className="min-w-0 overflow-hidden rounded-md border border-border">
              <dl>
                <div className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-3">
                  <dt className="t-body shrink-0 text-ink-2">For</dt>
                  <dd className="min-w-0 truncate text-right text-base font-semibold">
                    {recipient?.fullName || recipient?.email}
                  </dd>
                </div>
                {recipient?.fullName && (
                  <div className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-3">
                    <dt className="t-body shrink-0 text-ink-2">Email</dt>
                    <dd className="min-w-0 truncate text-right text-base font-semibold">
                      {recipient.email}
                    </dd>
                  </div>
                )}
                {recipient?.destination && (
                  <div className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-3">
                    <dt className="t-body shrink-0 text-ink-2">Destination</dt>
                    <dd className="min-w-0 truncate text-right text-base font-semibold">
                      {recipient.destination}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-3">
                  <dt className="t-body shrink-0 text-ink-2">Valid for</dt>
                  <dd className="text-right text-base font-semibold">30 days</dd>
                </div>
              </dl>
              <p className="break-all bg-surface-2 px-4 py-3 font-mono text-[13px] leading-relaxed text-ink-2">
                {inviteUrl}
              </p>
            </div>

            <p className="t-muted -mt-1 text-[14px]">
              Anyone who opens this link can accept the invitation — share
              it with {recipient?.email ?? "the invitee"} only.
            </p>

            <Button type="button" size="block" onClick={copyLink}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <DialogFooter>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => onOpenChange(false)}
              >
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
            <form action={onSubmit} className="flex flex-col gap-5">
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
                <p className="t-muted text-[14px]">
                  The only field the invitation needs.
                </p>
              </div>

              <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
                <legend className="sr-only">
                  Prefill their file — all optional
                </legend>
                <p aria-hidden className="tag">
                  Prefill their file · optional
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="invite_full_name">Full name</Label>
                    <Input
                      id="invite_full_name"
                      name="full_name"
                      autoComplete="name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="invite_job_title">Job title</Label>
                    <Input id="invite_job_title" name="job_title" />
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
                </div>
              </fieldset>

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
