import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, intakeAnswers } from "@/lib/db/schema";
import { isNationalityServed } from "@/lib/domain/corridors";
import { RESUBMITTABLE } from "@/lib/domain/status";
import { normaliseAnswer } from "@/lib/domain/normalise-answer";
import { adoptRuleSet } from "@/lib/data/checklist";
import {
  DESTINATION_ISO,
  NATIONALITY_ISO,
  PURPOSE_ISO,
} from "@/lib/domain/corridors";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import { resolveRuleSet } from "@/lib/visa";
import { track } from "@/lib/analytics/track";

/**
 * Every write the intake makes to the application row, narrowed to a
 * case that is still the traveller's to change.
 *
 * `buildChecklist` used to end with an unconditional
 * `status: "collecting_documents"`, so re-answering a single question
 * un-submitted a case that was already with the desk. Silently, too: a
 * status written here inserts no `status_events` row, so it appeared in
 * no timeline and told nobody. What the traveller saw was their Submit
 * button back on the next render, on a checklist that was still fully
 * verified.
 *
 * The incomplete branch did the same damage by the other column.
 * Re-answering anything but the last question deletes the answers after
 * it, which makes `intake_complete` false — and `/app/documents`
 * redirects on that, so a submitted case bounced its own owner to the
 * intake agent.
 *
 * A `where` clause rather than a read-then-write, so it cannot lose a
 * race with `submitApplicationTx`: that transaction takes `for update`
 * on this row, and a check made before it committed would be acted on
 * after.
 *
 * `RESUBMITTABLE` is the list submission itself gates on, so the two
 * cannot drift — a status a traveller may submit from is exactly a
 * status their answers may still rebuild.
 */
function stillTheTravellers(applicationId: string) {
  return and(
    eq(applications.id, applicationId),
    inArray(applications.status, [...RESUBMITTABLE])
  );
}

export type IntakeAnswerResult =
  | {
      complete: boolean;
      /**
       * They hold a passport nothing covers yet. The answer is still
       * recorded — it is what the interest log counts — but the screen
       * has to say so now rather than let them answer ten more
       * questions and meet an empty checklist.
       */
      unservedNationality?: true;
    }
  | { error: string };

/**
 * Record one intake answer. Re-answering an earlier question clears
 * everything after it and rebuilds the checklist — a mis-tapped chip
 * must never flow silently into the requirements.
 *
 * Lives outside the server action because there are now two ways an
 * answer arrives: the scripted chips, and the `record_answer` tool the
 * model calls from the chat route. Both must truncate and rebuild the
 * same way, and neither path can be tested through an action — one
 * carries a Clerk session and `revalidatePath`, the other a streaming
 * response. **It decides nothing about access.** Every caller guards
 * first, the same shape as `submitApplicationTx`.
 */
export async function recordIntakeAnswer(
  applicationId: string,
  questionKey: string,
  value: string,
  userId: string
): Promise<IntakeAnswerResult> {
  const index = INTAKE_QUESTIONS.findIndex((q) => q.key === questionKey);
  if (index === -1) return { error: "Unknown question." };

  const laterKeys = INTAKE_QUESTIONS.slice(index + 1).map((q) => q.key);

  // Stored beside the answer, not instead of it: the reviewer reads what
  // the traveller wrote, the rules match the code. Null when the answer
  // matches no chip, which leaves every rule naming this topic
  // unevaluable — and an unevaluable rule hedges rather than hides.
  const code = normaliseAnswer(questionKey, value);

  await db
    .insert(intakeAnswers)
    .values({ applicationId, questionKey, value, code })
    .onConflictDoUpdate({
      target: [intakeAnswers.applicationId, intakeAnswers.questionKey],
      // Re-answering is a new answer, so it carries a new timestamp.
      set: { value, code, answeredAt: new Date() },
    });

  // The gate, at selection rather than at the end. Answering
  // "Ghana" today resolves to no corridor, and without this the
  // traveller finds that out eleven questions later, as an empty
  // checklist with no explanation.
  const unservedNationality =
    questionKey === "nationality" && !isNationalityServed(code);

  if (unservedNationality) {
    await track(
      "toplance.nationality_unserved",
      { applicationId, nationality: code ?? value },
      userId
    );
  }

  if (laterKeys.length) {
    await db
      .delete(intakeAnswers)
      .where(
        and(
          eq(intakeAnswers.applicationId, applicationId),
          inArray(intakeAnswers.questionKey, laterKeys)
        )
      );
  }

  const answers = await db
    .select({
      questionKey: intakeAnswers.questionKey,
      value: intakeAnswers.value,
      code: intakeAnswers.code,
    })
    .from(intakeAnswers)
    .where(eq(intakeAnswers.applicationId, applicationId));

  // Completeness is about having answered, so it reads `value`: an
  // answer nothing could normalise is still an answer, and a traveller
  // must not be held at 10 of 11 questions for phrasing one in their own
  // words. The checklist gets the codes, which is a different question.
  const map = Object.fromEntries(answers.map((a) => [a.questionKey, a.value]));
  const codes = Object.fromEntries(answers.map((a) => [a.questionKey, a.code]));
  const complete = INTAKE_QUESTIONS.every((q) => map[q.key]);

  if (complete) {
    await buildChecklist(applicationId, codes, map, userId);
    await track("toplance.intake_completed", { applicationId }, userId);
  } else {
    await db
      .update(applications)
      .set({ intakeComplete: false })
      .where(stillTheTravellers(applicationId));
  }

  return unservedNationality ? { complete, unservedNationality } : { complete };
}

/**
 * Resolve the corridor from the answers, then materialise its rule set
 * as this application's checklist. Documents already uploaded keep their
 * state, so switching destination does not throw away a verified
 * passport.
 *
 * Private on purpose: its only caller is `recordIntakeAnswer`, whose own
 * callers have already established that whoever asked may write to this
 * application.
 */
async function buildChecklist(
  applicationId: string,
  /** Canonical codes, for everything the engine acts on. */
  codes: Record<string, string | null>,
  /** The traveller's own words, for what a person will read. */
  answers: Record<string, string>,
  userId: string
) {
  // Keyed on canonical values, so these read the code rather than the
  // answer — which also fixes a quieter bug: a Hausa speaker tapping
  // "Najeriya" produced no lookup at all, and fell into the unserved
  // branch below as though we did not cover their passport.
  const nationality = codes.nationality ? NATIONALITY_ISO[codes.nationality] : undefined;
  const destination = codes.destination ? DESTINATION_ISO[codes.destination] : undefined;
  const purpose = codes.purpose ? PURPOSE_ISO[codes.purpose] : undefined;

  if (!nationality || !destination || !purpose) {
    // An answer we have no code for is still demand. Record what they
    // typed, not a blank.
    //
    // Nationality used to fall back to `ng` here. Every question accepts
    // free text, so someone answering "Senegal" was handed the Nigerian
    // rule set under a heading that reads "as the mission publishes it".
    // A checklist built from the wrong passport is worse than no
    // checklist: a missing mark is honest, an invented one is not.
    await track(
      "toplance.corridor_requested",
      {
        nationality: answers.nationality,
        destination: answers.destination,
        purpose: answers.purpose,
      },
      userId
    );

    // `corridorId` cleared for the same reason as the unserved branch
    // below: a correction can land here after a corridor had already
    // resolved, and the laminate header reads whatever this row points
    // at.
    await db
      .update(applications)
      .set({
        intakeComplete: true,
        corridorId: null,
        status: "collecting_documents",
      })
      .where(stillTheTravellers(applicationId));
    return;
  }

  const ruleSet = await resolveRuleSet({
    nationalityIso: nationality,
    destinationIso: destination,
    purpose,
  });

  if (!ruleSet) {
    // A corridor we do not serve yet. The intake still completes; the
    // requirements screen tells the traveller their request has been
    // counted towards it, and this is what counts it.
    await track(
      "toplance.corridor_requested",
      {
        nationalityIso: nationality,
        destinationIso: destination,
        purpose,
      },
      userId
    );

    await db
      .update(applications)
      .set({
        intakeComplete: true,
        corridorId: null,
        status: "collecting_documents",
      })
      .where(stillTheTravellers(applicationId));
    return;
  }

  await track(
    "toplance.corridor_resolved",
    {
      corridorId: ruleSet.corridorId,
      provider: ruleSet.provider,
      destinationIso: destination,
      purpose,
    },
    userId
  );

  // The answers decide which conditional documents are this traveller's,
  // so the checklist is materialised against them rather than in full.
  // Codes, not answers: the rules match canonical values.
  await adoptRuleSet(applicationId, ruleSet, codes);

  await db
    .update(applications)
    .set({ intakeComplete: true, status: "collecting_documents" })
    .where(stillTheTravellers(applicationId));
}
