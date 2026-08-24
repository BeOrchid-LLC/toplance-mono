import {
  liveDestinationsFor,
  liveNationalities,
  livePurposesFor,
} from "@/lib/domain/corridors";

export type CorridorGapCopy = {
  heading: string;
  lead: string;
  action: string;
};

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
}: {
  nationality: string;
  destination: string;
  purpose: string;
}): CorridorGapCopy {
  const purposes = livePurposesFor(nationality, destination);
  const destinations = liveDestinationsFor(nationality);

  const where = destination || "that destination";
  const why = (purpose || "that purpose").toLowerCase();

  // Ordered by how cheaply the traveller can recover: a purpose is one
  // answer away, a destination is a different answer away, and a
  // passport we do not serve is not recoverable on this screen at all.
  if (purposes.length) {
    return {
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
      heading: `We do not cover ${where} for ${why} yet`,
      lead:
        `Your answers are saved. With your passport we are live for ` +
        `${or(destinations)}. ${COUNTED}`,
      action: "Change my destination",
    };
  }

  return {
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
