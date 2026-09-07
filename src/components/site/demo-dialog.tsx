"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale, useT } from "@/components/locale-provider";
import { requestDemo } from "@/app/(site)/actions";
import { DEMO_DIALOG } from "@/lib/i18n/demo-dialog";
import { SITE_HOME } from "@/lib/i18n/site-home";
import { fillTemplate } from "@/lib/i18n/corridor-picker";

/** Matches `Input`, which has no `<select>` sibling in the design system. */
const selectClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

/**
 * The visitor's own zone, and every zone they might pick instead.
 *
 * Read once, lazily, on the client: `Intl.supportedValuesOf` is a
 * browser API, and calling it during the static render would both fail
 * and bake one machine's answer into the HTML every visitor receives.
 *
 * The fallback matters more than it looks. If a browser has neither
 * call, the list collapses to UTC and the field still works — where a
 * curated shortlist of African capitals would have silently offered the
 * wrong hour to everyone outside it.
 */
function useTimezones(): { zones: string[]; detected: string } {
  return React.useMemo(() => {
    let detected = "UTC";
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      // Keep UTC.
    }

    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      // Older browsers: the visitor's own zone is the only one on offer.
    }

    if (!zones.includes(detected)) zones = [detected, ...zones];
    return { zones, detected };
  }, []);
}

/**
 * The landing page's "Book a demo" call to action, and the form behind
 * it.
 *
 * This replaced a `mailto:` link. The address in it was a placeholder
 * nobody had confirmed, and a mail client hand-off collected nothing —
 * whoever opened the mail got whatever the sender chose to type. Five
 * named fields land in `demo_requests` instead.
 *
 * A client island on a `force-static` page: the page itself is still
 * prerendered and cached, and this is the only part of it that needs a
 * server round trip.
 *
 * Modelled on `InviteDialog` (`@/components/employer/invite-dialog`)
 * down to the sent sheet — same dialog, same transition, same reset on
 * close — because a visitor who books a demo and later signs up should
 * meet one product, not two.
 */
export function DemoDialog() {
  const t = useT();
  const { locale } = useLocale();
  const { zones, detected } = useTimezones();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  function onSubmit(formData: FormData) {
    // Read before the await: the sent sheet names the address, and the
    // action returns nothing but a verdict.
    const submitted = String(formData.get("email") ?? "").trim().toLowerCase();

    startTransition(async () => {
      const result = await requestDemo(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setSentTo(submitted);
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Reset once the close animation has somewhere to land, so a reopen
    // never flashes the previous submission for a frame.
    if (!next) setSentTo(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">{t(SITE_HOME.heroCtaBookDemo)}</Button>
      </DialogTrigger>
      <DialogContent>
        {sentTo ? (
          <>
            <DialogHeader>
              <DialogTitle>{t(DEMO_DIALOG.sentTitle)}</DialogTitle>
              <DialogDescription>
                {fillTemplate(t(DEMO_DIALOG.sentBody), { email: sentTo })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="neutral">{t(DEMO_DIALOG.close)}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form action={onSubmit} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{t(SITE_HOME.heroCtaBookDemo)}</DialogTitle>
              <DialogDescription>{t(DEMO_DIALOG.description)}</DialogDescription>
            </DialogHeader>

            <input type="hidden" name="locale" value={locale} />

            {/*
              The honeypot. Positioned off-screen rather than hidden with
              `display:none`, which the cruder scripts know to skip, and
              taken out of the tab order and the accessibility tree so
              nobody using the form as built can reach it. A filled value
              means a script typed into every input it found.
            */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] size-px opacity-0"
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-full-name">{t(DEMO_DIALOG.fullNameLabel)}</Label>
              <Input
                id="demo-full-name"
                name="full_name"
                required
                autoComplete="name"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-email">{t(DEMO_DIALOG.emailLabel)}</Label>
              <Input
                id="demo-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@agency.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-company">{t(DEMO_DIALOG.companyLabel)}</Label>
              <Input
                id="demo-company"
                name="company_name"
                required
                autoComplete="organization"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-job-title">{t(DEMO_DIALOG.jobTitleLabel)}</Label>
              <Input
                id="demo-job-title"
                name="job_title"
                required
                autoComplete="organization-title"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-preferred">{t(DEMO_DIALOG.preferredLabel)}</Label>
              <Input
                id="demo-preferred"
                name="preferred_local"
                type="datetime-local"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-timezone">{t(DEMO_DIALOG.timezoneLabel)}</Label>
              <select
                id="demo-timezone"
                name="preferred_tz"
                defaultValue={detected}
                className={selectClass}
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button type="submit" size="block" disabled={pending}>
                {pending ? t(DEMO_DIALOG.submitting) : t(DEMO_DIALOG.submit)}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
