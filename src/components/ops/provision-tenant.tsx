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
  // Remounts the form on every close, so its uncontrolled inputs forget
  // whatever was typed (or the invite-link screen that replaced them)
  // and come back holding only `defaultValue` again. `open`/`pending`
  // reset on their own — `open` is driven by the dialog, `pending`
  // resolves the moment the transition it tracks finishes — but nothing
  // else clears `inviteUrl` or a half-typed field, and this component
  // outlives a single provision: Task 8 renders one `ProvisionTenant`
  // for walk-ins for the operator's whole session on `/ops/tenants`.
  const [formKey, setFormKey] = React.useState(0);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setInviteUrl(null);
      setFormKey((key) => key + 1);
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
      // email can fail silently and this is the only other copy — the
      // roster never selects `token`.
      setInviteUrl(result.inviteUrl);
      toast.success(t(OPS_TENANTS.toastProvisioned));
      router.refresh();
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
