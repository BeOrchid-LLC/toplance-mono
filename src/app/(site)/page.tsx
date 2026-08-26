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
import { LIVE_CORRIDORS } from "@/lib/domain/corridors";
import { cn } from "@/lib/utils";

/**
 * The only route with no session. Statically rendered and cached at the
 * edge — the sticky nav, the corridor state, the FAQ accordion and the
 * theme switch are the only client-side JavaScript on it.
 */
export const dynamic = "force-static";

/* Figures, quotes, portraits and prices are the client's to supply. Rather
   than dressing invented numbers up as real ones, the page shows the shape
   of the claim and leaves the value visibly empty — a blank reads as
   honest, a fabricated statistic is a liability the moment it is public. */
const REGISTER = [
  // Corridors, not destinations. This counted `CORRIDORS_LIVE`, a list of
  // countries, under a label reading "Corridors live" and a note claiming
  // it came from the corridor table — three ways of saying eight when the
  // table holds four. `LIVE_CORRIDORS` is asserted against `seed.sql`, so
  // the note is now true as well as the figure.
  { label: "Corridors live", value: String(LIVE_CORRIDORS.length), note: "Counted from the corridor table" },
  { label: "Applications guided", value: null, note: "Since launch" },
  { label: "Approved on first submission", value: null, note: "Across live corridors" },
  { label: "Median time to a complete checklist", value: null, note: "From first question" },
];

const LEDGER = [
  {
    alone: "An embassy page written for every applicant, not for you",
    with: "One checklist built from your nationality, destination and purpose",
  },
  {
    alone: "An agent in a shop who will not tell you what they are charging for",
    with: "A price you see before you commit to anything",
  },
  {
    alone: "A rejection three months later for a document nobody mentioned",
    with: "Every document checked before a mission sees it",
  },
  {
    alone: "Fees paid again to reapply, and a refusal on your record",
    with: "A named person who answers you, in your language",
  },
];

const STEPS = [
  {
    paid: false,
    title: "Talk, do not fill in forms",
    body: "A short conversation in English, Hausa, Yoruba or Igbo — typed or spoken. One question at a time, and any answer can be corrected later without starting again.",
  },
  {
    paid: false,
    title: "Get the checklist that is actually yours",
    body: "Your nationality, your destination and your reason for travelling resolve to one specific document list — not a generic embassy page you have to interpret yourself.",
  },
  {
    paid: true,
    title: "Upload, and be told what is wrong early",
    body: "Photograph a document with your phone. Each file is checked for the things that get applications rejected — expiry, legibility, the wrong name order — before a mission ever sees it.",
  },
  {
    paid: true,
    title: "Submitted, tracked, and met on arrival",
    body: "A named case handler owns your file, you can message a person at any point, and once you are approved the app becomes an arrival plan for your first weeks.",
  },
];

const FEATURES = [
  {
    title: "An agent, not a 40-field form",
    body: "Intake is a conversation. It adapts to your answers, skips what does not apply to you, and every answer stays editable in place.",
  },
  {
    title: "A rules engine, not a static list",
    body: "Requirements are versioned rule sets per corridor. When a mission changes what it wants, everyone on that corridor sees the change — with the date it took effect.",
  },
  {
    title: "A person actually looks",
    body: "Automatic checks catch the obvious problems. A Toplance reviewer confirms every document before submission. Verified means accepted for review — never a promise of approval.",
  },
  {
    title: "One thread, one case handler",
    body: "No ticket numbers, no starting over with someone new. You can open a message to your handler at any point, not only when we message you first.",
  },
  {
    title: "The app does not stop at approval",
    body: "After the decision it becomes an arrival plan: what to carry, what to register for in your first week, and alerts timed to your own quiet hours.",
  },
  {
    title: "Privacy is a boundary, not a setting",
    body: "When an employer sponsors your seat they see your progress and whether you are stuck. They never see a passport, a bank statement or a police certificate.",
  },
];

const ROSTER = [
  { name: "Chioma Eze", dest: "CAN", pct: 100, state: "Submitted" },
  { name: "Kwame Mensah", dest: "ARE", pct: 100, state: "Under review" },
  { name: "Ifeoma Nwankwo", dest: "GBR", pct: 85, state: "Collecting" },
  { name: "Emeka Obi", dest: "CAN", pct: 0, state: "Draft" },
];

const PLANS = [
  {
    name: "Self-serve",
    price: "Free",
    sub: "to see your checklist",
    featured: false,
    features: [
      "The full intake conversation",
      "Your exact document checklist",
      "Automatic checks on every upload",
      "Pay only when you submit",
    ],
    cta: "Start now",
    href: "/sign-up",
  },
  {
    name: "Guided",
    price: "₦00,000",
    sub: "per application",
    featured: true,
    features: [
      "Everything in Self-serve",
      "A named Toplance case handler",
      "Human review before submission",
      "Arrival plan and alerts after approval",
      "Priority replies within one working day",
    ],
    cta: "Start now",
    href: "/sign-up",
  },
  {
    name: "Organisations",
    price: "By seat",
    sub: "billed annually",
    featured: false,
    features: [
      "Everything in Guided for each person",
      "Seats, invitations and a roster view",
      "Progress without document access",
      "Consolidated invoicing",
      "A named account contact",
    ],
    cta: "Talk to us",
    href: "/employer/sign-in",
  },
];

const FAQ = [
  {
    q: "Does Toplance decide whether I get a visa?",
    a: "No, and we are careful never to imply it. Missions and embassies make the decision. What Toplance controls is that your file is complete, correct and submitted the way that corridor expects — which is the part applicants usually lose on. When a document shows as verified it means it has been accepted for review, not that your application has been approved.",
  },
  {
    q: "What does it cost to find out what I need?",
    a: "Nothing. The intake conversation and the resulting checklist are free, and you can leave with the list even if you never submit through us. You pay when you ask us to handle an application.",
  },
  {
    q: "Which languages can I use?",
    a: "English, Hausa, Yoruba and Igbo — for the conversation, the checklist and the status updates. You can switch language at any point, including mid-conversation, and your answers carry over.",
  },
  {
    q: "My employer is paying. What can they see?",
    a: "Your completion percentage, your status and whether you are blocked — enough for them to plan your start date. They cannot open, download or preview a single document you upload. That boundary is built into the data model, not a permission someone can toggle.",
  },
  {
    q: "What happens to my documents after a decision?",
    a: "They stay in your account so you can reuse them for the next application — renewals and dependants reuse most of the same file. You can delete any document, and deleting your account removes them all. Residency of the stored files is a decision your organisation can set at contract level.",
  },
  {
    q: "I already started an application somewhere else. Can you take it over?",
    a: "Usually yes. Run the intake conversation, upload what you already have, and the checklist will show you only the gap that is left rather than asking you to gather everything again.",
  },
];

/**
 * Every section is one entry in a register, and its name lives in the
 * margin beside it rather than on a band across the page.
 *
 * The band this replaces was the page's own signature turned into
 * wallpaper: a run of `<` fillers that encoded nothing, printed seven
 * times, on a grey slab that chopped the page into the strips this
 * redesign existed to remove. The MRZ still appears twice — in the hero
 * and in the closing bar — where it carries the actual corridor. Making
 * it rare is what makes it read as a mark rather than as a texture.
 *
 * The rail is sticky, so the name of the part you are reading stays
 * beside you the whole way down it. `datum` is for a fact and never a
 * label; with nothing true to say, the rail carries only the name.
 */
function Section({
  id,
  label,
  datum,
  glow = false,
  className,
  children,
}: {
  id?: string;
  label: string;
  datum?: string;
  glow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative isolate scroll-mt-[var(--bar-h)] border-t border-border",
        className
      )}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[10%] -top-[40%] -z-10 size-[680px] rounded-full opacity-40 blur-[130px] [background:radial-gradient(circle,var(--brand-2),transparent_70%)]"
        />
      )}
      <Shell className="grid gap-x-14 gap-y-9 py-20 md:py-24 lg:grid-cols-[184px_1fr]">
        <div className="lg:sticky lg:top-[calc(var(--bar-h)+40px)] lg:self-start">
          <span
            aria-hidden
            className="mb-3 block h-[2px] w-6 rounded-[var(--radius-pill)] bg-brand"
          />
          <p className="tag text-ink-2">{label}</p>
          {datum && <p className="tag mt-2 leading-relaxed">{datum}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </Shell>
    </section>
  );
}

function Head({ title, lead }: { title: string; lead?: string }) {
  return (
    <div>
      <h2 className="d-lg max-w-[26ch]">{title}</h2>
      {lead && <p className="t-body-lg mt-5 max-w-[62ch] text-ink-2">{lead}</p>}
    </div>
  );
}

export default function HomePage() {
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
      <Section label="The problem">
        <Head title="The paperwork is not the hard part. Knowing which paperwork is." />

        <div className="mt-11 border-t border-border-strong">
          <div className="hidden grid-cols-2 gap-x-12 py-3 sm:grid">
            <span className="tag">Doing it alone</span>
            <span className="tag text-brand-text">With Toplance</span>
          </div>
          {LEDGER.map((row) => (
            <div
              key={row.with}
              className="grid gap-x-12 gap-y-5 border-t border-border py-7 sm:grid-cols-2"
            >
              <div>
                <span className="tag mb-2 block sm:hidden">Doing it alone</span>
                <p className="text-[17px] leading-relaxed text-ink-3">{row.alone}</p>
              </div>
              <div className="sm:border-l sm:border-[color-mix(in_srgb,var(--brand)_35%,transparent)] sm:pl-12">
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
      <Section id="how" label="How it works" datum="Steps 01–02 are free">
        <Head
          title="Four steps, and you can stop after the second"
          lead="The conversation and the checklist cost nothing and are yours to keep. Everything after that is what you pay us for."
        />

        <ol className="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, i) => (
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
                <span className="tag">Step {String(i + 1).padStart(2, "0")}</span>
                <span
                  className={cn("tag", step.paid ? "text-ink-3" : "text-brand-text")}
                >
                  {step.paid ? "Paid" : "Free"}
                </span>
              </div>
              <h3 className="d-md mt-3">{step.title}</h3>
              <p className="t-muted mt-3 text-[15px]">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------- what you get ---------- */}
      <Section label="What you get">
        <Head
          title="Built around the two things that actually go wrong"
          lead="People submit the wrong documents, and then nobody tells them what is happening. Every item here closes one of those two gaps."
        />
        {/* The one marketing section drawn as the product's own case-file
            cards — these six claims are what the signed-in screens
            actually look like, so they borrow that surface verbatim. */}
        <dl className="mt-12 grid gap-6 md:grid-cols-2">
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

      {/* ---------- organisations ---------- */}
      {/* The single dark beat, and the only place `--brand-2` is allowed to
          light anything. `dark` redefines every token for this subtree, so
          nothing below is hand-picked for a dark ground and the section
          cannot drift out of sync with the palette.

          `bg-surface`, not `bg-bg`: in dark mode `bg-bg` resolves to the
          page background and the beat disappears entirely. */}
      <Section
        id="orgs"
        label="For organisations"
        glow
        className="dark overflow-hidden bg-surface text-ink"
      >
        <div className="grid items-start gap-12 xl:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="d-lg max-w-[18ch]">
              Sponsor the seat. See the progress. Never see the passport.
            </h2>
            <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
              If you are relocating staff, you need to know who is on track and
              who is stuck — and you should not be holding anyone&apos;s identity
              documents to find out. The organisation console gives you a roster,
              a completion score and a status per person, and nothing else.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                "Buy seats in advance and invite people by email",
                "One roster with completion, status and destination per person",
                "Nudge someone who has stalled without calling them",
                "Consolidated invoicing and a named account contact",
              ].map((x) => (
                <li key={x} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                  <span className="text-[15px] text-ink-2">{x}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/employer/sign-in">
                  <Briefcase /> Talk to us about seats
                </Link>
              </Button>
              <Button asChild variant="tertiary">
                <Link href="/employer/sign-in">
                  Employer sign-in <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg p-6">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <Shield className="mt-0.5 size-5 shrink-0 text-brand-text" aria-hidden />
              <div>
                <p className="d-sm">You see progress, never documents</p>
                <p className="t-muted mt-1 text-[15px]">
                  Passports, bank statements and police certificates stay between
                  the traveller and Toplance.
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
                  <span className="tag w-[124px] shrink-0 whitespace-nowrap text-right text-ink-2">
                    {p.state}
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
        label="Where we work"
        datum={`${LIVE_CORRIDORS.length} live · more in build`}
      >
        <Head
          title="Corridors, not countries"
          lead="A corridor is one nationality travelling to one destination for one purpose. That is the unit a checklist is built from — a Nigerian passport holder going to the UK for work needs a different file to a Ghanaian going to study."
        />
        <div className="mt-11">
          <CorridorBoard />
        </div>
      </Section>

      {/* ---------- proof ---------- */}
      <Section label="Proof">
        <Head
          title="What we can prove, and what we cannot yet"
          lead="Toplance is pre-launch. Rather than print numbers nobody has earned, the figures below stay blank until the client supplies them — a blank is honest, an invented statistic is a liability."
        />

        <dl className="mt-11 border-t border-border-strong">
          {REGISTER.map((row) => (
            <div
              key={row.label}
              className="grid items-baseline gap-x-8 gap-y-1 border-b border-border py-6 sm:grid-cols-[1fr_96px_1fr]"
            >
              <dt className="d-sm">{row.label}</dt>
              <dd
                className={cn(
                  "num text-[28px] font-semibold sm:text-right",
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
              <dd className="tag sm:text-right">{row.note}</dd>
            </div>
          ))}
        </dl>

        <p className="tag mt-12">In their own words</p>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {[
            "A traveller who avoided a trip to an agent",
            "An employer on seat visibility",
            "A second corridor, so this does not read as one use case",
          ].map((slot) => (
            <figure
              key={slot}
              className="flex min-h-[170px] flex-col justify-between rounded-md border border-dashed border-border-strong p-6"
            >
              <span aria-hidden className="d-lg leading-none text-border-strong">
                &rdquo;
              </span>
              <figcaption className="t-muted text-[15px]">
                Awaiting a real, attributed sentence — {slot.toLowerCase()}.
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="tag mt-11">Organisations we work with</p>
        <div className="mt-4 flex flex-wrap gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="tag grid h-14 min-w-[130px] flex-1 place-items-center rounded-sm border border-dashed border-border-strong"
            >
              Logo {i}
            </span>
          ))}
        </div>
      </Section>

      {/* ---------- pricing ---------- */}
      <Section id="pricing" label="Pricing" datum="Free until you ask us to work">
        <Head
          title="Free until you ask us to do the work"
          lead="The conversation and the checklist cost nothing, and you can walk away with the list. You pay when you want a handler, a human review and a submission. Plan names and structure are ours to propose; the amounts below are placeholders for the client to set."
        />

        <div className="mt-11 grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col p-7",
                p.featured &&
                  "bg-[color-mix(in_srgb,var(--brand-accent)_7%,var(--surface))]"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "block h-[3px] rounded-[var(--radius-pill)]",
                  p.featured ? "bg-brand-accent" : "bg-border-strong"
                )}
              />
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="tag">{p.name}</span>
                {p.featured && <span className="tag text-warning-ink">Most chosen</span>}
              </div>
              <p className="d-lg mt-4">{p.price}</p>
              <p className="t-muted text-[15px]">{p.sub}</p>
              <ul className="mb-8 mt-7 flex flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-brand-text" aria-hidden />
                    <span className="text-[15px] text-ink-2">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="block"
                variant={p.featured ? "primary" : "secondary"}
                className="mt-auto"
              >
                <Link href={p.href}>{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- questions ---------- */}
      <Section label="Questions">
        <Head title="The ones people actually ask" />
        <Accordion
          type="single"
          collapsible
          className="mt-9 border-t border-border-strong"
        >
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="d-sm text-left">{f.q}</AccordionTrigger>
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
          <h2 className="d-lg max-w-[19ch]">
            Find out what you need. It costs nothing to ask.
          </h2>
          <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
            A few short questions and you have your checklist. No card, no
            commitment, and the list is yours whether you submit through us or
            not.
          </p>
          <div className="mt-10">
            <CorridorBar />
          </div>
        </Shell>
      </section>
    </CorridorProvider>
  );
}
