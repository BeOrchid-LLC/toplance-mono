import Link from "next/link";

import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/sign-up", label: "Start an application" },
      { href: "/#how", label: "How it works" },
      { href: "/#where", label: "Where we work" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Organisations",
    links: [
      { href: "/employer/sign-in", label: "Employer sign-in" },
      { href: "/#orgs", label: "Sponsor seats" },
      { href: "/#pricing", label: "Talk to sales" },
      { href: "/#where", label: "Request a corridor" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/#how", label: "About Toplance" },
      { href: "/#how", label: "Security and privacy" },
      { href: "/#how", label: "Terms of service" },
      { href: "/ops/sign-in", label: "Toplance operations sign-in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2 pb-6 pt-12">
      <div className="mx-auto max-w-[1140px] px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="t-muted mt-3 max-w-[38ch]">
              Visa and relocation support for people leaving West Africa for work,
              study and treatment — and for the organisations sending them.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <LocaleMenu />
              <ThemeSwitch />
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="special-caps mb-3">{col.heading}</h2>
              {col.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="flex min-h-[var(--row-h)] items-center text-base text-ink-2 transition-colors hover:text-brand-text"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <span className="special">
            © 2026 BeOrchid · Toplance. Prototype — not a live service.
          </span>
        </div>
      </div>
    </footer>
  );
}
