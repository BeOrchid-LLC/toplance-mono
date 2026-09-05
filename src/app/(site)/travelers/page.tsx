import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Check, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { HeroCopy } from "@/components/site/hero-copy";
import { CorridorBar } from "@/components/site/corridor-bar";
import { CorridorBoard } from "@/components/site/corridor-board";
import { CorridorProvider } from "@/components/site/corridor-state";
import { Shell } from "@/components/shared/shell";
import { Head, Section } from "@/components/site/section";
import { LIVE_CORRIDORS } from "@/lib/domain/corridors";
import { cn } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { SITE_CHROME } from "@/lib/i18n/site-chrome";
import { fillTemplate } from "@/lib/i18n/corridor-picker";
import {
  SITE_TRAVELERS,
  registerRowsFor,
  ledgerRowsFor,
  stepsFor,
  featuresFor,
  orgBulletsFor,
  testimonialSlotsFor,
  seatPlanFeaturesFor,
  faqFor,
} from "@/lib/i18n/site-travelers";

/**
 * The traveller's landing page, and the page `/` used to be.
 *
 * It moved here rather than being rewritten when the home page was
 * turned over to the organisations who actually buy seats (client
 * instruction, 2026-09-03: update the B2B, do not delete the B2C).
 *
 * Translated into all 10 site locales on 2026-09-05, the same as the
 * rest of the site — the earlier review hold (the client had a review
 * outstanding on this copy, and a page under review should not shift)
 * was lifted by explicit client instruction on that date. The hero
 * above (`HeroCopy`) already handled its own translation; this page
 * covers everything below it. The English strings the FAQ and steps
 * quote — "English, Hausa, Yoruba and Igbo" — describe languages the
 * *product's* intake conversation supports and are translated as part
 * of the surrounding sentence, which is a separate thing from the site
 * chrome locale this page itself now renders in.
 *
 * Statically rendered and cached at the edge — the sticky nav, the
 * corridor state, the FAQ accordion and the theme switch are the only
 * client-side JavaScript on it.
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "For travelers",
  description:
    "Know exactly what your visa needs before you spend anything on it — one checklist built from your nationality, destination and purpose.",
};

/**
 * Illustrative sample data for the organisation console preview card —
 * names, destinations and completion numbers a reader recognises as a
 * mockup, not copy. `stateKey` points at the matching `SITE_CHROME`
 * roster-state string, which is real copy and gets translated.
 */
const ROSTER = [
  { name: "Chioma Eze", dest: "CAN", pct: 100, stateKey: "rosterSubmitted" as const },
  { name: "Kwame Mensah", dest: "ARE", pct: 100, stateKey: "rosterUnderReview" as const },
  { name: "Ifeoma Nwankwo", dest: "GBR", pct: 85, stateKey: "rosterCollecting" as const },
  { name: "Emeka Obi", dest: "CAN", pct: 0, stateKey: "rosterDraft" as const },
];

/** PLACEHOLDER, per `SEAT_PLAN`'s note below — not copy, so not translated. */
const SEAT_PLAN_HREF = "/employer/sign-up";

export default async function TravellersPage() {
  const locale = await getLocale();

  /* Figures, quotes, portraits and prices are the client's to supply. Rather
     than dressing invented numbers up as real ones, the page shows the shape
     of the claim and leaves the value visibly empty — a blank reads as
     honest, a fabricated statistic is a liability the moment it is public. */
  const registerRows = registerRowsFor(locale).map((row, i) => ({
    ...row,
    // Corridors, not destinations. `LIVE_CORRIDORS` is asserted against
    // `seed.sql`, so this figure stays true rather than invented.
    value: i === 0 ? String(LIVE_CORRIDORS.length) : null,
  }));

  const ledgerRows = ledgerRowsFor(locale);
  const steps = stepsFor(locale);
  const features = featuresFor(locale);
  const orgBullets = orgBulletsFor(locale);
  const testimonialSlots = testimonialSlotsFor(locale);

  /**
   * One plan, since travellers became invite-only (client decision,
   * 2026-08-31): nobody can buy a seat for themselves, so the Self-serve
   * and Guided tiers had no buyer left. Their feature lists are not
   * discarded — they are merged in here, because what those tiers
   * described is still exactly what a sponsored traveller gets.
   *
   * The price stays a placeholder. Figures are the client's to supply.
   */
  const seatPlanFeatures = seatPlanFeaturesFor(locale);

  const faq = faqFor(locale);

  return (
    <CorridorProvider>
      {/* ---------- hero ---------- */}
      <header className="relative isolate overflow-hidden">
        <div aria-hidden className="security-paper pointer-events-none absolute inset-0 -z-10" />
        <Shell className="pb-20 pt-12 md:pb-28 md:pt-16">
          <HeroCopy />
        </Shell>
      </header>

      {/* ---------- the problem ---------- */}
      <Section label={SITE_CHROME.sectionTheProblem[locale]}>
        <Head title={SITE_TRAVELERS.problemHeadTitle[locale]} />

        <div className="mt-11 border-t border-border-strong">
          <div className="hidden grid-cols-2 gap-x-12 py-3 sm:grid">
            <span className="tag">{SITE_CHROME.doingItAlone[locale]}</span>
            <span className="tag text-brand-text">{SITE_CHROME.withToplance[locale]}</span>
          </div>
          {ledgerRows.map((row) => (
            <div
              key={row.with}
              className="grid gap-x-12 gap-y-5 border-t border-border py-7 sm:grid-cols-2"
            >
              <div>
                <span className="tag mb-2 block sm:hidden">
                  {SITE_CHROME.doingItAlone[locale]}
                </span>
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
      <Section
        id="how"
        label={SITE_CHROME.howItWorks[locale]}
        datum={SITE_TRAVELERS.howItWorksDatum[locale]}
      >
        <Head
          title={SITE_TRAVELERS.howItWorksHeadTitle[locale]}
          lead={SITE_TRAVELERS.howItWorksHeadLead[locale]}
        />

        <ol className="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title}>
              {/* The rule is the free/paid boundary, drawn rather than
                  described — two brand rules, then two neutral ones. */}
              <span
                aria-hidden
                className={cn(
                  "block h-[3px] rounded-[var(--radius-pill)]",
                  step.paid ? "bg-border-strong" : "bg-brand"
                )}
              />
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="tag">
                  {SITE_CHROME.stepWord[locale]} {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn("tag", step.paid ? "text-ink-3" : "text-brand-text")}
                >
                  {step.paid ? SITE_CHROME.paidWord[locale] : SITE_CHROME.freeWord[locale]}
                </span>
              </div>
              <h3 className="d-md mt-3">{step.title}</h3>
              <p className="t-muted mt-3 text-[15px]">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------- what you get ---------- */}
      <Section label={SITE_CHROME.sectionWhatYouGet[locale]}>
        <Head
          title={SITE_TRAVELERS.whatYouGetHeadTitle[locale]}
          lead={SITE_TRAVELERS.whatYouGetHeadLead[locale]}
        />
        {/* The one marketing section drawn as the product's own case-file
            cards — these six claims are what the signed-in screens
            actually look like, so they borrow that surface verbatim. */}
        <dl className="mt-12 grid gap-6 md:grid-cols-2">
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

      {/* ---------- organisations ---------- */}
      {/* The single dark beat, and the only place `--brand-2` is allowed to
          light anything. `dark` redefines every token for this subtree, so
          nothing below is hand-picked for a dark ground and the section
          cannot drift out of sync with the palette.

          `bg-surface`, not `bg-bg`: in dark mode `bg-bg` resolves to the
          page background and the beat disappears entirely. */}
      <Section
        id="orgs"
        label={SITE_TRAVELERS.orgsLabel[locale]}
        glow
        className="dark overflow-hidden bg-surface text-ink"
      >
        <div className="grid items-start gap-12 xl:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="d-lg max-w-[18ch]">{SITE_TRAVELERS.orgsH2Title[locale]}</h2>
            <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
              {SITE_TRAVELERS.orgsBodyParagraph[locale]}
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {orgBullets.map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                  <span className="text-[15px] text-ink-2">{x}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/employer/sign-in">
                  <Briefcase /> {SITE_TRAVELERS.orgsSponsorSeatsCta[locale]}
                </Link>
              </Button>
              <Button asChild variant="tertiary">
                <Link href="/employer/sign-in">
                  {SITE_CHROME.employerSignIn[locale]} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg p-6">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <Shield className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
              <div>
                <p className="d-sm">{SITE_TRAVELERS.orgsCardTitle[locale]}</p>
                <p className="t-muted mt-1 text-[15px]">
                  {SITE_TRAVELERS.orgsCardBody[locale]}
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

      {/* ---------- corridors ---------- */}
      <Section
        id="where"
        label={SITE_CHROME.whereWeWork[locale]}
        datum={fillTemplate(SITE_TRAVELERS.corridorsDatumTemplate[locale], {
          count: String(LIVE_CORRIDORS.length),
        })}
      >
        <Head
          title={SITE_TRAVELERS.corridorsHeadTitle[locale]}
          lead={SITE_TRAVELERS.corridorsHeadLead[locale]}
        />
        <div className="mt-11">
          <CorridorBoard />
        </div>
      </Section>

      {/* ---------- proof ---------- */}
      <Section label={SITE_CHROME.sectionProof[locale]}>
        <Head
          title={SITE_TRAVELERS.proofHeadTitle[locale]}
          lead={SITE_TRAVELERS.proofHeadLead[locale]}
        />

        <dl className="mt-11 border-t border-border-strong">
          {registerRows.map((row) => (
            <div
              key={row.label}
              className="grid items-baseline gap-x-8 gap-y-1 border-b border-border py-6 sm:grid-cols-[1fr_96px_1fr]"
            >
              <dt className="d-sm">{row.label}</dt>
              <dd
                className={cn(
                  "num text-[28px] font-semibold sm:text-end",
                  row.value ? "text-brand-text" : "text-ink-3"
                )}
              >
                {row.value ?? (
                  <span
                    aria-label="Awaiting a real figure"
                    className="inline-block w-[74px] border-b-2 border-dashed border-border-strong align-middle"
                  />
                )}
              </dd>
              <dd className="tag sm:text-end">{row.note}</dd>
            </div>
          ))}
        </dl>

        <p className="tag mt-12">{SITE_TRAVELERS.proofInTheirOwnWordsTag[locale]}</p>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {testimonialSlots.map((slot) => (
            <figure
              key={slot}
              className="flex min-h-[170px] flex-col justify-between rounded-md border border-dashed border-border-strong p-6"
            >
              <span aria-hidden className="d-lg leading-none text-border-strong">
                &rdquo;
              </span>
              <figcaption className="t-muted text-[15px]">
                {fillTemplate(SITE_TRAVELERS.proofAwaitingSentenceTemplate[locale], { slot })}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="tag mt-11">{SITE_TRAVELERS.proofOrgsWeWorkWithTag[locale]}</p>
        <div className="mt-4 flex flex-wrap gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="tag grid h-14 min-w-[130px] flex-1 place-items-center rounded-sm border border-dashed border-border-strong"
            >
              {SITE_CHROME.logoWord[locale]} {i}
            </span>
          ))}
        </div>
      </Section>

      {/* ---------- pricing ---------- */}
      <Section
        id="pricing"
        label={SITE_CHROME.pricing[locale]}
        datum={SITE_TRAVELERS.pricingDatum[locale]}
      >
        <Head
          title={SITE_TRAVELERS.pricingHeadTitle[locale]}
          lead={SITE_TRAVELERS.pricingHeadLead[locale]}
        />

        {/* One panel, not a lonely card in a three-column grid. The
            feature list runs in two columns on wide screens because a
            single tier absorbed three tiers' worth of rows. */}
        <div className="mt-11 overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col p-7 lg:p-9">
            <span
              aria-hidden
              className="block h-[3px] rounded-[var(--radius-pill)] bg-brand-accent"
            />
            <span className="tag mt-4 block">{SITE_TRAVELERS.seatPlanName[locale]}</span>
            <p className="d-lg mt-4">{SITE_TRAVELERS.seatPlanPrice[locale]}</p>
            <p className="t-muted text-[15px]">{SITE_TRAVELERS.seatPlanSub[locale]}</p>
            <ul className="mb-8 mt-7 grid gap-3 lg:grid-cols-2 lg:gap-x-10">
              {seatPlanFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                  <span className="text-[15px] text-ink-2">{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="block" variant="primary" className="mt-auto lg:max-w-[320px]">
              <Link href={SEAT_PLAN_HREF}>{SITE_TRAVELERS.seatPlanCta[locale]}</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ---------- questions ---------- */}
      <Section label={SITE_CHROME.sectionQuestions[locale]}>
        <Head title={SITE_TRAVELERS.questionsHeadTitle[locale]} />
        <Accordion
          type="single"
          collapsible
          className="mt-9 border-t border-border-strong"
        >
          {faq.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="d-sm text-start">{f.q}</AccordionTrigger>
              <AccordionContent className="max-w-[74ch] text-[15px]">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      {/* ---------- closing ---------- */}
      {/* The one section with no rail. The register ends; this is the coda,
          and it returns to the same object the page opened on, with the
          corridor you chose still in it — nobody who read the whole way
          down should have to travel back up to act. */}
      <section className="border-t border-border bg-[color-mix(in_srgb,var(--brand)_5%,var(--bg))] py-20 md:py-24">
        <Shell>
          <h2 className="d-lg max-w-[19ch]">{SITE_TRAVELERS.closingTitle[locale]}</h2>
          <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
            {SITE_TRAVELERS.closingBody[locale]}
          </p>
          <div className="mt-10">
            <CorridorBar />
          </div>
        </Shell>
      </section>
    </CorridorProvider>
  );
}
