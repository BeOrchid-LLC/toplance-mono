import Link from "next/link";

import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#orgs", label: "Your dashboard" },
      { href: "/#where", label: "Where you can go" },
      { href: "/#pricing", label: "Pricing" },
      // The bar carries this at every width now — on desktop in the
      // row, below `lg` as a named row in the menu. It stays here
      // because a footer that omits the way back to an account is a
      // footer people scroll past looking for it.
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    heading: "Agencies",
    links: [
      { href: "/employer/sign-up", label: "Run your first case" },
      { href: "/employer/sign-in", label: "Agency sign-in" },
      { href: "/#pricing", label: "Talk to sales" },
      { href: "/#where", label: "Request a route" },
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
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="t-muted mt-3 max-w-[38ch]">
              Visa and relocation processing for travel agencies working out
              of West Africa — and for the people going through it
              themselves.
            </p>
            {/* The traveller page has no column of its own on purpose. It
                is one page, and four near-duplicate anchors into it would
                pad the footer rather than help anyone find it; a single
                line under the blurb is where a reader who is not the buyer
                actually looks. */}
            <Link
              href="/travelers"
              className="mt-3 inline-flex min-h-[var(--row-h)] items-center text-base font-medium text-brand-text underline underline-offset-4"
            >
              Traveling yourself? The individual path
            </Link>
            <div className="mt-5 flex items-center gap-3">
              <LocaleMenu />
              <ThemeSwitch />
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="tag mb-3">{col.heading}</h2>
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
          <span className="tag">
            © 2026 BeOrchid · Toplance. Prototype — not a live service.
          </span>
        </div>
      </div>
    </footer>
  );
}
