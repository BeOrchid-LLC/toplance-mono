import Link from "next/link";

import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { Wordmark } from "@/components/shared/wordmark";
import { getLocale } from "@/lib/i18n/server";
import { HERO } from "@/lib/i18n/hero";
import { SITE_CHROME } from "@/lib/i18n/site-chrome";
import { SITE_FOOTER } from "@/lib/i18n/site-footer";
import type { Locale } from "@/lib/i18n/locales";

function columnsFor(locale: Locale) {
  return [
    {
      heading: SITE_FOOTER.columnProduct[locale],
      links: [
        { href: "/#how", label: SITE_CHROME.howItWorks[locale] },
        { href: "/#orgs", label: SITE_CHROME.yourDashboard[locale] },
        { href: "/#where", label: SITE_CHROME.whereYouCanGo[locale] },
        { href: "/#pricing", label: SITE_CHROME.pricing[locale] },
        // The bar carries this at every width now — on desktop in the
        // row, below `lg` as a named row in the menu. It stays here
        // because a footer that omits the way back to an account is a
        // footer people scroll past looking for it.
        { href: "/sign-in", label: HERO.signIn[locale] },
      ],
    },
    {
      heading: SITE_FOOTER.columnAgencies[locale],
      links: [
        { href: "/employer/sign-up", label: SITE_CHROME.runYourFirstCase[locale] },
        { href: "/employer/sign-in", label: SITE_CHROME.agencySignIn[locale] },
        { href: "/#pricing", label: SITE_FOOTER.talkToSales[locale] },
        { href: "/#where", label: SITE_FOOTER.requestARoute[locale] },
      ],
    },
    {
      heading: SITE_FOOTER.columnCompany[locale],
      links: [
        { href: "/#how", label: SITE_FOOTER.aboutToplance[locale] },
        { href: "/#how", label: SITE_FOOTER.securityAndPrivacy[locale] },
        { href: "/#how", label: SITE_FOOTER.termsOfService[locale] },
        { href: "/ops/sign-in", label: SITE_FOOTER.opsSignIn[locale] },
      ],
    },
  ];
}

export async function SiteFooter() {
  const locale = await getLocale();
  const columns = columnsFor(locale);

  return (
    <footer className="border-t border-border bg-surface-2 pb-6 pt-12">
      <div className="mx-auto max-w-[1240px] px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="t-muted mt-3 max-w-[38ch]">{SITE_FOOTER.blurb[locale]}</p>
            {/* The traveller page has no column of its own on purpose. It
                is one page, and four near-duplicate anchors into it would
                pad the footer rather than help anyone find it; a single
                line under the blurb is where a reader who is not the buyer
                actually looks. */}
            <Link
              href="/travelers"
              className="mt-3 inline-flex min-h-[var(--row-h)] items-center text-base font-medium text-brand-text underline underline-offset-4"
            >
              {SITE_FOOTER.travelerCta[locale]}
            </Link>
            <div className="mt-5 flex items-center gap-3">
              <LocaleMenu />
              <ThemeSwitch />
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h2 className="tag mb-3">{col.heading}</h2>
              {col.links.map((l, i) => (
                <Link
                  key={i}
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
          <span className="tag">{SITE_FOOTER.copyright[locale]}</span>
        </div>
      </div>
    </footer>
  );
}
