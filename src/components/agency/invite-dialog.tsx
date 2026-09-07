"use client";

import * as React from "react";
import { Mail } from "lucide-react";
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
import { inviteTraveller } from "@/app/[locale]/agency/actions";
import { useT } from "@/components/locale-provider";
import { fill } from "@/lib/i18n/fill";
import { INVITE_DIALOG } from "@/lib/i18n/invite-dialog";

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
 * `kind` is the page speaking, and it is the usual case: the clients
 * roster invites clients, the team roster invites colleagues, and on
 * either one the question "who are you inviting?" has already been
 * answered by the screen the button is on. Asking again is a control
 * whose only possible use is to contradict where you are standing.
 *
 * So `kind` is required. The console's front page used to carry a third
 * copy of this button and could not answer "who?", which is the only
 * reason the radio existed; that button is gone, and with it the one
 * caller that had to ask. Every remaining caller is a roster that knows.
 * Whether a staff invitation is allowed is still decided server-side by
 * `inviteTraveller` via `isAgencyOwner` — the team roster only renders
 * the trigger for an owner, so a reviewer is never offered a click whose
 * only outcome is a refusal.
 *
 * On success the dialog does not close: it swaps the form for a small
 * document sheet — who the invitation is for and how long the link
 * lives. The link itself is never shown, copied or returned to the
 * browser: the emailed invitation is the whole hand-off.
 *
 * Which is why the sheet reports whether that hand-off happened.
 * `sendEmail` no-ops without `RESEND_API_KEY` (true in local dev) and
 * swallows a refusal from Resend; it now returns whether it sent, and a
 * sheet that said "Invitation sent" over a letter that never left was
 * claiming the one thing this screen exists to do.
 */
export function InviteDialog({
  kind,
}: {
  /** Fixed by the page. Every caller is a roster that knows. */
  kind: "client" | "staff";
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  /**
   * Whether the form has been swapped for the sent sheet. A boolean, not
   * the invitation URL it used to be: with no "Copy link" button there is
   * nothing on this screen that needs the token, and holding a 30-day
   * bearer credential in client state to render a sheet that never prints
   * it is the same exposure the sheet was written to avoid.
   */
  const [sent, setSent] = React.useState(false);
  /**
   * Whether the invitation email actually went. `null` while no
   * invitation has been sent from this dialog; the sheet reads it to
   * choose between reporting a delivery and reporting an invitation that
   * exists but has not reached anyone.
   */
  const [delivered, setDelivered] = React.useState<boolean | null>(null);
  const [recipient, setRecipient] = React.useState<Recipient | null>(null);

  function onSubmit(formData: FormData) {
    // Read before the await: the sent sheet names its recipient, and the
    // action reports nothing about who it was addressed to.
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
      setDelivered(result.delivered);
      setSent(true);
      if (result.delivered) toast.success(t(INVITE_DIALOG.sentTitle));
      else toast.warning(t(INVITE_DIALOG.notSentTitle));
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset once the close animation has somewhere to land, so a
      // reopen never flashes the previous invite's sheet for a frame.
      setSent(false);
      setRecipient(null);
      setDelivered(null);
    }
  }

  // The heading, not the button. The trigger says "Invite" on every
  // agency screen — see `inviteButton` — and this is where the noun it
  // dropped goes: once the dialog is open it is no longer standing on
  // the page that answered "who?", so the title answers it again.
  const heading =
    kind === "client" ? INVITE_DIALOG.inviteClient : INVITE_DIALOG.inviteTeamMember;

  // The colleague's line is the same sentence the radio used to carry —
  // it says what a colleague *is*, which is exactly what the dialog owes
  // someone who no longer chose it from a list.
  const description =
    kind === "staff" ? INVITE_DIALOG.kindStaffHelp : INVITE_DIALOG.inviteDescription;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Mail /> {t(INVITE_DIALOG.inviteButton)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {delivered === false
                  ? t(INVITE_DIALOG.notSentTitle)
                  : t(INVITE_DIALOG.sentTitle)}
              </DialogTitle>
              <DialogDescription>
                {delivered === false
                  ? t(INVITE_DIALOG.notSentNotice)
                  : recipient?.email
                    ? fill(t(INVITE_DIALOG.sentDescriptionEmailPrefix), {
                        email: recipient.email,
                      })
                    : ""}
              </DialogDescription>
            </DialogHeader>

            {/* The invitation as a document sheet: the same ruled rows
                as every case-file card. Every child is min-w-0 so a long
                address can never push the sheet past the dialog's edge —
                the grid parent would let it. */}
            <div className="min-w-0 overflow-hidden rounded-md border border-border">
              <dl>
                <div className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-3">
                  <dt className="t-body shrink-0 text-ink-2">
                    {t(INVITE_DIALOG.sheetFor)}
                  </dt>
                  <dd className="min-w-0 truncate text-end text-base font-semibold">
                    {recipient?.fullName || recipient?.email}
                  </dd>
                </div>
                {recipient?.fullName && (
                  <div className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-3">
                    <dt className="t-body shrink-0 text-ink-2">
                      {t(INVITE_DIALOG.emailWord)}
                    </dt>
                    <dd className="min-w-0 truncate text-end text-base font-semibold">
                      {recipient.email}
                    </dd>
                  </div>
                )}
                {/* Last row, so no bottom rule: the sheet's own border
                    closes it. The link itself never appears here — it is
                    a 30-day bearer token, and a dialog that shows it puts
                    it into every screenshot and screen share of this
                    screen. It reaches its recipient by email alone. */}
                <div className="flex items-baseline justify-between gap-6 px-4 py-3">
                  <dt className="t-body shrink-0 text-ink-2">
                    {t(INVITE_DIALOG.sheetValidFor)}
                  </dt>
                  <dd className="text-end text-base font-semibold">
                    {t(INVITE_DIALOG.sheetThirtyDays)}
                  </dd>
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
              {fill(t(INVITE_DIALOG.onlyAddressNotice), {
                email: recipient?.email ?? t(INVITE_DIALOG.onlyAddressFallback),
              })}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => onOpenChange(false)}
              >
                {t(INVITE_DIALOG.doneButton)}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t(heading)}</DialogTitle>
              <DialogDescription>{t(description)}</DialogDescription>
            </DialogHeader>
            <form action={onSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite_email">{t(INVITE_DIALOG.emailWord)}</Label>
                <Input
                  id="invite_email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="person@example.com"
                  required
                />
                <p className="t-muted text-[14px]">
                  {t(INVITE_DIALOG.emailHelp)}
                </p>
              </div>

              {/* The page's answer, carried the same way the radio
                  carried it: `inviteTraveller` reads one field either
                  way, and only trusts it as far as `isAgencyOwner`
                  allows for a staff invitation. */}
              <input type="hidden" name="kind" value={kind} />


              <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
                <legend className="sr-only">
                  {t(INVITE_DIALOG.nameFieldsetLegend)}
                </legend>
                <p aria-hidden className="tag">
                  {t(INVITE_DIALOG.nameFieldsetTag)}
                </p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="invite_full_name">
                    {t(INVITE_DIALOG.fullNameLabel)}
                  </Label>
                  <Input
                    id="invite_full_name"
                    name="full_name"
                    autoComplete="name"
                  />
                  <p className="t-muted text-[14px]">
                    {t(INVITE_DIALOG.fullNameHelp)}
                  </p>
                </div>
              </fieldset>

              <Button type="submit" size="block" disabled={pending}>
                {pending
                  ? t(INVITE_DIALOG.sendingButton)
                  : t(INVITE_DIALOG.sendButton)}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
