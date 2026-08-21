import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Files,
  Flag,
  Globe,
  Info,
  Mail,
  MessageSquare,
  RefreshCw,
  Scale,
  Send,
  Shield,
  Sparkles,
  Luggage,
  ListChecks,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { HeroArt } from "@/components/site/hero-art";
import { HeroCopy } from "@/components/site/hero-copy";
import { CORRIDORS_LIVE, CORRIDORS_SOON, ORIGINS } from "@/lib/domain/corridors";
import { cn } from "@/lib/utils";

/**
 * The only route with no session. Statically rendered and cached at the
 * edge — the sticky nav, FAQ accordion and theme switch are the only
 * client-side JavaScript on it.
 */
export const dynamic = "force-static";

/* Figures, quotes, portraits and prices are the client's to supply.
   Everything below renders as a visible placeholder until they do. A
   fabricated statistic is a liability the moment the page is public. */
const NUMBERS = [
  { big: "0,000", label: "Applications guided", sub: "since launch" },
  { big: "00%", label: "Approved on first submission", sub: "across live corridors" },
  { big: "00", label: "Corridors live", sub: "nationality × destination rule sets" },
  { big: "00 min", label: "To a complete checklist", sub: "median, from first question" },
];

const STEPS = [
  {
    icon: MessageSquare,
    title: "Talk, do not fill in forms",
    body: "A short conversation in English, Hausa, Yoruba or Igbo — typed or spoken. One question at a time, and any answer can be corrected later without starting again.",
  },
  {
    icon: ListChecks,
    title: "Get the checklist that is actually yours",
    body: "Your nationality, your destination and your reason for travelling resolve to one specific document list — not a generic embassy page you have to interpret yourself.",
  },
  {
    icon: Files,
    title: "Upload, and be told what is wrong early",
    body: "Photograph a document with your phone. Each file is checked for the things that get applications rejected — expiry, legibility, the wrong name order — before a mission ever sees it.",
  },
  {
    icon: Send,
    title: "Submitted, tracked, and met on arrival",
    body: "A named case handler owns your file, you can message a person at any point, and once you are approved the app becomes an arrival plan for your first weeks.",
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "An agent, not a 40-field form",
    body: "Intake is a conversation. It adapts to your answers, skips what does not apply to you, and every answer stays editable in place.",
  },
  {
    icon: Scale,
    title: "A rules engine, not a static list",
    body: "Requirements are versioned rule sets per corridor. When a mission changes what it wants, everyone on that corridor sees the change — with the date it took effect.",
  },
  {
    icon: Eye,
    title: "A person actually looks",
    body: "Automatic checks catch the obvious problems. A Toplance reviewer confirms every document before submission. Verified means accepted for review — never a promise of approval.",
  },
  {
    icon: Mail,
    title: "One thread, one case handler",
    body: "No ticket numbers, no starting over with someone new. You can open a message to your handler at any point, not only when we message you first.",
  },
  {
    icon: Luggage,
    title: "The app does not stop at approval",
    body: "After the decision it becomes an arrival plan: what to carry, what to register for in your first week, and alerts timed to your own quiet hours.",
  },
  {
    icon: Shield,
    title: "Privacy is a boundary, not a setting",
    body: "When an employer sponsors your seat they see your progress and whether you are stuck. They never see a passport, a bank statement or a police certificate.",
  },
];

const QUOTES = [
  {
    quote:
      "Placeholder quote. Replace with a real customer sentence about the moment Toplance saved them a trip to an agent, in their own words.",
    name: "Customer name",
    role: "Role · City",
  },
  {
    quote:
      "Placeholder quote. An organisation voice works well here — something about seat visibility without seeing staff documents.",
    name: "Contact name",
    role: "Title · Organisation",
  },
  {
    quote:
      "Placeholder quote. A third voice from a different corridor keeps this section from reading as one use case.",
    name: "Customer name",
    role: "Role · City",
  },
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

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-md border border-dashed border-border-strong bg-surface-2 px-4 py-3 text-base text-ink-2">
      <Info className="mt-0.5 size-5 shrink-0" />
      <span>
        <b className="text-ink">Placeholder.</b> {children}
      </span>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  lead,
}: {
  kicker: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="max-w-[56ch]">
      <p className="kicker mb-3">{kicker}</p>
      <h2 className="t-h2">{title}</h2>
      {lead && <p className="t-body-lg mt-3 text-ink-2">{lead}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ---------- hero ---------- */}
      <header className="relative overflow-hidden bg-[image:var(--brand-grad)]">
        <div
          aria-hidden
          className="absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.15)_1.3px,transparent_1.3px)] [background-size:34px_34px]"
        />
        <HeroArt />
        <div className="scrim on-scrim relative px-[max(24px,calc((100%-1080px)/2))] py-12 md:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <HeroCopy />
            <div className="hidden rounded-lg border border-white/30 bg-white/12 p-5 backdrop-blur-sm lg:block">
              <div className="flex items-center justify-between">
                <span className="t-title">Your checklist</span>
                <Badge className="border-white/20 bg-white/20 text-white">
                  United Kingdom
                </Badge>
              </div>
              <p className="special mt-2 text-white/80">
                SKILLED WORKER VISA · 13 DOCUMENTS
              </p>
              {[
                ["International passport", "Verified", CheckCircle2],
                ["Certificate of Sponsorship", "Verified", CheckCircle2],
                ["Six months of bank statements", "Checking", RefreshCw],
                ["Tuberculosis test certificate", "Not started", Circle],
              ].map(([name, state, Icon], i) => {
                const I = Icon as typeof CheckCircle2;
                return (
                  <div
                    key={name as string}
                    className={cn(
                      "flex items-start gap-3 py-3",
                      i > 0 && "border-t border-white/20"
                    )}
                  >
                    <I className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="t-title block">{name as string}</span>
                      <span className="special block text-white/75">
                        {(state as string).toUpperCase()}
                      </span>
                    </span>
                  </div>
                );
              })}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="special text-white/80">9 OF 13 VERIFIED</span>
                  <span className="t-title">69%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-white/25">
                  <div className="h-full w-[69%] rounded-[var(--radius-pill)] bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- numbers ---------- */}
      <section className="py-10">
        <div className="mx-auto max-w-[1140px] px-6">
          <Placeholder>
            Real figures come from you. Every number below is a typographic
            placeholder so nobody ships an invented statistic.
          </Placeholder>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {NUMBERS.map((n) => (
              <div
                key={n.label}
                className="rounded-md border border-border bg-surface p-5"
              >
                <p className="t-h1 text-brand-text">{n.big}</p>
                <p className="t-title mt-2">{n.label}</p>
                <p className="t-muted mt-1">{n.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- the problem ---------- */}
      <section className="bg-surface-2 py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <SectionHead
            kicker="The problem"
            title="The paperwork is not the hard part. Knowing which paperwork is."
          />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-surface p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--danger)_12%,var(--mix))] text-danger-ink">
                  <X className="size-5" />
                </span>
                <div>
                  <p className="t-h3">Without Toplance</p>
                  <ul className="mt-4 flex flex-col gap-3">
                    {[
                      "An embassy page written for every applicant, not for you",
                      "An agent in a shop who will not tell you what they are charging for",
                      "A rejection three months later for a document nobody mentioned",
                      "Fees paid again to reapply, and a refusal on your record",
                    ].map((x) => (
                      <li key={x} className="flex items-start gap-3">
                        <X className="mt-1 size-5 shrink-0 text-danger-ink" />
                        <span className="t-body text-ink-2">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand)_7%,var(--mix))] p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_14%,var(--mix))] text-brand-text">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <p className="t-h3">With Toplance</p>
                  <ul className="mt-4 flex flex-col gap-3">
                    {[
                      "One checklist built from your nationality, destination and purpose",
                      "A price you see before you commit to anything",
                      "Every document checked before a mission sees it",
                      "A named person who answers you, in your language",
                    ].map((x) => (
                      <li key={x} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-1 size-5 shrink-0 text-success-ink" />
                        <span className="t-body text-ink-2">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="scroll-mt-[var(--bar-h)] py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <SectionHead
            kicker="How it works"
            title="Four steps, and you can stop after the first one"
            lead="The checklist is free and yours to keep. Everything after step two is what you pay us for."
          />
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative pt-6">
                <span className="absolute left-0 top-0 grid size-8 place-items-center rounded-full bg-brand text-base font-bold text-on-brand">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-10 top-[15px] hidden h-0.5 bg-border-strong lg:block lg:right-[-24px]"
                  />
                )}
                <span className="mt-5 grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_12%,var(--mix))] text-brand-text">
                  <s.icon className="size-5" />
                </span>
                <h3 className="t-h3 mt-4">{s.title}</h3>
                <p className="t-muted mt-3">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sign-up">
                See your checklist — free <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section className="bg-surface-2 py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <SectionHead
            kicker="What you get"
            title="Built around the two things that actually go wrong"
            lead="People submit the wrong documents, and then nobody tells them what is happening. Every feature here exists to close one of those two gaps."
          />
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-md border border-border bg-surface p-6 transition-[border-color,transform] duration-[var(--dur-toggle)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-brand"
              >
                <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_12%,var(--mix))] text-brand-text">
                  <f.icon className="size-5" />
                </span>
                <h3 className="t-h3 mt-4">{f.title}</h3>
                <p className="t-muted mt-3">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- organisations ---------- */}
      <section id="orgs" className="scroll-mt-[var(--bar-h)] py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="kicker mb-3">For organisations</p>
              <h2 className="t-h2">
                Sponsor the seat. See the progress. Never see the passport.
              </h2>
              <p className="t-body-lg mt-4 text-ink-2">
                If you are relocating staff, you need to know who is on track and
                who is stuck — and you should not be holding anyone&apos;s identity
                documents to find out. The organisation console gives you a roster,
                a completion score and a status per person, and nothing else.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {[
                  "Buy seats in advance and invite people by email",
                  "One roster with completion, status and destination per person",
                  "Nudge someone who has stalled without calling them",
                  "Consolidated invoicing and a named account contact",
                ].map((x) => (
                  <span key={x} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-ink" />
                    <span className="t-body text-ink-2">{x}</span>
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
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
            <div className="rounded-md border border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand)_7%,var(--mix))] p-6">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 size-6 shrink-0 text-brand-text" />
                <div>
                  <p className="t-title">You see progress, never documents</p>
                  <p className="t-muted mt-1 text-[16px]">
                    Passports, bank statements and police certificates stay between
                    the traveller and Toplance.
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-md bg-surface p-4">
                {[
                  ["Chioma Eze", "CANADA", 100, "Submitted", "info"],
                  ["Kwame Mensah", "UAE", 100, "Under review", "warning"],
                  ["Ifeoma Nwankwo", "UNITED KINGDOM", 85, "Collecting", "brand"],
                  ["Emeka Obi", "CANADA", 0, "Draft", "outline"],
                ].map(([name, dest, pct, label, variant], i) => (
                  <div
                    key={name as string}
                    className={cn("flex items-center gap-3", i > 0 && "mt-4")}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,var(--mix))] text-[13px] font-semibold text-brand-text">
                      {(name as string)
                        .split(" ")
                        .map((p) => p[0])
                        .join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-title block truncate">{name as string}</span>
                      <span className="special">{dest as string}</span>
                    </span>
                    <span className="hidden w-24 shrink-0 sm:block">
                      <Progress value={pct as number} />
                    </span>
                    <Badge
                      variant={variant as "info" | "warning" | "brand" | "outline"}
                    >
                      {label as string}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- corridors ---------- */}
      <section id="where" className="scroll-mt-[var(--bar-h)] bg-surface-2 py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <SectionHead
            kicker="Where we work"
            title="Corridors, not countries"
            lead="A corridor is one nationality travelling to one destination for one purpose. That is the unit a checklist is actually built from — a Nigerian passport holder going to the UK for work needs a different file to a Ghanaian going for study."
          />
          {[
            { label: "Live now", items: CORRIDORS_LIVE, soon: false },
            { label: "In build", items: CORRIDORS_SOON, soon: true },
            { label: "Travelling from", items: ORIGINS, soon: false },
          ].map((group) => (
            <div key={group.label}>
              <p className="special-caps mt-8">{group.label}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {group.items.map((c) => (
                  <span
                    key={c.name}
                    className={cn(
                      "inline-flex min-h-[var(--row-h)] items-center gap-3 rounded-[var(--radius-pill)] border bg-surface px-4 text-base font-medium",
                      group.soon
                        ? "border-dashed border-border-strong text-ink-3"
                        : "border-border text-ink"
                    )}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    {c.name}
                    {group.soon && <Clock className="size-5" />}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="t-muted measure mt-6">
            Missing a corridor? Tell us and it goes into the build queue with the
            demand attached to it.
          </p>
          <Button asChild variant="tertiary" className="mt-4">
            <Link href="/sign-up">
              <Flag /> Request a corridor
            </Link>
          </Button>
        </div>
      </section>

      {/* ---------- proof ---------- */}
      <section className="py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <SectionHead
            kicker="Proof"
            title="What people say, once you have people saying it"
          />
          <div className="mt-6">
            <Placeholder>
              The quotes, portraits and logos are layout placeholders. Send real,
              attributed sentences and square headshots and we will drop them
              straight in — inventing a testimonial is not something we will do for
              you.
            </Placeholder>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {QUOTES.map((q) => (
              <figure
                key={q.quote}
                className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6"
              >
                <blockquote className="text-lg leading-relaxed text-ink">
                  “{q.quote}”
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                  <span
                    title="Portrait — square, 160px minimum"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-border-strong bg-surface-2 text-ink-3"
                  >
                    <Globe className="size-5" />
                  </span>
                  <span>
                    <span className="t-title block">{q.name}</span>
                    <span className="special">{q.role.toUpperCase()}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="special-caps mt-10">Organisations we work with</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="grid h-14 min-w-[150px] flex-1 place-items-center rounded-sm border border-dashed border-border-strong bg-surface text-ink-3"
              >
                Logo {i}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- pricing ---------- */}
      <section id="pricing" className="scroll-mt-[var(--bar-h)] bg-surface-2 py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <SectionHead
            kicker="Pricing"
            title="Free until you ask us to do the work"
            lead="The conversation and the checklist cost nothing, and you can walk away with the list. You pay when you want a handler, a human review and a submission."
          />
          <div className="mt-6">
            <Placeholder>
              Plan names and structure are ours to propose; the amounts are yours to
              set. The figures below are deliberately fake.
            </Placeholder>
          </div>
          <div className="grid items-stretch gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "flex flex-col rounded-md border bg-surface p-6",
                  p.featured
                    ? "border-brand shadow-[var(--shadow)]"
                    : "border-border"
                )}
              >
                <div className="mb-3 flex min-h-[30px] items-center">
                  {p.featured && <Badge variant="brand">Most chosen</Badge>}
                </div>
                <h3 className="t-h3">{p.name}</h3>
                <p className="t-h2 mt-3">{p.price}</p>
                <p className="t-muted">{p.sub}</p>
                <ul className="mb-6 mt-5 flex flex-col gap-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-ink-2">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                      <span>{f}</span>
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
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <SectionHead kicker="Questions" title="The ones people actually ask" />
          <Accordion type="single" collapsible className="mt-8 border-t border-border">
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ---------- closing ---------- */}
      <section className="py-12">
        <div className="mx-auto max-w-[1140px] px-6">
          <div className="overflow-hidden rounded-lg bg-[image:var(--brand-grad)]">
            <div className="scrim on-scrim p-6 md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <h2 className="t-h2">
                    Find out what you need. It costs nothing to ask.
                  </h2>
                  <p className="t-body-lg soft mt-3 max-w-[52ch]">
                    A few short questions and you will have your checklist. No card,
                    no commitment, and the list is yours whether you submit through
                    us or not.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="!bg-white !text-[color:var(--brand)] hover:!brightness-95"
                  >
                    <Link href="/sign-up">
                      See your checklist — free <ArrowRight />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    className="!border-white/45 !bg-white/15 !text-white hover:!bg-white/25"
                  >
                    <Link href="/employer/sign-in">Employer sign-in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
