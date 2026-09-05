/**
 * The post-arrival companion's curated content — pure, no I/O, so it can
 * be read and tested on its own the same way `corridorGap` is.
 *
 * Both functions below are deliberately conservative: an arrival
 * checklist names the real, generic steps a newcomer to that destination
 * takes (no invented address, phone number or fee — the same rule
 * `buildItineraryPrompt` writes into its own prompt), and renewal
 * guidance never states an expiry date, because visa validity is not a
 * fact this product stores. Both degrade to an honest generic answer
 * rather than a guess.
 */

import { hasExpired } from "@/lib/domain/expiry";

export type ChecklistItem = { title: string; detail: string };

/**
 * What a newcomer to each live destination needs to do in the first few
 * weeks, keyed on the corridor's `destinationIso`. Curated with the
 * client, not derived from anything a traveller typed.
 */
const CHECKLIST_BY_DESTINATION: Record<string, ChecklistItem[]> = {
  gb: [
    {
      title: "Collect your eVisa or BRP",
      detail:
        "Your immigration status is digital (eVisa) or on a Biometric Residence Permit collected from the place you named at application. Check gov.uk for how to prove your status if asked.",
    },
    {
      title: "Register with a GP",
      detail:
        "Register with a local doctor's surgery near where you are staying, even before you feel unwell — it is how you access NHS care.",
    },
    {
      title: "Apply for a National Insurance number",
      detail:
        "You need one to work and pay tax in the UK. If your visa does not already carry one, apply through gov.uk once you have an address.",
    },
    {
      title: "Open a UK bank account",
      detail:
        "Most banks ask for your passport, proof of address and your immigration status document — requirements vary by bank.",
    },
  ],
  ae: [
    {
      title: "Complete your Emirates ID application",
      detail:
        "The Emirates ID is required for almost everything — banking, phone contracts, housing. Your sponsor's PRO usually starts this for you; confirm it has been submitted.",
    },
    {
      title: "Take the medical fitness test",
      detail:
        "A medical test (blood test and chest X-ray) is required as part of residence visa processing, at an approved centre.",
    },
    {
      title: "Register your tenancy attestation",
      detail:
        "If you are renting, your tenancy contract needs Ejari registration — your landlord or agent can guide you through it.",
    },
    {
      title: "Open a UAE bank account",
      detail:
        "Banks typically ask for your passport, Emirates ID (or application receipt) and a salary or employment letter.",
    },
  ],
  ca: [
    {
      title: "Apply for your Social Insurance Number (SIN)",
      detail:
        "A SIN is required to work in Canada and to access most government services — apply through Service Canada once you land.",
    },
    {
      title: "Apply for your provincial health card",
      detail:
        "Provincial healthcare coverage and its waiting period vary by province — apply as soon as you have a home address.",
    },
    {
      title: "Open a Canadian bank account",
      detail:
        "Bring your passport and your study or work permit — many banks offer no-fee accounts for newcomers.",
    },
  ],
  de: [
    {
      title: "Complete your Anmeldung (address registration)",
      detail:
        "Registering your address with the local Bürgeramt within the required window is a legal requirement in Germany and unlocks almost everything else on this list.",
    },
    {
      title: "Collect your residence permit",
      detail:
        "Your residence permit (Aufenthaltstitel) is issued by your local Ausländerbehörde, usually after your Anmeldung is done.",
    },
    {
      title: "Open a German bank account",
      detail:
        "You will typically need your passport and your Anmeldung confirmation (Meldebescheinigung) to open an account.",
    },
    {
      title: "Confirm your health insurance",
      detail:
        "Health insurance is mandatory in Germany — confirm your cover is active (public or private) before your first appointment.",
    },
  ],
};

/**
 * A destination this product does not yet curate a checklist for. Still
 * factual and generic — never a guess at what a specific country
 * requires — so the page has something honest to show rather than an
 * empty state for every corridor outside the four above.
 */
const GENERIC_CHECKLIST: ChecklistItem[] = [
  {
    title: "Confirm your immigration status document",
    detail:
      "Keep whatever proof of status your destination issued — physical or digital — somewhere you can produce it quickly.",
  },
  {
    title: "Register your address",
    detail:
      "Many countries require newcomers to register their residential address with a local authority soon after arrival — check your destination's own requirement.",
  },
  {
    title: "Open a local bank account",
    detail:
      "Bring your passport, proof of address and your immigration status document — requirements vary by bank and by country.",
  },
  {
    title: "Register for local healthcare",
    detail:
      "Find out how residents in your destination access medical care and register as soon as you are able to.",
  },
];

/**
 * One extra, purpose-shaped step on top of the destination's checklist —
 * generic on purpose, since neither the visa office nor the employer's
 * name is data this product holds.
 */
const PURPOSE_ADDENDUM: Partial<Record<string, ChecklistItem>> = {
  work: {
    title: "Tell your employer you have arrived",
    detail:
      "Confirm your start date and any onboarding paperwork your employer still needs from you.",
  },
  study: {
    title: "Enrol at your institution",
    detail:
      "Complete your institution's arrival check-in or enrolment confirmation — most require it before classes begin.",
  },
};

/**
 * The arrival checklist for one corridor: the curated list for the four
 * live destinations, plus a purpose-shaped addendum, or the generic
 * fallback for anything this product does not yet curate.
 */
export function arrivalChecklist(
  destinationIso: string,
  purpose: string
): ChecklistItem[] {
  const base = CHECKLIST_BY_DESTINATION[destinationIso.toLowerCase()] ?? GENERIC_CHECKLIST;
  const addendum = PURPOSE_ADDENDUM[purpose.toLowerCase()];
  return addendum ? [...base, addendum] : [...base];
}

/** Curated, per-destination phrasing for what to check and where — never a fabricated date. */
const RENEWAL_GUIDANCE_BY_DESTINATION: Record<string, string> = {
  gb: "Check the expiry shown on your eVisa (in your UKVI account) or printed on your BRP, and start any extension or renewal before that date — not after.",
  ae: "Check the expiry printed on your Emirates ID and residence visa. Renewal in the UAE is usually handled by your sponsor shortly before that date.",
  ca: "Check the expiry printed on your permit document itself. A Canadian extension is filed from inside the country before that date, through IRCC.",
  de: "Check the expiry printed on your residence permit (Aufenthaltstitel) card, and book an extension (Verlängerung) with your local Ausländerbehörde well before it.",
};

const GENERIC_RENEWAL_GUIDANCE =
  "Check the expiry date printed on your visa or residence document itself, and confirm the renewal process with your destination's immigration authority — we do not hold that date for you.";

function formatApprovalDate(decidedAt: Date): string {
  return decidedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * A `YYYY-MM-DD` expiry, as read off a document, rendered for prose.
 *
 * Pinned to UTC — unlike `formatApprovalDate` above, which formats a
 * real instant. A date-only value has no time and no zone, so parsing it
 * as local midnight and formatting it locally renders the previous day
 * for every reader west of Greenwich. Telling someone their visa expires
 * a day earlier than it does is the kind of small wrongness this card
 * exists to avoid.
 */
function formatExpiryDate(expiresOn: string): string {
  return new Date(`${expiresOn}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * What to check about renewal, and where — built only from facts this
 * product actually has: the visa's name, its approval date (when
 * recorded), the expiry the traveller themselves supplied (when they
 * have), and curated, per-destination phrasing about where the real
 * expiry lives.
 *
 * This still NEVER calculates an expiry. `expiresOn` is what a traveller
 * read off their own document and typed in; it is repeated back to them
 * attributed ("you told us"), never asserted as a record of ours, since
 * nothing here verified it. With no date supplied the output is
 * byte-identical to what it was before this parameter existed — the
 * same enhancement-not-dependency shape the itinerary's country
 * grounding uses.
 */
export function renewalGuidance(
  corridor: { visaName: string; destinationIso: string },
  decidedAt: Date | null,
  expiresOn?: string | null,
  now: Date = new Date()
): string {
  const approved = decidedAt
    ? `Your ${corridor.visaName} was approved on ${formatApprovalDate(decidedAt)}. `
    : `Your ${corridor.visaName} has been approved. `;

  const supplied = expiresOn
    ? hasExpired(expiresOn, now)
      ? `You told us it expired on ${formatExpiryDate(expiresOn)}, and that date has passed. `
      : `You told us it expires on ${formatExpiryDate(expiresOn)}. `
    : "";

  const guidance =
    RENEWAL_GUIDANCE_BY_DESTINATION[corridor.destinationIso.toLowerCase()] ??
    GENERIC_RENEWAL_GUIDANCE;

  return approved + supplied + guidance;
}
