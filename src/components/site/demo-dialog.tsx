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
import { requestDemo } from "@/app/[locale]/(site)/actions";
import { DEMO_DIALOG } from "@/lib/i18n/demo-dialog";
import { SITE_HOME } from "@/lib/i18n/site-home";
import { fillTemplate } from "@/lib/i18n/corridor-picker";

/** Matches `Input`, which has no `<select>` sibling in the design system. */
const selectClass =
  "h-[var(--control-h)] w-full rounded-md border border-border-strong bg-surface px-4 text-base text-ink outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--brand)_22%,transparent)]";

/**
 * The visitor's own zone, and every zone they might pick instead.
 *
 * Gated behind `useIsClient`, deliberately. This page is
 * `force-static`, so a render-time `Intl.DateTimeFormat()` would run on
 * the machine doing the build and bake *its* zone into the one HTML
 * document every visitor is served. Being uncontrolled, the select
 * would then keep that value through hydration, and an agency in Lagos
 * would be offered whatever zone the deploy runner happened to be in —
 * silently, and wrong by an hour or several.
 *
 * The read happens only once React is running in the browser, so the
 * answer is always the visitor's own. The value until then is UTC,
 * which is also the fallback
 * for a browser that has neither call: the list collapses to one entry
 * and the field still submits something true, where a curated shortlist
 * of African capitals would have offered the wrong hour to everyone
 * outside it.
 */
const NO_SUBSCRIBE = () => () => {};

/**
 * `false` while the server renders and through hydration, `true`
 * thereafter — the sanctioned way to gate a browser-only read without
 * setting state from an effect.
 */
function useIsClient(): boolean {
  return React.useSyncExternalStore(
    NO_SUBSCRIBE,
    () => true,
    () => false
  );
}

function useTimezones(): { zones: string[]; detected: string } {
  const isClient = useIsClient();

  return React.useMemo(() => {
    if (!isClient) return { zones: ["UTC"], detected: "UTC" };

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
  }, [isClient]);
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

  /**
   * Submitted through `onSubmit`, not through the `action` prop, and
   * that is not a style preference.
   *
   * React resets a form wired up with `action` as soon as the action
   * returns — on every path, including the ones that return an error.
   * A refusal the visitor could act on ("that email address does not
   * look right") therefore arrived beside six fields that had just
   * emptied themselves, so the price of one typo was retyping the lot.
   * Worse for the `<select>`: the reset returns the DOM node to its
   * first option, and a controlled `value` that has not changed since
   * the last render gives React no diff to write back, so the zone
   * silently became whichever one sorts first.
   *
   * The `action` prop's one real advantage is working before hydration,
   * which a dialog that needs a click to open cannot have anyway. So:
   * `preventDefault`, build the `FormData` by hand, and nothing resets
   * unless this component says so.
   */
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // Read before the await: the sent sheet names the address, and the
    // action returns nothing but a verdict.
    const submitted = String(formData.get("email") ?? "").trim().toLowerCase();

    startTransition(async () => {
      const result = await requestDemo(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      formRef.current?.reset();
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
          <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
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
