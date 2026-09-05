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

/* The ledger is the same device the traveller page uses, re-aimed. Its
   left column is the agency's week, not the applicant's. */
const LEDGER = [
  {
    alone: "You look up the requirements yourself and hope nothing's changed",
    with: "Every traveler gets the right list for where they're going, always up to date",
  },
  {
    alone: "You check each document by hand and hope you caught the problems",
    with: "The wrong or unusable ones are caught before they reach you",
  },
  {
    alone: "You chase travelers and still can't say who's ready",
    with: "You see who's ready, who's stuck, and who needs a nudge, at a glance",
  },
  {
    alone: "A bad document turns up weeks in and costs you the case",
    with: "It's caught early and sent back to fix, before it costs anyone time",
  },
];

/**
 * The four steps no longer split into open and contracted halves.
 *
 * That distinction existed when steps 01–02 were scoping and quoting,
 * which cost nothing, and 03–04 were the paid work. The client's rewrite
 * describes a single continuous flow from a new traveler to a file the
 * agency's team can process, so there is no boundary left to draw and
 * every rule is the same weight.
 *
 * The doc writes these as run-in headings, bolded inline with the body
 * and closed with a full stop. Standing alone as an `h3` they take no
 * terminal punctuation, which is the only edit made to the supplied text.
 */
const STEPS = [
  {
    title: "Bring your travelers in",
    body: "Invite them by email — or let them come to you straight from your own website, so applications land in your team's screen on their own. (We can build that website for you, or add it to the one you have.)",
  },
  {
    title: "We guide each one through",
    body: "Every traveler is walked through exactly what they need to send, in their own language — so you don't have to explain a thing.",
  },
  {
    title: "We check every document",
    body: "That it's the right one, clear, complete and genuine. Anything wrong goes back to the traveler to fix.",
  },
  {
    title: "Your team takes it from there",
    body: "The moment a traveler's documents are all in, your team is told the file is ready.",
  },
];

/* The last two carry a fragment rather than a sentence in the copy doc —
   "The same simple way of working, for every trip." is one line, bolded
   up to the comma. Split at that comma so all six cards keep the same
   title/body shape rather than two of them rendering as a bare heading. */
const FEATURES = [
  {
    title: "One clear view of every traveler",
    body: "How far each has got and where they're going, all in one place, always up to date.",
  },
  {
    title: "Problems caught before they cost you",
    body: "The wrong or unusable documents are spotted early and fixed, long before they can lose you a case.",
  },
  {
    title: "A direct line between your travelers and your team",
    body: "Questions get answered and nobody goes quiet — messages sit right alongside each case.",
  },
  {
    title: "Every traveler's history in one place",
    body: "When they come back for their next trip, you're not starting from scratch.",
  },
  {
    title: "The same simple way of working",
    body: "For every trip.",
  },
  {
    title: "A full record of every case",
    body: "Kept as it happens.",
  },
];

const ROSTER = [
  { name: "Chioma Eze", dest: "CAN", pct: 100, state: "Submitted" },
  { name: "Kwame Mensah", dest: "ARE", pct: 100, state: "Under review" },
  { name: "Ifeoma Nwankwo", dest: "GBR", pct: 85, state: "Collecting" },
  { name: "Emeka Obi", dest: "CAN", pct: 0, state: "Draft" },
];

/**
 * One plan, since travellers became invite-only: nobody can buy a seat
 * for themselves, so the old Self-serve and Guided tiers had no buyer
 * left. What those tiers described is still exactly what a sponsored
 * traveller gets, so their feature lists are merged in here.
 *
 * Split into what the traveler gets and what the agency gets, because a
 * buyer reading a flat twelve-item list cannot tell which half is the
 * service and which half is the dashboard.
 */
const SEAT_INCLUDES = {
  traveller: [
    "Clear, step-by-step help with what to send, in their own language",
    "The exact documents for their trip",
    "Quick feedback when something's wrong, so they can fix it fast",
    "Handy tips to get ready before they travel",
    "Support after they arrive, for a smoother trip",
  ],
  organisation: [
    "A case you can open, cancel, or hand to someone else",
    "One place to see every traveler's progress and destination",
    "Only clean, ready files reaching your team",
    "A heads-up the moment a traveler's file is complete",
    "Messaging between your team and your travelers",
    "Every traveler's history, ready for their next trip",
    "One invoice for everything",
  ],
};

/* Naming the exclusions is not a concession — it is the difference
   between a page a procurement reviewer trusts and one they discount.
   Every line here is a cost the agency will meet regardless of
   supplier, so saying so early costs nothing and pre-empts the
   question that otherwise arrives at contract stage. */
const SEAT_EXCLUDES = [
  "Government and mission fees, which are paid to the destination, not to us",
  "Biometrics and appointment fees where a mission charges them",
  "Sworn or certified translation where a mission requires one",
  "Flights, insurance and accommodation",
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
function bandRows(card: RateCard) {
  return card.bands.map((band, i) => {
    const from = i === 0 ? 1 : (card.bands[i - 1].upTo as number) + 1;
    return {
      range:
        band.upTo === null
          ? `${ordinal(from)} and above`
          : `${ordinal(from)} – ${ordinal(band.upTo)}${i === 0 ? " application" : ""}`,
      rate: compactMoney(band.rateMinor, card.currency),
    };
  });
}

/* The commercial questions a buyer has to answer internally before they
   can sign anything. The labels are ours; the values are the client's,
   and the ones left blank are blank on purpose — a term invented here
   is a term someone will quote back in a negotiation. The copy doc
   leaves this table alone: it is factual reference, not marketing. */
function termsFor(card: RateCard) {
  const rates = card.bands
    .map((b) => compactMoney(b.rateMinor, card.currency))
    .join(" / ");

  return [
    { label: "Unit", value: "One completed application" },
    { label: "Billing", value: "Monthly, on your signup anniversary" },
    {
      label: "Base fee",
      value: `${compactMoney(card.baseFeeMinor, card.currency)} per month, per business account`,
    },
    { label: "Application fee", value: `${rates}, charged in layers` },
    { label: "Band reset", value: "At the start of every cycle" },
    { label: "Minimum commitment", value: null },
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

/** `201` → `"201st"`. English only, like the rest of this page. */
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
function faqFor(card: RateCard) {
  const [first, ...rest] = card.bands;
  // "$18 each for the first 200 in the month, $15 for the next 300, then
  // $12 beyond that" — the same sentence, from whatever bands exist.
  const invoiceRates = [
    `${compactMoney(first.rateMinor, card.currency)} each for the first ${(first.upTo ?? 0).toLocaleString("en-US")} in the month`,
    ...rest.map((band, i) => {
      const previous = card.bands[i].upTo as number;
      return band.upTo === null
        ? `then ${compactMoney(band.rateMinor, card.currency)} beyond that`
        : `${compactMoney(band.rateMinor, card.currency)} for the next ${(band.upTo - previous).toLocaleString("en-US")}`;
    }),
  ].join(", ");

  return [
    {
      q: "Do you process the visa or decide the outcome?",
      a: "No — that's your team's expertise. We get each traveler's file complete and correct, and flag problems early, so your staff process it faster. Government, appointment, translation, flight and insurance costs are all paid to others, not to us.",
    },
    {
      q: "What exactly can we see about our travelers' cases?",
      a: "Completion percentage, status, destination and whether a case is blocked — enough to know where every traveler stands. Your team doesn't open, download or preview the documents themselves; Toplance's reviewers do that. That boundary is built into the data model rather than being a permission an administrator can grant, so it holds for anyone you add to your account later, too.",
    },
    {
      q: "Does Toplance decide whether the visa is granted?",
      a: "No, and we are careful not to imply it. Missions and embassies make the decision. What Toplance controls is that the file is complete, correct and submitted the way that route expects — which is the part applications usually fail on. When a document shows as verified it means it has been accepted for review, not that the application has been approved.",
    },
    {
      q: "How are we invoiced?",
      a: `A ${compactMoney(card.baseFeeMinor, card.currency)} monthly base fee for the account, plus a fee for each application your traveler actually completes — ${invoiceRates}. The fee is layered, so passing a threshold only changes the price of the applications above it, never the ones below. An application is counted once its checklist is complete and every document has passed its check — an invitation nobody accepts, a checklist still being filled and one whose documents came back rejected are never charged. The estimator in the pricing section runs the real arithmetic.`,
    },
    {
      q: "What happens if a traveler drops out before they travel?",
      a: "A pending invitation can be cancelled from your dashboard, which releases the case before any work has begun on it. Once a traveler has started a case, whether that case can be handed to someone else is a contract term rather than a product setting — it is one of the terms listed above.",
    },
    {
      q: "Where is our travelers' data stored?",
      a: "Documents are encrypted at rest and in transit. Residency of the stored files is a decision your agency can set at contract level, so if you are bound to keep personal data in a particular jurisdiction that is a conversation to have before signing rather than a limitation you discover afterwards.",
    },
    {
      q: "Our travelers do not all read English.",
      a: "The intake conversation, the checklist and the status updates run in English, Hausa, Yoruba and Igbo, typed or spoken. Your traveler can switch language at any point, including mid-conversation, and their answers carry over. Your dashboard stays in English.",
    },
    {
      q: "Can we start with one route?",
      a: "Yes, and most agencies do. Cases are not tied to a destination, so a contract scoped around one route still covers the second one you open next quarter — provided it is live. If it is not, ask for it and it enters the build queue with your demand attached.",
    },
  ];
}

export default async function HomePage() {
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

  const bands = bandRows(rateCard);
  const baseFee = compactMoney(rateCard.baseFeeMinor, rateCard.currency);
  // A worked example, computed rather than written out, so it stays true
  // when the bands move. Suppressed on a single-band card, where "350 is
  // 200 at one rate and 150 at another" has nothing to say.
  const worked = quote(350, rateCard);

  return (
    <CorridorProvider>
      {/* ---------- hero ---------- */}
      {/* Server-rendered, unlike the traveller hero it replaces. That one
          is a client component because it translates itself into four
          languages; this copy addresses agency owners and operations
          leads and stays in English, so the only client boundary left
          in the hero is `CorridorBar` itself. */}
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
                For visa and relocation agencies
              </p>

              <h1 className="d-hero rise mt-5 max-w-[20ch]" style={{ animationDelay: "70ms" }}>
                Handle more travelers, with far less chasing.
              </h1>

              <p
                className="t-body-lg rise mt-6 max-w-[52ch] text-ink-2"
                style={{ animationDelay: "110ms" }}
              >
                The paperwork is the part that eats your team&apos;s time and
                puts your cases at risk. We take it off your hands — so the
                right documents come in, problems get caught early, and your
                team gets to the visa work sooner.
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
                    Get Started <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <a href={`mailto:${DEMO_EMAIL}?subject=Toplance%20demo`}>
                    Book a demo
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
            <CorridorBar ctaLabel="See what this trip needs" />
          </div>

          {/* ---------- intro ---------- */}
          <div
            className="rise mt-12 border-t border-border pt-8"
            style={{ animationDelay: "230ms" }}
          >
            <p className="d-md max-w-[34ch]">
              You do the visas. We take care of everything before them.
            </p>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
              <p className="t-body-lg text-ink-2">
                For every traveler you take on, we make sure they know exactly
                what to send, and that what they send is right — before it ever
                reaches your team. You always know where each traveler stands,
                and your staff only pick up files that are ready to work. No
                more chasing documents, no more nasty surprises weeks down the
                line.
              </p>
              <ul className="flex flex-col justify-center gap-3">
                {[
                  "Every traveler knows exactly what to bring",
                  "The wrong or unusable documents get caught early",
                  "You see where every traveler stands, in one place",
                ].map((line) => (
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
      <Section label="The problem">
        <Head
          title="Most travelers don't leave over a refusal. They leave over silence."
          lead="The damage is done in the gap — between telling a traveler what to send and finding out, weeks later, what they never sent, or sent wrong. By then the appointment has moved and your name is the one that looks unreliable. One bad story travels further than ten good ones. We close that gap, so nothing sits unnoticed."
        />

        <div className="mt-11 border-t border-border-strong">
          {/* The header cell carries the same left border and inset as the
              rows beneath it, or the label sits 48px left of the column it
              names — the one place on the page where a heading and its
              content did not line up. */}
          <div className="hidden grid-cols-2 gap-x-12 py-3 sm:grid">
            <span className="tag">Doing it yourself</span>
            <span className="tag border-s border-transparent ps-12 text-brand-text">
              With Toplance
            </span>
          </div>
          {LEDGER.map((row) => (
            <div
              key={row.with}
              className="grid gap-x-12 gap-y-5 border-t border-border py-7 sm:grid-cols-2"
            >
              <div>
                <span className="tag mb-2 block sm:hidden">Doing it yourself</span>
                <p className="text-[17px] leading-relaxed text-ink-3">{row.alone}</p>
              </div>
              <div className="sm:border-s sm:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] sm:ps-12">
                <span className="tag mb-2 block text-brand-text sm:hidden">
                  With Toplance
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
      <Section id="how" label="How it works">
        <Head title="From a new traveler to a file your team can process — in four steps." />

        {/* Subgrid, so the rule, the meta line, the title and the body each
            share a row across the columns. Without it a title that wraps to
            three lines drops its own body below its neighbours' and the four
            steps stop reading as one band.

            `gap-y-0` on the item because a subgrid inherits the parent's
            row gap: the 44px that separates two bands of steps would
            otherwise open up inside every step as well. The internal
            rhythm stays on the margins. */}
        <ol className="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto_1fr] xl:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="sm:row-span-4 sm:grid sm:grid-rows-subgrid sm:gap-y-0"
            >
              <span
                aria-hidden
                className="block h-[3px] rounded-[var(--radius-pill)] bg-brand"
              />
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="tag">Step {String(i + 1).padStart(2, "0")}</span>
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
      <Section label="What you get">
        {/* The one marketing section drawn as the product's own case-file
            cards — these six claims are what the signed-in screens
            actually look like, so they borrow that surface verbatim. */}
        <dl className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
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
        label="Your dashboard"
        glow
        className="dark overflow-hidden bg-surface text-ink"
      >
        <div className="grid items-start gap-12 xl:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="d-lg max-w-[20ch]">
              See who&apos;s ready and who&apos;s stuck, at a glance.
            </h2>
            <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
              One place that shows how far each traveler has got and what&apos;s
              holding them up — and tells you the moment a file is ready for
              your team.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                "Bring in a new traveler in seconds",
                "See progress and destination for every traveler",
                "Know the moment someone's documents are all in",
                "Message a traveler, or nudge anyone who's gone quiet",
                "Cancel an invite you no longer need",
              ].map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                  <span className="text-[15px] text-ink-2">{x}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/employer/sign-up">
                  <Briefcase /> Talk to us about your travelers
                </Link>
              </Button>
              <Button asChild variant="tertiary">
                <Link href="/employer/sign-in">
                  Agency sign-in <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg p-6">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <Shield className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
              <div>
                <p className="d-sm">You see progress, we handle the file</p>
                <p className="t-muted mt-1 text-[15px]">
                  Passports, bank statements and police certificates are
                  reviewed by Toplance, not chased by your team.
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
                    {p.state}
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
        label="Where your travelers can go"
        datum={`${LIVE_CORRIDORS.length} routes live · more on the way`}
      >
        <Head
          title="What a traveler needs comes down to three things: the passport they hold, where they're going, and why."
          lead="A Nigerian going to the UK for work needs a completely different file from a Ghanaian going to study. So the real question isn't “do you cover Canada?” — it's “do you cover the exact trips my travelers take?”"
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
        label="Pricing"
        datum={`${baseFee}/month + per application`}
      >
        <Head
          title="You only pay for the applications that finish."
          lead="A flat monthly fee for your account, plus a fee for each application a traveler completes. The more you handle, the less each one costs. Nothing's charged until an application finishes. Invites nobody accepts, and half-finished files, are never billed."
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
              <span className="t-muted text-[15px]"> / month</span>
            </p>
            <p className="t-muted mt-1 text-[15px]">
              per business account, every cycle
            </p>

            <p className="tag mb-4 mt-8">Then, per completed application</p>
            <dl className="border-t border-border">
              {bands.map((band) => (
                <div
                  key={band.range}
                  className="flex items-baseline justify-between gap-6 border-b border-border py-3"
                >
                  <dt className="text-[15px] text-ink-2">{band.range}</dt>
                  <dd className="num text-base">{band.rate} each</dd>
                </div>
              ))}
            </dl>
            {worked.layers.length >= 2 && (
              <p className="t-muted mt-4 text-[13px]">
                Layered, like income tax bands.{" "}
                {worked.applications.toLocaleString("en-US")} applications is{" "}
                {worked.layers
                  .map(
                    (l) =>
                      `${l.count.toLocaleString("en-US")} at ${compactMoney(l.rateMinor, rateCard.currency)}`
                  )
                  .join(" and ")}{" "}
                — not {worked.applications.toLocaleString("en-US")} at{" "}
                {compactMoney(
                  worked.layers[worked.layers.length - 1].rateMinor,
                  rateCard.currency
                )}
                .
              </p>
            )}
          </div>

          <PricingEstimator card={rateCard} />
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col p-7 lg:p-9">
            <span className="tag block">Agencies</span>
            <p className="d-sm mt-3">What every application carries</p>

            {/* Split rather than one flat list: a buyer needs to see which
                half of this is the service their traveler receives and
                which half is the dashboard they log into themselves. */}
            <div className="mb-8 mt-8 grid gap-8 lg:grid-cols-2 lg:gap-x-10">
              <div>
                <p className="tag mb-4">Your traveler gets</p>
                <ul className="grid gap-3">
                  {SEAT_INCLUDES.traveller.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                      <span className="text-[15px] text-ink-2">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="tag mb-4">Your agency gets</p>
                <ul className="grid gap-3">
                  {SEAT_INCLUDES.organisation.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                      <span className="text-[15px] text-ink-2">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button asChild size="block" variant="primary" className="lg:max-w-[320px]">
              <Link href="/employer/sign-up">Run your first case</Link>
            </Button>
          </div>

          {/* Exclusions and terms sit inside the same panel, below a rule,
              rather than in a separate section. They are part of the price
              — a buyer who has to scroll to find them reads them as
              something that was being kept back. */}
          <div className="grid gap-8 border-t border-border bg-surface-2 p-7 md:grid-cols-2 lg:gap-x-10 lg:p-9">
            <div>
              <p className="tag mb-4">What a case does not cover</p>
              <ul className="grid gap-3">
                {SEAT_EXCLUDES.map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <Minus className="mt-1 size-4 shrink-0 text-ink-3" aria-hidden />
                    <span className="text-[15px] text-ink-3">{x}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="tag mb-4">Commercial terms</p>
              <dl className="border-t border-border">
                {termsFor(rateCard).map((t) => (
                  <div
                    key={t.label}
                    className="grid items-baseline gap-x-6 gap-y-1 border-b border-border py-3 sm:grid-cols-[minmax(0,150px)_1fr]"
                  >
                    <dt className="tag">{t.label}</dt>
                    <dd className="text-[15px] text-ink-2">
                      {t.value ?? (
                        <span
                          aria-label="Set in your contract — awaiting a figure"
                          className="inline-block w-[90px] border-b-2 border-dashed border-border-strong align-middle"
                        />
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="t-muted mt-4 text-[13px]">
                A dashed rule is a term the client has not set yet, not a term
                we are withholding.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- questions ---------- */}
      <Section label="Questions">
        <Head title="The questions agencies actually ask." />
        <Accordion
          type="single"
          collapsible
          className="mt-9 border-t border-border-strong"
        >
          {faqFor(rateCard).map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="d-sm text-start">{f.q}</AccordionTrigger>
              <AccordionContent className="max-w-[74ch] text-[15px]">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="t-muted mt-9 text-[15px]">
          Booking your own visa rather than running it for a traveler?{" "}
          <Link
            href="/travelers"
            className="font-medium text-brand-text underline underline-offset-4"
          >
            The individual path
          </Link>{" "}
          answers what you&apos;ll be asked to do.
        </p>
      </Section>

      {/* ---------- closing ---------- */}
      {/* The one section with no rail. The register ends; this is the coda,
          and it returns to the same object the page opened on, with the
          trip you chose still in it — nobody who read the whole way
          down should have to travel back up to act. */}
      <section className="border-t border-border bg-[color-mix(in_srgb,var(--brand)_5%,var(--bg))] py-20 md:py-24">
        <Shell>
          <h2 className="d-lg max-w-[22ch]">Tell us where your travelers go.</h2>
          <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
            Finding out what you&apos;d pay costs nothing and commits you to
            nothing. You&apos;ll leave with a price you can compare to how you
            work today — whether or not you come back.
          </p>
          <div className="mt-10">
            <CorridorBar ctaLabel="Talk to us about your travelers" />
          </div>
        </Shell>
      </section>
    </CorridorProvider>
  );
}
