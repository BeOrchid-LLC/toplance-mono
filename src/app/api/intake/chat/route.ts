import { after } from "next/server";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { INTAKE_MODEL, aiEnabled } from "@/lib/ai/models";
import { buildIntakeSystemPrompt } from "@/lib/ai/intake-prompt";
import { requireApplicationAccess, toActionError } from "@/lib/auth/guards";
import { canWriteIntakeAnswers } from "@/lib/auth/policy";
import { getIntakeAnswers, getProfile } from "@/lib/data/applications";
import { recordIntakeAnswer } from "@/lib/data/intake";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/locales";
import { track } from "@/lib/analytics/track";

/**
 * The intake conversation, model-driven.
 *
 * A route handler rather than a server action because the response is a
 * stream: the traveller sees the sentence being written, which on a slow
 * connection is the difference between a product that is thinking and a
 * product that has hung.
 *
 * The guard is the same one the actions use — the proxy only redirects,
 * it does not authorize, so this is what stands between a caller and
 * someone else's intake.
 *
 * Everything the model is told is read from the database on this
 * request, never from the conversation the browser sent up: chips, the
 * scripted fallback and the model all write to the same rows, and a
 * prompt built from stale client state would have the agent asking for
 * an answer it already has.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    applicationId?: string;
    messages?: UIMessage[];
  };

  const applicationId = body.applicationId ?? "";

  let userId: string;
  try {
    const { actor } = await requireApplicationAccess(
      applicationId,
      canWriteIntakeAnswers
    );
    userId = actor.userId;
  } catch (error) {
    const message = toActionError(error);
    if (message) return Response.json({ error: message }, { status: 403 });
    throw error;
  }

  // Checked after the guard, so an unauthorized caller learns nothing
  // about how this environment is configured.
  if (!aiEnabled()) {
    return Response.json(
      { error: "The conversation is unavailable. Answer the questions below instead." },
      { status: 503 }
    );
  }

  const profile = await getProfile();
  const answers = await getIntakeAnswers(applicationId);

  const locale =
    profile && isLocale(profile.locale) ? profile.locale : DEFAULT_LOCALE;
  const firstName = profile?.fullName.split(" ")[0] ?? "";

  const result = streamText({
    model: openai(INTAKE_MODEL),
    system: buildIntakeSystemPrompt({ answers, locale, firstName }),
    messages: await convertToModelMessages(body.messages ?? []),
    tools: {
      record_answer: tool({
        description:
          "Save one intake answer. Call this the moment the traveller " +
          "answers a topic, before replying to them.",
        inputSchema: z.object({
          questionKey: z.enum(INTAKE_QUESTIONS.map((q) => q.key)),
          value: z.string().min(1).max(500),
        }),
        execute: async ({ questionKey, value }) => {
          const recorded = await recordIntakeAnswer(
            applicationId,
            questionKey,
            value,
            userId
          );
          if ("error" in recorded) return recorded;

          // Read back rather than derived from the tool input: recording
          // an earlier answer clears everything after it, so the next
          // question is whatever the truncated row set now lacks.
          const current = await getIntakeAnswers(applicationId);
          const next = INTAKE_QUESTIONS.find((q) => !current[q.key]);

          return {
            recorded: true,
            complete: recorded.complete,
            nextQuestionKey: next?.key ?? null,
          };
        },
      }),
    },
    // One tool call, then the reply that acknowledges it. Three is the
    // ceiling, not the plan: without it a model that mis-records an
    // answer can loop on the same tool for as long as the request lives.
    stopWhen: stepCountIs(3),
  });

  // A conversation turn, not a token count — and never worth delaying
  // the first word of the reply for.
  after(() =>
    track("toplance.intake_message_sent", { applicationId, mode: "text" }, userId)
  );

  return result.toUIMessageStreamResponse();
}
