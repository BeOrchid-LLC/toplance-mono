"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import { invitePlatformStaff } from "@/app/[locale]/ops/staff/actions";
import { useT } from "@/components/locale-provider";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { OPS_STAFF } from "@/lib/i18n/ops-staff";

/**
 * Invite a BeOrchid colleague, at a rank chosen here.
 *
 * The rank is a real choice on this form, which the agency's invite
 * dialog deliberately does not offer — an agency invitation always mints
 * a reviewer. It is offered here because the platform's own owner is the
 * only person who can send this, and because the alternative is what the
 * product did before: making the second owner by hand in SQL.
 *
 * The form remounts on close, so a reopened dialog never holds the last
 * colleague's address.
 */
export function InviteStaff() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [formKey, setFormKey] = React.useState(0);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setFormKey((key) => key + 1);
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await invitePlatformStaff(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // An invitation that exists but never arrived is the failure this
      // has to report honestly: the roster is the only way back to a
      // link, and somebody who is told "sent" will not look there.
      if (result.delivered) toast.success(t(OPS_STAFF.sent));
      else toast.warning(t(OPS_STAFF.notDelivered));

      setOpen(false);
      setFormKey((key) => key + 1);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {/* `sm`, not `bar`: this button left the console's working bar on
            2026-09-08 for the colleagues panel header, where the row it
            aligns with is the count badge rather than the rail toggle
            and the search field. */}
        <Button size="sm">
          <UserPlus /> {t(OPS_STAFF.inviteAction)}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(OPS_STAFF.dialogTitle)}</DialogTitle>
        </DialogHeader>

        <form key={formKey} action={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-email">{t(OPS_STAFF.emailLabel)}</Label>
            <Input id="staff-email" name="email" type="email" required autoComplete="off" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-name">{t(OPS_STAFF.fullNameLabel)}</Label>
            <Input id="staff-name" name="full_name" autoComplete="off" />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="t-label mb-2">{t(OPS_STAFF.rankLabel)}</legend>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 text-[15px]">
                <input type="radio" name="staff_rank" value="reviewer" defaultChecked />
                {t(OPS_COMMON.staffRole.reviewer)}
              </label>
              <label className="flex items-center gap-3 text-[15px]">
                <input type="radio" name="staff_rank" value="owner" />
                {t(OPS_COMMON.staffRole.owner)}
              </label>
            </div>
            <p className="t-muted mt-2">{t(OPS_STAFF.rankHint)}</p>
          </fieldset>

          <p className="t-muted">{t(OPS_STAFF.secondFactorNotice)}</p>

          <Button type="submit" disabled={pending}>
            {pending ? t(OPS_STAFF.sending) : t(OPS_STAFF.send)}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
