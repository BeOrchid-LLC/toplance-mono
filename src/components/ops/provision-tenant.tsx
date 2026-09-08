"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { provisionTenant } from "@/app/[locale]/ops/tenants/actions";
import type { DemoRequestRow } from "@/lib/data/demo-requests";
import { useT } from "@/components/locale-provider";
import { OPS_TENANTS } from "@/lib/i18n/ops-tenants";

/**
 * Create an agency and invite the person who will run it.
 *
 * Two steps by design, and the notice says so in words: this sends an
 * invitation, the invitee joins as a reviewer, and somebody here makes
 * them the owner afterwards. An invitation in this product cannot mint
 * an owner (`acceptInvitationTx`), and an operator who does not know
 * that will think provisioning failed halfway.
 *
 * `demoRequest` pre-fills the form and carries the enquiry's id, so the
 * transaction can stamp it converted. Without one this is a walk-in.
 */
export function ProvisionTenant({ demoRequest }: { demoRequest?: DemoRequestRow }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  // Whether the invitation actually left. `sendEmail` returns false
  // rather than throwing (no `RESEND_API_KEY`, a 403 from Resend), and an
  // operator who is not told that will close this dialog believing the
  // owner has a link — when the copy on screen is the only one that will
  // ever exist.
  const [emailSent, setEmailSent] = React.useState(true);
  // Remounts the form on every close, so its uncontrolled inputs forget
  // whatever was typed (or the invite-link screen that replaced them)
  // and come back holding only `defaultValue` again. `open`/`pending`
  // reset on their own — `open` is driven by the dialog, `pending`
  // resolves the moment the transition it tracks finishes — but nothing
  // else clears `inviteUrl` or a half-typed field, and this component
  // outlives a single provision: Task 8 renders one `ProvisionTenant`
  // for walk-ins for the operator's whole session on `/ops/tenants`.
  const [formKey, setFormKey] = React.useState(0);
  // Set the instant a provision succeeds, read only by `handleOpenChange`.
  // A ref rather than state: flipping it must never itself cause a
  // render, only be checked the next time the dialog closes.
  const refreshOnCloseRef = React.useRef(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setInviteUrl(null);
      setEmailSent(true);
      setFormKey((key) => key + 1);

      // Deferred from `submit`, on purpose. When `demoRequest` is set,
      // this component is rendered from a ternary in
      // `EnquiryTable` keyed on `demoRequest.convertedOrgId` — a
      // `router.refresh()` fired right after a successful provision
      // lands the instant this row's server data comes back with that
      // id populated, which flips the ternary to a `<Link>` and unmounts
      // this whole dialog, taking `inviteUrl` — the operator's only
      // other copy of the link — with it before it can be read. Holding
      // the refresh until the operator has actually closed the dialog
      // means the swap can only happen after they are done with it. The
      // walk-in path (no `demoRequest`) is never conditionally rendered
      // on anything this refresh changes, so deferring it here costs
      // that path nothing.
      if (refreshOnCloseRef.current) {
        refreshOnCloseRef.current = false;
        router.refresh();
      }
    }
  }

  function submit(formData: FormData) {
    if (demoRequest) formData.set("demo_request_id", demoRequest.id);

    startTransition(async () => {
      const result = await provisionTenant(formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // The link stays on screen after the dialog's work is done: the
      // email can fail and this is the only other copy — the roster
      // never selects `token`, and nothing in the product can resend or
      // revoke an invitation.
      setInviteUrl(result.inviteUrl);
      setEmailSent(result.emailSent);
      // The agency exists either way, so this stays a success — the
      // hand-off is what failed, and the notice beside the link says so.
      toast.success(t(OPS_TENANTS.toastProvisioned));

      // Not refreshed here — see `handleOpenChange`. Refreshing now
      // would re-render this row's parent with the demo request already
      // converted, which unmounts this dialog before the invite link
      // above has been read.
      refreshOnCloseRef.current = true;
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Building2 /> {t(OPS_TENANTS.provisionButton)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(OPS_TENANTS.provisionTitle)}</DialogTitle>
        </DialogHeader>

        <p className="t-muted max-w-[52ch]">{t(OPS_TENANTS.provisionNotice)}</p>

        {inviteUrl ? (
          <div className="flex flex-col gap-2">
            {!emailSent && (
              <p role="alert" className="max-w-[52ch] text-danger-ink">
                {t(OPS_TENANTS.provisionEmailFailed)}
              </p>
            )}
            <Label htmlFor="invite-url">{t(OPS_TENANTS.inviteLinkLabel)}</Label>
            <Input
              id="invite-url"
              readOnly
              value={inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        ) : (
          <form key={formKey} action={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t(OPS_TENANTS.fieldAgencyName)}</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={160}
                defaultValue={demoRequest?.companyName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="owner_email">{t(OPS_TENANTS.fieldOwnerEmail)}</Label>
              <Input
                id="owner_email"
                name="owner_email"
                type="email"
                required
                defaultValue={demoRequest?.email ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="owner_name">{t(OPS_TENANTS.fieldOwnerName)}</Label>
              <Input
                id="owner_name"
                name="owner_name"
                defaultValue={demoRequest?.fullName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="domain">{t(OPS_TENANTS.fieldDomain)}</Label>
              <Input id="domain" name="domain" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="seats">{t(OPS_TENANTS.fieldSeats)}</Label>
              <Input id="seats" name="seats" type="number" min={0} defaultValue={0} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing_contact">{t(OPS_TENANTS.fieldBillingContact)}</Label>
              <Input id="billing_contact" name="billing_contact" type="email" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>
                {t(OPS_TENANTS.createButton)}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
              >
                {t(OPS_TENANTS.cancelButton)}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
