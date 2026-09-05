import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Check, Minus, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { CorridorBar } from "@/components/site/corridor-bar";
import { CorridorBoard } from "@/components/site/corridor-board";
import { CorridorProvider } from "@/components/site/corridor-state";
import { PricingEstimator } from "@/components/site/pricing-estimator";
import { Shell } from "@/components/shared/shell";
import { Head, Section } from "@/components/site/section";
import { LIVE_CORRIDORS } from "@/lib/domain/corridors";
import { DEFAULT_RATE_CARD, quote, type RateCard } from "@/lib/domain/pricing";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { SITE_CHROME } from "@/lib/i18n/site-chrome";
import { fillTemplate } from "@/lib/i18n/corridor-picker";
import {
  SITE_HOME,
  introBulletsFor,
  ledgerRowsFor,
  stepsFor,
  featuresFor,
  dashboardBulletsFor,
  seatIncludesTravelerFor,
  seatIncludesAgencyFor,
  seatExcludesFor,
  faqRowsFor,
} from "@/lib/i18n/site-home";

/**
 * The travel agency's landing page, and the only route with no session.
 *
 * This page used to address the traveller, then a generic "organisation"
 * relocating its own staff. Client feedback (2026-09-04): the actual buyer
 * is a travel agency running visa/relocation cases for its own clients as
 * its business, not an employer moving employees — so the copy is written
 * to that reader. The account model underneath is unchanged (same
 * `/employer/sign-up` door, same case/roster mechanics, same document
 * boundary) — this is a copy-only re-audience, not a new account type.
 * The traveller copy was not thrown away — it is `/travelers`, unchanged.
 *
 * The prose was replaced wholesale on 2026-09-05 from the client's copy
 * doc ("Toplance — Website Copy · Agency page"). Its two departures from
 * the old glossary — "traveler" with one l, and "route" rather than
 * "corridor" — are no longer local to this page: the client asked for
 * both across the whole interface, and `CONTEXT.md` now records them as
 * the rule rather than the exception. Code, tables, columns, types and
 * analytics events still say `corridor` and `traveller`; every string a
 * user reads says route and traveler. `CorridorBar` and `CorridorBoard`
 * keep their names and moved their copy.
 *
 * Statically rendered and cached at the edge — the sticky nav, the
 * corridor state, the FAQ accordion and the theme switch are the only
 * client-side JavaScript on it.
 */
export const dynamic = "force-static";

/**
 * Regenerated every five minutes, which `force-static` explicitly allows.
 *
 * This page reads the live rate card, and without a revalidate window
 * that read happens once, at build time, and is frozen into the
 * prerendered HTML forever. The billing side would pick a rate change up
 * on the next invoice while this page went on quoting the old one until
 * somebody deployed — which is the exact drift the card is in a table to
 * prevent. Five minutes is short enough that nobody is quoted a stale
 * price for long, and long enough that the marketing page is still a
 * cached document rather than a query per visitor.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Visa and relocation processing for travel agencies",
  description:
    "Toplance takes the paperwork off your hands. Every traveler gets the exact documents for their trip, the wrong ones are caught early, and your team only picks up files that are ready to work.",
};

/**
 * The hero's secondary call to action.
 *
 * PLACEHOLDER — there is no demo booking route, no contact form and no
 * address anywhere in this repo, so this domain is a guess and the client
 * has to confirm it before the page is public. It is a constant rather
 * than an inline `href` so that confirming it is one edit in one place.
 */
const DEMO_EMAIL = "hello@toplance.com";

/**
 * The ledger, the steps, the six "what you get" cards, the seat
 * inclusions/exclusions and the FAQ all used to live here as flat,
 * English-only module-level arrays. Translating the page moved every one
 * of them into `src/lib/i18n/site-home.ts` as a private array exposed
 * through an `xFor(locale)` function — `ledgerRowsFor`, `stepsFor`,
 * `featuresFor`, `seatIncludesTravelerFor`, `seatIncludesAgencyFor`,
 * `seatExcludesFor`, `faqRowsFor` — the same shape `/travelers`' own
 * `site-travelers.ts` already used. They're called once `locale` is known,
 * inside `HomePage`, rather than kept as constants here.
 */

/**
 * Illustrative sample data for the roster preview card — names,
 * destinations and completion numbers a reader recognises as a mockup,
 * not copy. `stateKey` points at the matching `SITE_CHROME` roster-state
 * string, which is real copy and gets translated.
 */
const ROSTER = [
  { name: "Chioma Eze", dest: "CAN", pct: 100, stateKey: "rosterSubmitted" as const },
  { name: "Kwame Mensah", dest: "ARE", pct: 100, stateKey: "rosterUnderReview" as const },
  { name: "Ifeoma Nwankwo", dest: "GBR", pct: 85, stateKey: "rosterCollecting" as const },
  { name: "Emeka Obi", dest: "CAN", pct: 0, stateKey: "rosterDraft" as const },
];

/**
 * The bands as a buyer reads them, built from the same card the
 * estimator quotes at.
 *
 * These used to be three typed-out strings sitting directly above a
 * calculator that reads the database. The first rate change would have
 * left the table contradicting the calculator beside it, on the same
 * screen, in front of the buyer — so every price on this page is now
 * derived from the card rather than transcribed next to it.
 */
function bandRows(card: RateCard, locale: Locale) {
  return card.bands.map((band, i) => {
    const from = i === 0 ? 1 : (card.bands[i - 1].upTo as number) + 1;
    return {
      range:
        band.upTo === null
          ? fillTemplate(SITE_HOME.bandAndAboveTemplate[locale], { from: ordinal(from) })
          : fillTemplate(SITE_HOME.bandRangeTemplate[locale], {
              from: ordinal(from),
              to: ordinal(band.upTo),
            }) + (i === 0 ? ` ${SITE_HOME.bandFirstApplicationWord[locale]}` : ""),
      rate: compactMoney(band.rateMinor, card.currency),
    };
  });
}

/* The commercial questions a buyer has to answer internally before they
   can sign anything. The labels are ours; the values are the client's,
   and the ones left blank are blank on purpose — a term invented here
   is a term someone will quote back in a negotiation. The copy doc
   leaves this table alone: it is factual reference, not marketing. */
function termsFor(card: RateCard, locale: Locale) {
  const rates = card.bands
    .map((b) => compactMoney(b.rateMinor, card.currency))
    .join(" / ");

  return [
    { label: SITE_HOME.termUnitLabel[locale], value: SITE_HOME.termUnitValue[locale] },
    { label: SITE_HOME.termBillingLabel[locale], value: SITE_HOME.termBillingValue[locale] },
    {
      label: SITE_HOME.termBaseFeeLabel[locale],
      value: fillTemplate(SITE_HOME.termBaseFeeValueTemplate[locale], {
        fee: compactMoney(card.baseFeeMinor, card.currency),
      }),
    },
    {
      label: SITE_HOME.termApplicationFeeLabel[locale],
      value: fillTemplate(SITE_HOME.termApplicationFeeValueTemplate[locale], { rates }),
    },
    { label: SITE_HOME.termBandResetLabel[locale], value: SITE_HOME.termBandResetValue[locale] },
    { label: SITE_HOME.termMinimumCommitmentLabel[locale], value: null },
  ];
}

/** `1800` → `"$18"`, `1850` → `"$18.50"`. Display only, like `formatMoney`. */
function compactMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

/**
 * `201` → `"201st"`.
 *
 * NEEDS NATIVE REVIEW before launch — English-style ordinal suffixes
 * (`st`/`nd`/`rd`/`th`) don't translate mechanically the way a word or a
 * sentence does, so this stays English-only in every locale rather than
 * guessing at ordinal rules this file has no business inventing.
 */
function ordinal(n: number): string {
  const teens = n % 100;
  const suffix =
    teens >= 11 && teens <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th");
  return `${n.toLocaleString("en-US")}${suffix}`;
}

/**
 * Takes the card for one answer only — "How are we invoiced?" quotes the
 * rates, and an FAQ that disagrees with the estimator two sections above
 * it is worse than no FAQ.
 *
 * The first question is new, moved here from the old "What we don't do"
 * block at the client's instruction. The rest are the existing ones, kept
 * in order, with "client" changed to "traveler" and "corridor" to "route"
 * so the section does not answer in a different vocabulary from the page
 * above it.
 */
function faqFor(card: RateCard, locale: Locale) {
  const [first, ...rest] = card.bands;
  // "$18 each for the first 200 in the month, $15 for the next 300, then
  // $12 beyond that" — the same sentence, from whatever bands exist.
  const invoiceRates = [
    fillTemplate(SITE_HOME.invoiceFirstBandTemplate[locale], {
      rate: compactMoney(first.rateMinor, card.currency),
      count: (first.upTo ?? 0).toLocaleString("en-US"),
    }),
    ...rest.map((band, i) => {
      const previous = card.bands[i].upTo as number;
      return band.upTo === null
        ? fillTemplate(SITE_HOME.invoiceLastBandTemplate[locale], {
            rate: compactMoney(band.rateMinor, card.currency),
          })
        : fillTemplate(SITE_HOME.invoiceMiddleBandTemplate[locale], {
            rate: compactMoney(band.rateMinor, card.currency),
            count: (band.upTo - previous).toLocaleString("en-US"),
          });
    }),
  ].join(", ");

  const invoiceAnswer = fillTemplate(SITE_HOME.invoiceAnswerTemplate[locale], {
    baseFee: compactMoney(card.baseFeeMinor, card.currency),
    invoiceRates,
  });

  return faqRowsFor(locale).map((row) => ({
    q: row.q,
    a: row.a ?? invoiceAnswer,
  }));
}

export default async function HomePage() {
  const locale = await getLocale();

  const introBullets = introBulletsFor(locale);
  const ledgerRows = ledgerRowsFor(locale);
  const steps = stepsFor(locale);
  const features = featuresFor(locale);
  const dashboardBullets = dashboardBulletsFor(locale);
  const seatIncludesTraveler = seatIncludesTravelerFor(locale);
  const seatIncludesAgency = seatIncludesAgencyFor(locale);
  const seatExcludes = seatExcludesFor(locale);

  /**
   * The rates the estimator quotes at, read from the database so the
   * calculator and the invoice cannot drift apart. Every price on this
   * page is derived from this one object.
   *
   * Two ways it can be absent, and neither should stop the page
   * rendering. CI builds the marketing site with no database at all, so
   * `hasDatabaseEnv` is false. And a build machine can have the variable
   * set but not be able to reach the host — a missing env var is a
   * different failure from an unreachable one, and only the first is a
   * configuration check. This page had no database dependency at all
   * before billing arrived; it should not be the thing that fails a
   * deploy. The shipped card is the same as the seeded row until someone
   * edits it, so the fallback is a stale price at worst, never a wrong
   * shape — `parseRateCard` refuses those upstream of here.
   */
  let rateCard = DEFAULT_RATE_CARD;
  if (hasDatabaseEnv) {
    try {
      rateCard = await (await import("@/lib/data/billing")).activeRateCard();
    } catch (error) {
      console.error("[site] falling back to the shipped rate card", error);
    }
  }

  const bands = bandRows(rateCard, locale);
  const baseFee = compactMoney(rateCard.baseFeeMinor, rateCard.currency);
  // A worked example, computed rather than written out, so it stays true
  // when the bands move. Suppressed on a single-band card, where "350 is
  // 200 at one rate and 150 at another" has nothing to say.
  const worked = quote(350, rateCard);

  return (
    <CorridorProvider>
      {/* ---------- hero ---------- */}
      {/* Server-rendered, unlike the traveller hero it replaces. That one
          is a client component because it translates itself via `useT()`;
          this one is a Server Component that resolves `locale` once, in
          `HomePage`, and indexes `SITE_HOME`/`SITE_CHROME` directly — the
          "stays in English" note this comment used to carry was overridden
          by the client on 2026-09-05: this page now runs in all 10 site
          locales, the same as `/travelers`. The only client-side boundary
          left in the hero is `CorridorBar` itself. */}
      <header className="relative isolate overflow-hidden">
        <div aria-hidden className="security-paper pointer-events-none absolute inset-0 -z-10" />
        <Shell className="pb-20 pt-12 md:pb-28 md:pt-16">
          {/* Two columns from `lg`, one below it. The text keeps the
              left, and the image takes the space the copy was never
              going to fill — the headline is capped at 20ch by design,
              so on a wide screen the right half of the first fold was
              empty ground rather than deliberate space.

              `items-center` rather than `items-start`: the text block is
              shorter than the frame beside it, and aligning their tops
              left the column looking dropped rather than paired. */}
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div>
              <p className="tag rise text-brand-text">
                {SITE_HOME.heroKicker[locale]}
              </p>

              <h1 className="d-hero rise mt-5 max-w-[20ch]" style={{ animationDelay: "70ms" }}>
                {SITE_HOME.heroTitle[locale]}
              </h1>

              <p
                className="t-body-lg rise mt-6 max-w-[52ch] text-ink-2"
                style={{ animationDelay: "110ms" }}
              >
                {SITE_HOME.heroBody[locale]}
              </p>

              {/* The buttons the client's copy asks for, above the picker
                  rather than instead of it. The doc names a primary and an
                  outline secondary and says nothing about the corridor
                  control, and removing a working way to interrogate the
                  product on the first screen is not something a copy change
                  should decide. */}
              <div
                className="rise mt-8 flex flex-wrap gap-3"
                style={{ animationDelay: "130ms" }}
              >
                <Button asChild>
                  <Link href="/employer/sign-up">
                    {SITE_HOME.heroCtaGetStarted[locale]} <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <a href={`mailto:${DEMO_EMAIL}?subject=Toplance%20demo`}>
                    {SITE_HOME.heroCtaBookDemo[locale]}
                  </a>
                </Button>
              </div>
            </div>

            {/* Hidden below `lg` rather than stacked: on a phone this
                would push the call to action off the first screen, and a
                decorative illustration is worth less there than the
                buttons are.

                `alt=""` on purpose. It carries no information the
                headline beside it does not already state in words, so
                announcing it would make a screen reader read the same
                claim twice — the rule this codebase already applies to
                `MrzBand`.

                unDraw art, with one edit on the way in: its stock accent
                is #6c63ff, and shipping that violet on a page whose
                brand is #2450d8 is the clearest single tell that a
                library illustration was dropped in untouched. All seven
                occurrences are recoloured to `--brand` in
                `public/hero/travel-everywhere.svg`. Its greys are left
                alone — those are the drawing, not the branding.

                The ground is genuinely transparent, so in light mode
                `security-paper` rules straight through the artwork and
                there is nothing to frame, tint or blend. Dark mode still
                needs the panel: the linework is #3f3d56 and #090814,
                which on a #0b0d13 page is invisible rather than merely
                low-contrast. A light panel is the honest fix — this is a
                light-ground drawing, so it gets presented as one.

                `unoptimized` because the source is SVG. Next's optimizer
                refuses SVG unless `images.dangerouslyAllowSVG` is set,
                and there is nothing in a 16KB vector worth loosening
                that setting for. */}
            <div className="rise hidden lg:block" style={{ animationDelay: "190ms" }}>
              <div className="rounded-lg dark:bg-[#f2f4f8] dark:p-6 dark:shadow-[var(--shadow)]">
                <Image
                  src="/hero/travel-everywhere.svg"
                  alt=""
                  width={1071}
                  height={863}
                  priority
                  unoptimized
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>

          {/* The control sits on the first screen for the same reason it
              does on the traveller page: you can interrogate the product
              without reading a word of marketing. What changed is who is
              asking — a buyer checks whether the trips their travelers
              actually take are live before they read anything else. */}
          <div className="rise mt-10" style={{ animationDelay: "150ms" }}>
            <CorridorBar ctaLabel={SITE_HOME.corridorBarCtaSeeWhatTripNeeds[locale]} />
          </div>

          {/* ---------- intro ---------- */}
          <div
            className="rise mt-12 border-t border-border pt-8"
            style={{ animationDelay: "230ms" }}
          >
            <p className="d-md max-w-[34ch]">
              {SITE_HOME.introTitle[locale]}
            </p>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
              <p className="t-body-lg text-ink-2">
                {SITE_HOME.introBody[locale]}
              </p>
              <ul className="flex flex-col justify-center gap-3">
                {introBullets.map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden />
                    <span className="text-[15px] text-ink-2">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Shell>
      </header>

      {/* ---------- the problem ---------- */}
      <Section label={SITE_CHROME.sectionTheProblem[locale]}>
        <Head
          title={SITE_HOME.problemHeadTitle[locale]}
          lead={SITE_HOME.problemHeadLead[locale]}
        />

        <div className="mt-11 border-t border-border-strong">
          {/* The header cell carries the same left border and inset as the
              rows beneath it, or the label sits 48px left of the column it
              names — the one place on the page where a heading and its
              content did not line up. */}
          <div className="hidden grid-cols-2 gap-x-12 py-3 sm:grid">
            <span className="tag">{SITE_CHROME.doingItYourself[locale]}</span>
            <span className="tag border-s border-transparent ps-12 text-brand-text">
              {SITE_CHROME.withToplance[locale]}
            </span>
          </div>
          {ledgerRows.map((row) => (
            <div
              key={row.with}
              className="grid gap-x-12 gap-y-5 border-t border-border py-7 sm:grid-cols-2"
            >
              <div>
                <span className="tag mb-2 block sm:hidden">{SITE_CHROME.doingItYourself[locale]}</span>
                <p className="text-[17px] leading-relaxed text-ink-3">{row.alone}</p>
              </div>
              <div className="sm:border-s sm:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] sm:ps-12">
                <span className="tag mb-2 block text-brand-text sm:hidden">
                  {SITE_CHROME.withToplance[locale]}
                </span>
                <p className="text-[17px] font-medium leading-relaxed text-ink">
                  {row.with}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- how it works ---------- */}
      <Section id="how" label={SITE_CHROME.howItWorks[locale]}>
        <Head title={SITE_HOME.howItWorksHeadTitle[locale]} />

        {/* Subgrid, so the rule, the meta line, the title and the body each
            share a row across the columns. Without it a title that wraps to
            three lines drops its own body below its neighbours' and the four
            steps stop reading as one band.

            `gap-y-0` on the item because a subgrid inherits the parent's
            row gap: the 44px that separates two bands of steps would
            otherwise open up inside every step as well. The internal
            rhythm stays on the margins. */}
        <ol className="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto_1fr] xl:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="sm:row-span-4 sm:grid sm:grid-rows-subgrid sm:gap-y-0"
            >
              <span
                aria-hidden
                className="block h-[3px] rounded-[var(--radius-pill)] bg-brand"
              />
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="tag">
                  {SITE_CHROME.stepWord[locale]} {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="d-md mt-3">{step.title}</h3>
              <p className="t-muted mt-3 text-[15px]">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------- what you get ---------- */}
      {/* No heading above the cards: the copy doc supplies the six claims
          and nothing to introduce them with, and a title invented here
          would be the one line on the page the client never wrote. The
          rail label carries the section's name. */}
      <Section label={SITE_CHROME.sectionWhatYouGet[locale]}>
        {/* The one marketing section drawn as the product's own case-file
            cards — these six claims are what the signed-in screens
            actually look like, so they borrow that surface verbatim. */}
        <dl className="grid gap-6 md:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-sm)] sm:p-7"
            >
              <dt className="d-md">{f.title}</dt>
              <dd className="t-muted mt-3">{f.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ---------- your dashboard ---------- */}
      {/* The single dark beat, and the only place `--brand-2` is allowed to
          light anything. `dark` redefines every token for this subtree, so
          nothing below is hand-picked for a dark ground and the section
          cannot drift out of sync with the palette.

          `bg-surface`, not `bg-bg`: in dark mode `bg-bg` resolves to the
          page background and the beat disappears entirely.

          Was "The console" until the client's copy renamed it. The `orgs`
          id stays — it is linked from the footer and from anywhere else
          that has ever pointed at this section. */}
      <Section
        id="orgs"
        label={SITE_CHROME.yourDashboard[locale]}
        glow
        className="dark overflow-hidden bg-surface text-ink"
      >
        <div className="grid items-start gap-12 xl:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="d-lg max-w-[20ch]">
              {SITE_HOME.dashboardTitle[locale]}
            </h2>
            <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
              {SITE_HOME.dashboardBody[locale]}
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {dashboardBullets.map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                  <span className="text-[15px] text-ink-2">{x}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/employer/sign-up">
                  <Briefcase /> {SITE_HOME.talkToUsAboutTravelers[locale]}
                </Link>
              </Button>
              <Button asChild variant="tertiary">
                <Link href="/employer/sign-in">
                  {SITE_CHROME.agencySignIn[locale]} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg p-6">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <Shield className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
              <div>
                <p className="d-sm">{SITE_HOME.dashboardCardTitle[locale]}</p>
                <p className="t-muted mt-1 text-[15px]">
                  {SITE_HOME.dashboardCardBody[locale]}
                </p>
              </div>
            </div>
            <div className="mt-2">
              {ROSTER.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-4 border-b border-border py-4 last:border-b-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="d-sm block truncate">{p.name}</span>
                    <span className="num text-[13px] text-ink-3">{p.dest}</span>
                  </span>
                  <span className="hidden w-20 shrink-0 sm:block">
                    <Progress value={p.pct} />
                  </span>
                  <span className="tag w-[124px] shrink-0 whitespace-nowrap text-end text-ink-2">
                    {SITE_CHROME[p.stateKey][locale]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- where your travelers can go ---------- */}
      {/* The badge is counted rather than typed. The copy doc asks for
          "50+ routes live", which is a rounded claim about a number this
          page can read exactly — and a hardcoded 50 would go stale in the
          direction that understates the product. */}
      <Section
        id="where"
        label={SITE_CHROME.whereYouCanGo[locale]}
        datum={fillTemplate(SITE_HOME.whereDatumTemplate[locale], {
          count: String(LIVE_CORRIDORS.length),
        })}
      >
        <Head
          title={SITE_HOME.whereHeadTitle[locale]}
          lead={SITE_HOME.whereHeadLead[locale]}
        />
        {/* The copy doc closes this section with "Don't see a route you
            need? Ask for it, and we'll add it." `CorridorBoard` already
            ends with that message in its own words ("Missing a route?
            Ask for it and it enters the build queue with the demand
            attached to it."), and printing both put two consecutive
            invitations to ask for a route on the page. The board's line
            wins because it is the shared component `/travelers` renders
            too — rewording it is a change to both pages, not this one. */}
        <div className="mt-11">
          <CorridorBoard />
        </div>
      </Section>

      {/* ---------- proof ---------- */}
      {/* Held at the client's instruction (2026-09-05), not lost: the live
          stat register, the three testimonial slots and the agency logo
          strip were all placeholders, and empty cards next to real copy
          argue against the page rather than for it. It comes back when
          there are signed agencies whose results and words can be quoted.
          The markup is in git history at f7efb82 if it is wanted verbatim. */}

      {/* ---------- pricing ---------- */}
      <Section
        id="pricing"
        label={SITE_CHROME.pricing[locale]}
        datum={fillTemplate(SITE_HOME.pricingDatumTemplate[locale], { fee: baseFee })}
      >
        <Head
          title={SITE_HOME.pricingHeadTitle[locale]}
          lead={SITE_HOME.pricingHeadLead[locale]}
        />

        {/* The bands, before the calculator. A buyer who is shown a total
            without the rates behind it has to trust the arithmetic; one
            who is shown the rates can check it. */}
        <div className="mt-11 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
            <span
              aria-hidden
              className="block h-[3px] w-12 rounded-[var(--radius-pill)] bg-brand-accent"
            />
            <p className="d-lg mt-5">
              <span className="num">{baseFee}</span>
              <span className="t-muted text-[15px]"> {SITE_HOME.perMonth[locale]}</span>
            </p>
            <p className="t-muted mt-1 text-[15px]">
              {SITE_HOME.perBusinessAccountCycle[locale]}
            </p>

            <p className="tag mb-4 mt-8">{SITE_HOME.thenPerCompletedApplication[locale]}</p>
            <dl className="border-t border-border">
              {bands.map((band) => (
                <div
                  key={band.range}
                  className="flex items-baseline justify-between gap-6 border-b border-border py-3"
                >
                  <dt className="text-[15px] text-ink-2">{band.range}</dt>
                  <dd className="num text-base">{band.rate} {SITE_HOME.eachSuffix[locale]}</dd>
                </div>
              ))}
            </dl>
            {worked.layers.length >= 2 && (
              <p className="t-muted mt-4 text-[13px]">
                {SITE_HOME.layeredIntro[locale]}{" "}
                {fillTemplate(SITE_HOME.layeredBodyTemplate[locale], {
                  applications: worked.applications.toLocaleString("en-US"),
                  layers: worked.layers
                    .map(
                      (l) =>
                        `${l.count.toLocaleString("en-US")} ${SITE_CHROME.wordAt[locale]} ${compactMoney(l.rateMinor, rateCard.currency)}`
                    )
                    .join(` ${SITE_CHROME.wordAnd[locale]} `),
                  not: SITE_HOME.notWord[locale],
                  rate: compactMoney(
                    worked.layers[worked.layers.length - 1].rateMinor,
                    rateCard.currency
                  ),
                })}
              </p>
            )}
          </div>

          <PricingEstimator card={rateCard} />
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col p-7 lg:p-9">
            <span className="tag block">{SITE_HOME.agenciesTag[locale]}</span>
            <p className="d-sm mt-3">{SITE_HOME.whatEveryApplicationCarries[locale]}</p>

            {/* Split rather than one flat list: a buyer needs to see which
                half of this is the service their traveler receives and
                which half is the dashboard they log into themselves. */}
            <div className="mb-8 mt-8 grid gap-8 lg:grid-cols-2 lg:gap-x-10">
              <div>
                <p className="tag mb-4">{SITE_HOME.yourTravelerGets[locale]}</p>
                <ul className="grid gap-3">
                  {seatIncludesTraveler.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                      <span className="text-[15px] text-ink-2">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="tag mb-4">{SITE_HOME.yourAgencyGets[locale]}</p>
                <ul className="grid gap-3">
                  {seatIncludesAgency.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                      <span className="text-[15px] text-ink-2">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button asChild size="block" variant="primary" className="lg:max-w-[320px]">
              <Link href="/employer/sign-up">{SITE_CHROME.runYourFirstCase[locale]}</Link>
            </Button>
          </div>

          {/* Exclusions and terms sit inside the same panel, below a rule,
              rather than in a separate section. They are part of the price
              — a buyer who has to scroll to find them reads them as
              something that was being kept back. */}
          <div className="grid gap-8 border-t border-border bg-surface-2 p-7 md:grid-cols-2 lg:gap-x-10 lg:p-9">
            <div>
              <p className="tag mb-4">{SITE_HOME.whatACaseDoesNotCover[locale]}</p>
              <ul className="grid gap-3">
                {seatExcludes.map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <Minus className="mt-1 size-4 shrink-0 text-ink-3" aria-hidden />
                    <span className="text-[15px] text-ink-3">{x}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="tag mb-4">{SITE_HOME.commercialTerms[locale]}</p>
              <dl className="border-t border-border">
                {termsFor(rateCard, locale).map((t) => (
                  <div
                    key={t.label}
                    className="grid items-baseline gap-x-6 gap-y-1 border-b border-border py-3 sm:grid-cols-[minmax(0,150px)_1fr]"
                  >
                    <dt className="tag">{t.label}</dt>
                    <dd className="text-[15px] text-ink-2">
                      {t.value ?? (
                        <span
                          aria-label={SITE_HOME.awaitingFigureAriaLabel[locale]}
                          className="inline-block w-[90px] border-b-2 border-dashed border-border-strong align-middle"
                        />
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="t-muted mt-4 text-[13px]">
                {SITE_HOME.dashedRuleNote[locale]}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- questions ---------- */}
      <Section label={SITE_CHROME.sectionQuestions[locale]}>
        <Head title={SITE_HOME.questionsHeadTitle[locale]} />
        <Accordion
          type="single"
          collapsible
          className="mt-9 border-t border-border-strong"
        >
          {faqFor(rateCard, locale).map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="d-sm text-start">{f.q}</AccordionTrigger>
              <AccordionContent className="max-w-[74ch] text-[15px]">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="t-muted mt-9 text-[15px]">
          {SITE_HOME.individualPathQuestion[locale]}{" "}
          <Link
            href="/travelers"
            className="font-medium text-brand-text underline underline-offset-4"
          >
            {SITE_HOME.individualPathLinkText[locale]}
          </Link>{" "}
          {SITE_HOME.individualPathAnswerSuffix[locale]}
        </p>
      </Section>

      {/* ---------- closing ---------- */}
      {/* The one section with no rail. The register ends; this is the coda,
          and it returns to the same object the page opened on, with the
          trip you chose still in it — nobody who read the whole way
          down should have to travel back up to act. */}
      <section className="border-t border-border bg-[color-mix(in_srgb,var(--brand)_5%,var(--bg))] py-20 md:py-24">
        <Shell>
          <h2 className="d-lg max-w-[22ch]">{SITE_HOME.closingTitle[locale]}</h2>
          <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
            {SITE_HOME.closingBody[locale]}
          </p>
          <div className="mt-10">
            <CorridorBar ctaLabel={SITE_HOME.talkToUsAboutTravelers[locale]} />
          </div>
        </Shell>
      </section>
    </CorridorProvider>
  );
}
