import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { applications, intakeAnswers } from "@/lib/db/schema";
import { adoptRuleSet } from "@/lib/data/checklist";
import {
  DESTINATION_ISO,
  NATIONALITY_ISO,
  PURPOSE_ISO,
} from "@/lib/domain/corridors";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import { resolveRuleSet } from "@/lib/visa";
import { track } from "@/lib/analytics/track";

export type IntakeAnswerResult = { complete: boolean } | { error: string };

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

  await db
    .insert(intakeAnswers)
    .values({ applicationId, questionKey, value })
    .onConflictDoUpdate({
      target: [intakeAnswers.applicationId, intakeAnswers.questionKey],
      // Re-answering is a new answer, so it carries a new timestamp.
      set: { value, answeredAt: new Date() },
    });

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
    })
    .from(intakeAnswers)
    .where(eq(intakeAnswers.applicationId, applicationId));

  const map = Object.fromEntries(answers.map((a) => [a.questionKey, a.value]));
  const complete = INTAKE_QUESTIONS.every((q) => map[q.key]);

  if (complete) {
    await buildChecklist(applicationId, map, userId);
    await track("toplance.intake_completed", { applicationId }, userId);
  } else {
    await db
      .update(applications)
      .set({ intakeComplete: false })
      .where(eq(applications.id, applicationId));
  }

  return { complete };
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
  answers: Record<string, string>,
  userId: string
) {
  const nationality = NATIONALITY_ISO[answers.nationality];
  const destination = DESTINATION_ISO[answers.destination];
  const purpose = PURPOSE_ISO[answers.purpose];

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
      .where(eq(applications.id, applicationId));
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
      .where(eq(applications.id, applicationId));
    return;
  }

  await track(
    "toplance.corridor_resolved",
    {
      corridorId: ruleSet.corridorId,
      provider: "curated",
      destinationIso: destination,
      purpose,
    },
    userId
  );

  await adoptRuleSet(applicationId, ruleSet);

  await db
    .update(applications)
    .set({ intakeComplete: true, status: "collecting_documents" })
    .where(eq(applications.id, applicationId));
}
