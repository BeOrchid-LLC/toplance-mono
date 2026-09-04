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

/** What the sent sheet states about the invitation it hands over. */
type Recipient = {
  email: string;
  fullName: string;
};

/**
 * The invite form and its result, both behind one trigger. `email` is
 * the only field `createInvitation` requires; full name prefills the
 * accept page.
 *
 * Job title, destination and purpose used to be here too. They were
 * asked of the agency about a person the agency has not spoken to yet —
 * a guess entered on someone else's behalf, which the intake then asks
 * the traveller directly and authoritatively. Collecting it twice made
 * the invitation form look like an onboarding questionnaire and gave the
 * agency a field to be wrong in.
 *
 * On success the dialog does not close: it swaps the form for a small
 * document sheet — who the invitation is for and how long the link
 * lives — with copying the link as its one primary action.
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
    const submitted: Recipient = {
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      fullName: String(formData.get("full_name") ?? "").trim(),
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
                {/* Last row, so no bottom rule: the sheet's own border
                    closes it. The link itself is not printed here — it is
                    a 30-day bearer token, and a dialog that shows it puts
                    it into every screenshot and screen share of this
                    screen. "Copy link" carries it to the clipboard
                    instead, which is the only place it is needed. */}
                <div className="flex items-baseline justify-between gap-6 px-4 py-3">
                  <dt className="t-body shrink-0 text-ink-2">Valid for</dt>
                  <dd className="text-right text-base font-semibold">30 days</dd>
                </div>
              </dl>
            </div>

            {/* What the link actually does, rather than a warning about
                what it does not. `checkInvitedAddress` refuses a token
                presented from any other address, so the old line —
                "anyone who opens this link can accept" — described a
                risk the product had already closed, and asked the agency
                to be careful in place of a guarantee it already had. */}
            <p className="t-muted -mt-1 text-[14px]">
              Only {recipient?.email ?? "the invited address"} can accept
              this invitation. Opened from any other address, it is
              refused.
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
                not their documents.
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
                  Their name, optional
                </legend>
                <p aria-hidden className="tag">
                  Their name · optional
                </p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite_full_name">Full name</Label>
                  <Input
                    id="invite_full_name"
                    name="full_name"
                    autoComplete="name"
                  />
                  <p className="t-muted text-[14px]">
                    So the invitation greets them by name. Where they are
                    going, and why, is theirs to answer in the intake.
                  </p>
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
