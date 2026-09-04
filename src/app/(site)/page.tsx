import type { Metadata } from "next";
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
import { Shell } from "@/components/shared/shell";
import { Head, Section } from "@/components/site/section";
import { LIVE_CORRIDORS } from "@/lib/domain/corridors";
import { cn } from "@/lib/utils";

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
 * The traveller copy was not thrown away — it is `/travellers`, unchanged.
 *
 * Statically rendered and cached at the edge — the sticky nav, the
 * corridor state, the FAQ accordion and the theme switch are the only
 * client-side JavaScript on it.
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Visa and relocation processing for travel agencies",
  description:
    "Run every client's visa application through Toplance. You get a caseboard, a completion score and a status per client — while Toplance's team handles the document review.",
};

/* Figures, quotes, portraits and prices are the client's to supply. Rather
   than dressing invented numbers up as real ones, the page shows the shape
   of the claim and leaves the value visibly empty — a blank reads as
   honest, a fabricated statistic is a liability the moment it is public.

   This holds harder on a B2B page than it did on the B2C one: the reader
   here is signing a contract, and a number they can quote back at you in a
   procurement review is not a number to guess at. */
const REGISTER = [
  // Corridors, not destinations. `LIVE_CORRIDORS` is asserted against
  // `seed.sql`, so the note is true as well as the figure.
  { label: "Corridors live", value: String(LIVE_CORRIDORS.length), note: "Counted from the corridor table" },
  { label: "Cases run", value: null, note: "Since launch" },
  { label: "Approved on first submission", value: null, note: "Across live corridors" },
  { label: "Median time from invitation to a complete file", value: null, note: "Per client" },
];

/* The ledger is the same device the traveller page uses, re-aimed. Its
   left column is the mobility lead's week, not the applicant's. */
const LEDGER = [
  {
    alone: "A case that stalls for a week before anyone notices",
    with: "A caseboard that shows who is blocked, on the day they become blocked",
  },
  {
    alone: "Chasing four clients on WhatsApp for documents you shouldn't have to collect yourself",
    with: "Toplance collects and checks the documents; you see completion, not the file",
  },
  {
    alone: "A different process for every corridor, remembered rather than written down",
    with: "One system across every corridor, the same steps every time",
  },
  {
    alone: "A refusal three months in, for a document nobody flagged",
    with: "Every file checked against that corridor's current rules before submission",
  },
];

/**
 * The rule above each step is the commitment boundary, drawn rather than
 * described — two open steps, then two contracted ones. It is the same
 * device the traveller page uses for free/paid, carrying the distinction
 * that actually matters to someone with a budget to defend.
 */
const STEPS = [
  {
    contracted: false,
    title: "Scope the corridors you work",
    body: "Which passports, which destinations, which purposes. We show you what each corridor requires and which are live today — before you commit to anything.",
  },
  {
    contracted: false,
    title: "Get a quote against that scope",
    body: "One price per case, whichever corridor it is spent on. No per-document fees and no separate agent to negotiate with in each destination.",
  },
  {
    contracted: true,
    title: "Invite your client by email",
    body: "Each invitation opens a case. Your client runs the intake conversation in their own language and uploads their own documents — you do not have to brief them or collect anything by hand.",
  },
  {
    contracted: true,
    title: "Watch the caseboard, not your inbox",
    body: "Completion, status and destination per client, moving as their case moves. Follow up on anyone who has stalled without having to call them.",
  },
];

const FEATURES = [
  {
    title: "A caseboard, not a spreadsheet you maintain",
    body: "Every client you are running, with a completion score, a status and a destination. It updates because their case moved, not because someone remembered to update it.",
  },
  {
    title: "Document review, done for you",
    body: "You see whether a client is on track and whether they are stuck. Your own team does not have to open, download or check a passport, a bank statement or a police certificate line by line — Toplance's reviewers do that, and it is built into how the product works, not a task you assign.",
  },
  {
    title: "One system across every corridor",
    body: "The same process, the same status vocabulary and the same invoice whether you are running a case to Toronto or to Dubai — instead of learning a different agent's process per destination.",
  },
  {
    title: "A rules engine, not memory",
    body: "Requirements are versioned rule sets per corridor. When a mission changes what it wants, every case on that corridor reflects the change, with the date it took effect.",
  },
  {
    title: "A named contact at both levels",
    body: "An account contact for you, and a named Toplance case handler who owns each client's file. No ticket numbers and no starting over with someone new.",
  },
  {
    title: "An audit trail",
    body: "Who was invited, when, by whom; when a document was reviewed and by which reviewer; when a case changed status. Recorded as it happens rather than reconstructed later.",
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
 * Split into what the client gets and what the agency gets, because a
 * buyer reading a flat eleven-item list cannot tell which half is the
 * service and which half is the console.
 */
const SEAT_INCLUDES = {
  traveller: [
    "The full intake conversation, in their own language",
    "Their exact document checklist for that corridor",
    "Automatic checks on every upload",
    "Human review of every document before submission",
    "A named Toplance case handler",
    "Arrival plan and alerts after approval",
  ],
  organisation: [
    "A case you can open, revoke and reassign",
    "Caseboard view with completion, status and destination",
    "Progress visibility, with document review handled for you",
    "Consolidated invoicing",
    "A named account contact",
    "Priority replies within one working day",
  ],
};

/* Naming the exclusions is not a concession — it is the difference
   between a page a procurement reviewer trusts and one they discount.
   Every line here is a cost the organisation will meet regardless of
   supplier, so saying so early costs nothing and pre-empts the
   question that otherwise arrives at contract stage. */
const SEAT_EXCLUDES = [
  "Government and mission fees, which are paid to the destination, not to us",
  "Biometrics and appointment fees where a mission charges them",
  "Sworn or certified translation where a mission requires one",
  "Flights, insurance and accommodation",
];

/* The commercial questions a buyer has to answer internally before they
   can sign anything. The labels are ours; the values are the client's,
   and the ones left blank are blank on purpose — a term invented here
   is a term someone will quote back in a negotiation. */
const TERMS = [
  { label: "Unit", value: "One case, one client" },
  { label: "Billing", value: "Annually, in advance, by invoice" },
  { label: "Price per case", value: null },
  { label: "Minimum commitment", value: null },
  { label: "Case reassignment", value: null },
  { label: "Data residency", value: null },
];

const FAQ = [
  {
    q: "What exactly can we see about our clients' cases?",
    a: "Completion percentage, status, destination and whether a case is blocked — enough to know where every client stands. Your team doesn't open, download or preview the documents themselves; Toplance's reviewers do that. That boundary is built into the data model rather than being a permission an administrator can grant, so it holds for anyone you add to your account later, too.",
  },
  {
    q: "Does Toplance decide whether the visa is granted?",
    a: "No, and we are careful not to imply it. Missions and embassies make the decision. What Toplance controls is that the file is complete, correct and submitted the way that corridor expects — which is the part applications usually fail on. When a document shows as verified it means it has been accepted for review, not that the application has been approved.",
  },
  {
    q: "How are we invoiced?",
    a: "One consolidated invoice for your cases, billed annually in advance, rather than a charge per client or per document. The amount per case and any minimum commitment are set in your contract — the pricing section above marks both as figures you supply rather than guessing at them here.",
  },
  {
    q: "What happens if a client drops out before they travel?",
    a: "A pending invitation can be revoked from your console, which releases the case before any work has begun on it. Once a client has started a case, whether that case can be reassigned is a contract term rather than a product setting — it is one of the terms listed above.",
  },
  {
    q: "Where is our clients' data stored?",
    a: "Documents are encrypted at rest and in transit. Residency of the stored files is a decision your agency can set at contract level, so if you are bound to keep personal data in a particular jurisdiction that is a conversation to have before signing rather than a limitation you discover afterwards.",
  },
  {
    q: "Our clients do not all read English.",
    a: "The intake conversation, the checklist and the status updates run in English, Hausa, Yoruba and Igbo, typed or spoken. Your client can switch language at any point, including mid-conversation, and their answers carry over. Your caseboard stays in English.",
  },
  {
    q: "Can we start with one corridor?",
    a: "Yes, and most agencies do. Cases are not tied to a destination, so a contract scoped around one corridor still covers the second one you open next quarter — provided it is live. If it is not, ask for it and it enters the build queue with your demand attached.",
  },
];

export default function HomePage() {
  return (
    <CorridorProvider>
      {/* ---------- hero ---------- */}
      {/* Server-rendered, unlike the traveller hero it replaces. That one
          is a client component because it translates itself into four
          languages; this copy addresses HR, mobility and procurement
          contacts and stays in English, so the only client boundary left
          in the hero is `CorridorBar` itself. */}
      <header className="relative isolate overflow-hidden">
        <div aria-hidden className="security-paper pointer-events-none absolute inset-0 -z-10" />
        <Shell className="pb-20 pt-12 md:pb-28 md:pt-16">
          <p className="tag rise text-brand-text">
            Visa and relocation processing for travel agencies
          </p>

          <h1 className="d-hero rise mt-5 max-w-[20ch]" style={{ animationDelay: "70ms" }}>
            Take the case. Track the file. Stop chasing it by hand.
          </h1>

          {/* The control sits directly after the H1, before the
              explanatory paragraph, for the same reason it does on the
              traveller page: you can interrogate the product on the first
              screen without reading a word of marketing. What changed is
              who is asking — a buyer checks whether the corridors their
              clients actually need are live before they read
              anything else. */}
          <div className="rise mt-10" style={{ animationDelay: "150ms" }}>
            <CorridorBar ctaLabel="See what this corridor needs" />
          </div>

          <div
            className="rise mt-12 grid gap-8 border-t border-border pt-8 lg:grid-cols-[1.35fr_1fr]"
            style={{ animationDelay: "230ms" }}
          >
            <p className="t-body-lg text-ink-2">
              Toplance runs the visa application for every client you take on —
              the intake conversation in their own language, the exact document
              checklist for their corridor, human review before submission, and
              a named case handler who owns the file. You get a caseboard, a
              completion score and a status per client. Your team does not comb through a passport or a bank statement to
              check it — Toplance&apos;s reviewers do.
            </p>
            <ul className="flex flex-col justify-center gap-3">
              {[
                "Open a case and invite your client by email",
                "One caseboard across every corridor you run",
                "Consolidated invoicing and a named account contact",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden />
                  <span className="text-[15px] text-ink-2">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </Shell>
      </header>

      {/* ---------- the problem ---------- */}
      <Section label="The problem">
        <Head
          title="Clients don't leave over a refusal. They leave over silence."
          lead="A case goes wrong in the gap between telling a client what to send you and finding out, weeks later, what they did not send."
        />

        <div className="mt-11 border-t border-border-strong">
          <div className="hidden grid-cols-2 gap-x-12 py-3 sm:grid">
            <span className="tag">Managing it yourself</span>
            <span className="tag text-brand-text">With Toplance</span>
          </div>
          {LEDGER.map((row) => (
            <div
              key={row.with}
              className="grid gap-x-12 gap-y-5 border-t border-border py-7 sm:grid-cols-2"
            >
              <div>
                <span className="tag mb-2 block sm:hidden">Managing it yourself</span>
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
      <Section id="how" label="How it works" datum="Steps 01–02 need no commitment">
        <Head
          title="Four steps, and the first two cost you nothing"
          lead="Scoping the corridors you work and pricing them is free and yours to take to a client. Everything after that is what each case pays for."
        />

        <ol className="mt-12 grid gap-x-10 gap-y-11 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span
                aria-hidden
                className={cn(
                  "block h-[3px] rounded-[var(--radius-pill)]",
                  step.contracted ? "bg-border-strong" : "bg-brand"
                )}
              />
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="tag">Step {String(i + 1).padStart(2, "0")}</span>
                <span
                  className={cn(
                    "tag",
                    step.contracted ? "text-ink-3" : "text-brand-text"
                  )}
                >
                  {step.contracted ? "Contracted" : "Open"}
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
          lead="Clients submit the wrong documents, and then nobody tells anyone what is happening. Every item here closes one of those two gaps — for your client, and for the person running their file."
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

      {/* ---------- the console ---------- */}
      {/* The single dark beat, and the only place `--brand-2` is allowed to
          light anything. `dark` redefines every token for this subtree, so
          nothing below is hand-picked for a dark ground and the section
          cannot drift out of sync with the palette.

          `bg-surface`, not `bg-bg`: in dark mode `bg-bg` resolves to the
          page background and the beat disappears entirely.

          This section used to carry the whole B2B pitch on a page that was
          otherwise addressed to travellers. Now that the page is the pitch,
          it does the narrower job it was always better at: showing the
          console rather than arguing for it. */}
      <Section
        id="orgs"
        label="The console"
        glow
        className="dark overflow-hidden bg-surface text-ink"
      >
        <div className="grid items-start gap-12 xl:grid-cols-[1fr_0.85fr]">
          <div>
            <h2 className="d-lg max-w-[20ch]">
              One screen that answers &ldquo;is anyone stuck?&rdquo;
            </h2>
            <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
              You need to know who is on track and who is not — and your staff
              shouldn&apos;t have to open a passport or a bank statement to
              find out. The caseboard gives you a completion score and a
              status per client, and deliberately nothing else to manage.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                "Open a case and invite your client by email",
                "One caseboard with completion, status and destination per client",
                "Follow up on anyone who has stalled without calling them",
                "Revoke a pending invitation and release the case",
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
                <Link href="/employer/sign-up">
                  <Briefcase /> Talk to us about your caseload
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
          lead="A corridor is one nationality travelling to one destination for one purpose. That is the unit a checklist is built from — so the question is not whether we cover Canada, it is whether we cover the corridors your clients actually need. A Nigerian passport holder going to the UK for work needs a different file to a Ghanaian going to study."
        />
        <div className="mt-11">
          <CorridorBoard />
        </div>
      </Section>

      {/* ---------- proof ---------- */}
      <Section label="Proof">
        <Head
          title="What we can prove, and what we cannot yet"
          lead="Toplance is pre-launch. Rather than print numbers nobody has earned, the figures below stay blank until the client supplies them — and on a page read by people who will quote them in a procurement review, a blank is the only honest option."
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
            "An agency ops lead on caseboard visibility",
            "A finance contact on consolidated invoicing",
            "A second agency, so this does not read as one account",
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

        <p className="tag mt-11">Agencies we work with</p>
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
      <Section id="pricing" label="Pricing" datum="Billed by case, annually">
        <Head
          title="One case for every client you run"
          lead="Every case carries the whole product — the conversation, the checklist, a named case handler and human review before submission — whichever corridor it is spent on. The amounts below are placeholders for you to set."
        />

        <div className="mt-11 overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col p-7 lg:p-9">
            <span
              aria-hidden
              className="block h-[3px] rounded-[var(--radius-pill)] bg-brand-accent"
            />
            <span className="tag mt-4 block">Agencies</span>
            <p className="d-lg mt-4">By case</p>
            <p className="t-muted text-[15px]">billed annually</p>

            {/* Split rather than one flat list: a buyer needs to see which
                half of this is the service their traveller receives and
                which half is the console they log into themselves. */}
            <div className="mb-8 mt-8 grid gap-8 lg:grid-cols-2 lg:gap-x-10">
              <div>
                <p className="tag mb-4">What your client gets</p>
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
                <p className="tag mb-4">What your agency gets</p>
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
                {TERMS.map((t) => (
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
        <Head title="The ones buyers actually ask" />
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

        <p className="t-muted mt-9 text-[15px]">
          Booking your own visa rather than running it for a client?{" "}
          <Link
            href="/travellers"
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
          corridor you chose still in it — nobody who read the whole way
          down should have to travel back up to act. */}
      <section className="border-t border-border bg-[color-mix(in_srgb,var(--brand)_5%,var(--bg))] py-20 md:py-24">
        <Shell>
          <h2 className="d-lg max-w-[22ch]">
            Tell us who you&apos;re running cases for, and where.
          </h2>
          <p className="t-body-lg mt-5 max-w-[54ch] text-ink-2">
            Scoping your corridors and pricing them costs nothing and commits you
            to nothing. You leave with a quote you can compare against what
            you&apos;re doing today, whether or not you come back.
          </p>
          <div className="mt-10">
            <CorridorBar ctaLabel="Talk to us about your caseload" />
          </div>
        </Shell>
      </section>
    </CorridorProvider>
  );
}
