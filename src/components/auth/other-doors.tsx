import Link from "next/link";
import { ArrowRight, Briefcase, type LucideIcon } from "lucide-react";

import { getLocale } from "@/lib/i18n/server";
import { AUTH_DOORS, type AUTH_DOORS_HEADINGS } from "@/lib/i18n/auth-doors";
import type { Locale } from "@/lib/i18n/locales";

/**
 * The doors this one is not, under a rule rather than in cards.
 *
 * Two bordered boxes beneath a bordered panel made three nested outlines
 * saying nothing; a rule separates these for free and keeps the panel
 * above as the only surface on the screen.
 *
 * `/sign-up` alone now. That page is a door with no handle on the
 * outside — travellers are invite-only — so it owes a visitor an
 * alternative. `/sign-in` used to list the other two sign-ins for the
 * opposite reason, and no longer has any to list: there is one sign-in,
 * and `/go` sorts out whose console it opens.
 *
 * `title`/`body` are dictionaries rather than resolved strings: `OtherDoors`
 * is a Server Component with no locale of its own to resolve them against
 * until it renders, and the array below is a module-level constant shared
 * by every request.
 */
export type Door = {
  href: string;
  icon: LucideIcon;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
};

/**
 * The doors named from `/sign-up`: the one other place an account can be
 * *created*. Staff used to be named here too, pointing at their own
 * sign-in — there is no self-serve route to the ops console and naming
 * one would be a promise this product does not keep. That entry is gone
 * because the door it named is gone: staff sign in at `/sign-in`, which
 * this page's own form already links to.
 */
export const SIGN_UP_DOORS: Door[] = [
  {
    href: "/agency/sign-up",
    icon: Briefcase,
    title: AUTH_DOORS.employerSignUp.title,
    body: AUTH_DOORS.employerSignUp.body,
  },
];

export async function OtherDoors({
  heading,
  entries,
}: {
  heading: (typeof AUTH_DOORS_HEADINGS)[keyof typeof AUTH_DOORS_HEADINGS];
  entries: Door[];
}) {
  const locale = await getLocale();

  return (
    <div className="mt-10">
      <p className="tag">{heading[locale]}</p>
      <div className="mt-4 border-t border-border-strong">
        {entries.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group flex min-h-[76px] items-center gap-4 border-b border-border py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]"
          >
            <e.icon className="size-5 shrink-0 text-brand-text" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="d-sm block">{e.title[locale]}</span>
              <span className="t-muted mt-0.5 block text-[15px]">{e.body[locale]}</span>
            </span>
            <ArrowRight
              className="size-5 shrink-0 text-brand-text transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
