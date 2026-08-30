import { after } from "next/server";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  tool,
  type InferUITools,
  type UIDataTypes,
  type UIMessage,
} from "ai";

import { INTAKE_MODEL, aiEnabled } from "@/lib/ai/models";
import { buildIntakeSystemPrompt } from "@/lib/ai/intake-prompt";
import {
  INTAKE_TOOL_DESCRIPTION,
  intakeAnswerSchema,
} from "@/lib/ai/intake-tool";
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
 *
 * The transcript itself is the exception — it has to come from the
 * client, because that is where the conversation lives. It is therefore
 * treated as an untrusted payload: validated, capped, and rejected with
 * a 400 rather than forwarded on trust.
 */

/**
 * Ceilings on one request. The transport re-posts the whole conversation
 * every turn, so without these a signed-in traveller could hand us an
 * arbitrarily large body and we would pay a model to read it. Intake is
 * ten questions; forty messages is twenty turns, which is generous even
 * for someone who changes their mind repeatedly.
 */
const MAX_MESSAGES = 40;
const MAX_TEXT_CHARS = 4000;

/**
 * The model's one tool, bound to the caller the guard cleared.
 *
 * Built per request rather than once at module scope precisely because
 * of that binding: there is no way to call it for an application the
 * request was not authorized for, because it never learns another id.
 */
function intakeTools(applicationId: string, userId: string) {
  return {
    record_answer: tool({
      description: INTAKE_TOOL_DESCRIPTION,
      // Shared with the voice agent, which describes the same tool to a
      // different SDK — see `@/lib/ai/intake-tool`.
      inputSchema: intakeAnswerSchema,
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
  };
}

/** What a valid transcript for this route looks like, tool parts included. */
type IntakeUIMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<ReturnType<typeof intakeTools>>
>;

export async function POST(request: Request) {
  let body: {
    applicationId?: unknown;
    messages?: unknown;
    reopenedKey?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "That message did not arrive in one piece. Try sending it again." },
      { status: 400 }
    );
  }

  const applicationId =
    typeof body?.applicationId === "string" ? body.applicationId : "";

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

  const tools = intakeTools(applicationId, userId);

  // The transcript is client-held, so it is checked before it is spent
  // on. `convertToModelMessages` throws on a malformed part, and an
  // unhandled throw here is a 500 on what is really a bad request —
  // which is also how a caller would find the cheapest way to make the
  // route fall over.
  const validated = await safeValidateUIMessages<IntakeUIMessage>({
    messages: body?.messages ?? [],
    tools,
  });

  if (!validated.success) {
    console.error("[intake] rejected a malformed transcript", validated.error);
    return Response.json(
      { error: "That conversation could not be read. Reload the page to start again." },
      { status: 400 }
    );
  }

  const tooLong = validated.data.some((message) =>
    message.parts.some(
      (part) => part.type === "text" && part.text.length > MAX_TEXT_CHARS
    )
  );

  if (tooLong) {
    return Response.json(
      { error: "That message is too long. Say it in a few sentences instead." },
      { status: 400 }
    );
  }

  // Oldest messages first, so the cap drops the start of a long
  // conversation rather than the turn being answered. Tool calls and
  // their results share one message, so a cut at a message boundary
  // never orphans one.
  const messages = validated.data.slice(-MAX_MESSAGES);

  // Validation has already ruled out the shapes this rejects, so a
  // throw here means an incomplete tool call or some combination the
  // schema allows and the converter does not. Still the caller's
  // payload, so still a 400 rather than a 500.
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(messages, { tools });
  } catch (error) {
    console.error("[intake] could not convert a transcript", error);
    return Response.json(
      { error: "That conversation could not be read. Reload the page to start again." },
      { status: 400 }
    );
  }

  const profile = await getProfile();
  const answers = await getIntakeAnswers(applicationId);

  const locale =
    profile && isLocale(profile.locale) ? profile.locale : DEFAULT_LOCALE;
  const firstName = profile?.fullName.split(" ")[0] ?? "";

  // Client state, like the transcript: believed only as far as it names
  // a question the intake actually asks. Reopening writes nothing, so
  // the answers read above still hold the value being corrected — this
  // is the one line that tells the model which topic the correction is
  // for. The prompt builder drops any key it does not recognize.
  const reopenedKey =
    typeof body.reopenedKey === "string" &&
    INTAKE_QUESTIONS.some((q) => q.key === body.reopenedKey)
      ? body.reopenedKey
      : undefined;

  const result = streamText({
    model: openai(INTAKE_MODEL),
    system: buildIntakeSystemPrompt({ answers, locale, firstName, reopenedKey }),
    messages: modelMessages,
    tools,
    // One tool call, then the reply that acknowledges it. Three is the
    // ceiling, not the plan: without it a model that mis-records an
    // answer can loop on the same tool for as long as the request lives.
    stopWhen: stepCountIs(3),
    // The client only ever sees "the agent stopped responding", which is
    // the right thing to tell a traveller and useless to whoever has to
    // fix it. The provider's own error stays here.
    onError: ({ error }) => {
      console.error("[intake] the model call failed", error);
    },
  });

  // A conversation turn, not a token count — and never worth delaying
  // the first word of the reply for.
  after(() =>
    track("toplance.intake_message_sent", { applicationId, mode: "text" }, userId)
  );

  return result.toUIMessageStreamResponse({
    // The default masks every server error as "An error occurred." —
    // right for production, where the message may carry provider
    // details, and useless while developing, where the dev server's
    // terminal is not always in view. Unmask in development only.
    onError: (error) =>
      process.env.NODE_ENV === "development"
        ? String(error)
        : "An error occurred.",
  });
}
