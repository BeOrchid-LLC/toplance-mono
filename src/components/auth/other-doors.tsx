import Link from "next/link";
import { ArrowRight, Briefcase, Shield, type LucideIcon } from "lucide-react";

/**
 * The doors this one is not, under a rule rather than in cards.
 *
 * Two bordered boxes beneath a bordered panel made three nested outlines
 * saying nothing; a rule separates these for free and keeps the panel
 * above as the only surface on the screen.
 *
 * Shared by both generic auth pages since travellers became invite-only.
 * `/sign-up` has needed it from the start — it is a door with no handle
 * on the outside, so it owes a visitor an alternative. `/sign-in` needs
 * it for the opposite reason: it is where *everyone* with an account
 * arrives, including the two audiences whose console it is not.
 */
export type Door = {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
};

/**
 * The doors named from `/sign-up`. Employers still have a sign-up to be
 * sent to; staff never do, so theirs points at a sign-in even here —
 * there is no self-serve route to the ops console and naming one would
 * be a promise this product does not keep.
 */
export const SIGN_UP_DOORS: Door[] = [
  {
    href: "/employer/sign-up",
    icon: Briefcase,
    title: "Employer sign-up",
    body: "Create your organisation, sponsor seats and invite your people",
  },
  {
    href: "/ops/sign-in",
    icon: Shield,
    title: "Toplance operations sign-in",
    body: "Staff only — review cases, verify documents and set decisions",
  },
];

/**
 * The doors named from `/sign-in` — both sign-ins, because everybody
 * arriving here already has an account. Before this the only way across
 * was knowing the URL: the ops door was a footer entry and the employer
 * door was named only from `/employer/sign-up`.
 */
export const SIGN_IN_DOORS: Door[] = [
  {
    href: "/employer/sign-in",
    icon: Briefcase,
    title: "Organisation sign-in",
    body: "For the person managing seats and invitations at your organisation",
  },
  {
    href: "/ops/sign-in",
    icon: Shield,
    title: "Toplance operations sign-in",
    body: "Staff only — review cases, verify documents and set decisions",
  },
];

export function OtherDoors({
  heading,
  entries,
}: {
  heading: string;
  entries: Door[];
}) {
  return (
    <div className="mt-10">
      <p className="tag">{heading}</p>
      <div className="mt-4 border-t border-border-strong">
        {entries.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group flex min-h-[76px] items-center gap-4 border-b border-border py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]"
          >
            <e.icon className="size-5 shrink-0 text-brand-text" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="d-sm block">{e.title}</span>
              <span className="t-muted mt-0.5 block text-[15px]">{e.body}</span>
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
