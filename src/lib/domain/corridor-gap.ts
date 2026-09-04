import {
  liveDestinationsFor,
  liveNationalities,
  livePurposesFor,
} from "@/lib/domain/corridors";

export type CorridorGapCopy = {
  /**
   * Whether this screen is admitting a hole or delivering a result.
   *
   * `"answer"` is not a gap wearing friendlier words: there is nothing
   * to build, nothing to come back for, and no recovery to offer. The
   * page reads this to drop the warning mark and the "worth checking
   * back" line, both of which are false on a corridor that is finished.
   */
  kind: "gap" | "answer";
  heading: string;
  lead: string;
  action: string;
};

/**
 * Purposes a visa-free entry verdict actually covers.
 *
 * Entry-rules vendors measure the short stay a passport is admitted for
 * — VisaList reports Ghana at three months — and say nothing about the
 * permit a job or a degree needs. So the visa-free answer is given for
 * the visits that figure describes and withheld from the moves it does
 * not, which keeps the claim inside its evidence.
 */
const SHORT_STAY = new Set(["tourism", "business", "medical"]);

const or = (items: string[]) =>
  new Intl.ListFormat("en-GB", { type: "disjunction" }).format(items);

const COUNTED =
  "Your request has been counted towards it — corridors are prioritised " +
  "by real demand, not guesswork.";

/**
 * What to tell a traveller whose corridor we cannot build a checklist
 * for, and what to offer them next.
 *
 * Which of the three answers is the blocker decides both. The screen
 * used to name the destination whatever the cause, so someone on a
 * Ghanaian passport was told "we do not cover Canada yet" — untrue, we
 * cover Canada — and offered "Change my destination", which could not
 * have helped them, because no destination is live for that passport.
 * Naming the wrong end of a corridor sends someone round a loop with no
 * exit.
 *
 * Pure and separate from the page so the three branches can be asserted
 * directly: this is the copy that was wrong, so this is the copy that
 * needs a test.
 */
export function corridorGap({
  nationality,
  destination,
  purpose,
  entry = null,
}: {
  nationality: string;
  destination: string;
  purpose: string;
  /**
   * What the entry-rules layer knows, when it knows anything. Null is
   * the common case and the one every branch below was written for.
   *
   * Deliberately narrower than `EntryCheck`: this module needs the
   * decision, not the sentence, and taking the whole type would let a
   * copy change in `entry-check.ts` silently reroute this one.
   */
  entry?: { requiresVisa: boolean } | null;
}): CorridorGapCopy {
  const purposes = livePurposesFor(nationality, destination);
  const destinations = liveDestinationsFor(nationality);

  const where = destination || "that destination";
  const why = (purpose || "that purpose").toLowerCase();

  // First, because it is the only branch that is not about coverage.
  // The three below all answer "why is there no checklist"; this one
  // answers "there is nothing to check", which outranks them — a
  // traveller who needs no visa does not care which of our corridors
  // are built.
  if (entry?.requiresVisa === false && SHORT_STAY.has(why)) {
    return {
      kind: "answer",
      heading: `You do not need a visa for ${where}`,
      lead:
        `Your passport is admitted without one, so there is no ` +
        `application to file and no documents to gather. Check the ` +
        `entry rules below for how long you may stay.`,
      action: "Back to my trips",
    };
  }

  // Ordered by how cheaply the traveller can recover: a purpose is one
  // answer away, a destination is a different answer away, and a
  // passport we do not serve is not recoverable on this screen at all.
  if (purposes.length) {
    return {
      kind: "gap",
      heading: `We cover ${where}, but not for ${why} yet`,
      lead:
        `Your answers are saved. With your passport, ${where} is live for ` +
        `${or(purposes.map((p) => p.toLowerCase()))} — changing that one ` +
        `answer gets you a checklist today.`,
      action: "Change my purpose",
    };
  }

  if (destinations.length) {
    return {
      kind: "gap",
      heading: `We do not cover ${where} for ${why} yet`,
      lead:
        `Your answers are saved. With your passport we are live for ` +
        `${or(destinations)}. ${COUNTED}`,
      action: "Change my destination",
    };
  }

  return {
    kind: "gap",
    heading: nationality
      ? `We do not cover ${nationality} passports yet`
      : "We do not cover that corridor yet",
    lead:
      `Your answers are saved. Every corridor we have built so far starts ` +
      `from ${or(liveNationalities())}, so changing destination will not ` +
      `help yet. ${COUNTED}`,
    action: "Review my answers",
  };
}
