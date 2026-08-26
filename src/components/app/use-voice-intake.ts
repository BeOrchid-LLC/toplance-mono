"use client";

import * as React from "react";
import { RealtimeAgent, RealtimeSession, tool } from "@openai/agents-realtime";

import { answerQuestion } from "@/app/(app)/actions";
import { buildVoiceIntakeInstructions } from "@/lib/ai/intake-prompt";
import {
  INTAKE_TOOL_DESCRIPTION,
  intakeAnswerSchema,
} from "@/lib/ai/intake-tool";
import { REALTIME_MODEL } from "@/lib/ai/models";
import { INTAKE_QUESTIONS, truncateAnswersAt } from "@/lib/domain/intake";
import type { Locale } from "@/lib/i18n/locales";

export type VoiceStatus = "idle" | "connecting" | "live";

/**
 * Two-way speech for the intake agent.
 *
 * The audio never passes through us. The browser holds a WebRTC
 * connection straight to OpenAI, opened with an ephemeral secret from
 * `/api/intake/realtime`, and the SDK owns the microphone, the speaker
 * and the turn-taking. What this hook owns is the seam back into the
 * product: the instructions the agent speaks from, and the one tool it
 * can call.
 *
 * That tool calls `answerQuestion` — the same guarded server action the
 * chips call — from the browser, on the traveller's own Clerk session.
 * The voice agent therefore has no privilege of its own: it can write
 * exactly what the traveller could write by tapping, to exactly the
 * application the guard clears, and a spoken answer truncates the later
 * ones the way a typed one does, because it is the same write.
 *
 * Deliberately dumb about UI. It reports a status, hands back each
 * answer as it lands, and says when the intake finished; what any of
 * that looks like is the component's business.
 *
 * Cuts, all deliberate: no VAD tuning (the server's own turn detection
 * decides when someone has stopped speaking), no secret refresh (a
 * secret lasts ten minutes and an intake does not), no transcript kept
 * anywhere — the answers rail filling in is the record.
 */
export function useVoiceIntake({
  applicationId,
  answers,
  firstName,
  locale,
  onAnswerRecorded,
  onComplete,
  onError,
}: {
  applicationId: string;
  /** The record as the screen currently shows it, for the opening prompt. */
  answers: Record<string, string>;
  firstName: string;
  locale: Locale;
  /** One answer landed in the database. */
  onAnswerRecorded: (key: string, value: string) => void;
  /** The tenth answer landed — there is a checklist now. */
  onComplete: () => void;
  /** Voice is not going to work this time; say so and stay in text. */
  onError: (message: string) => void;
}) {
  const [status, setStatus] = React.useState<VoiceStatus>("idle");

  const sessionRef = React.useRef<RealtimeSession | null>(null);
  const startingRef = React.useRef(false);
  // Bumped by every `start` and every `stop`, so an attempt that is
  // still opening when the traveller changes their mind can tell that it
  // has been superseded and close itself instead of going live.
  const attemptRef = React.useRef(0);

  // The record as the *session* has changed it. A tool call can run
  // before React has re-rendered with the answer it just wrote, so the
  // next topic is worked out from here rather than from the prop.
  const answersRef = React.useRef(answers);

  // A tool executes long after the render that built it, so everything
  // it reaches for goes through a ref — otherwise a session started at
  // question one is still calling into question one's closure at
  // question nine.
  const handlers = React.useRef({ onAnswerRecorded, onComplete, onError });

  React.useEffect(() => {
    answersRef.current = answers;
    handlers.current = { onAnswerRecorded, onComplete, onError };
  }, [answers, onAnswerRecorded, onComplete, onError]);

  const stop = React.useCallback(() => {
    attemptRef.current += 1;
    const session = sessionRef.current;
    sessionRef.current = null;
    setStatus("idle");
    // `close()` also stops the microphone track the transport opened, so
    // the browser's recording indicator goes out when the button says it
    // has. Guarded because a half-open session can throw on the way
    // down, and there is nothing useful to do about it.
    try {
      session?.close();
    } catch (error) {
      console.error("[voice] the session did not close cleanly", error);
    }
  }, []);

  const start = React.useCallback(async () => {
    if (sessionRef.current || startingRef.current) return;
    startingRef.current = true;
    const attempt = ++attemptRef.current;
    setStatus("connecting");

    try {
      const response = await fetch("/api/intake/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const payload = (await response.json().catch(() => null)) as {
        value?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok || typeof payload?.value !== "string") {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Voice could not start. Type your answers instead."
        );
      }

      const recordAnswer = tool({
        name: "record_answer",
        description: INTAKE_TOOL_DESCRIPTION,
        parameters: intakeAnswerSchema,
        execute: async ({ questionKey, value }) => {
          const result = await answerQuestion(applicationId, questionKey, value);

          // Handed back to the model rather than thrown: it is mid-turn
          // with someone waiting, and "I could not save that" is
          // something it can say out loud.
          if ("error" in result) {
            return { recorded: false, error: result.error };
          }

          answersRef.current = {
            ...truncateAnswersAt(answersRef.current, questionKey),
            [questionKey]: value,
          };
          handlers.current.onAnswerRecorded(questionKey, value);

          // Read off the truncated record rather than off the key just
          // written: correcting an early answer clears everything after
          // it, so the next topic is whatever the shortened record lacks.
          const next = INTAKE_QUESTIONS.find((q) => !answersRef.current[q.key]);

          if (result.complete) handlers.current.onComplete();

          return {
            recorded: true,
            complete: result.complete,
            nextQuestionKey: next?.key ?? null,
          };
        },
      });

      const agent = new RealtimeAgent({
        name: "Toplance intake agent",
        instructions: buildVoiceIntakeInstructions({
          answers: answersRef.current,
          locale,
          firstName,
        }),
        tools: [recordAnswer],
      });

      // No transport named: in a browser the SDK picks WebRTC, which is
      // what the ephemeral secret is for. The model is repeated here so
      // the session and the secret it was minted against agree.
      const session = new RealtimeSession(agent, { model: REALTIME_MODEL });

      // A model or server error mid-conversation is not necessarily
      // fatal — the session recovers from most of them — so it is logged
      // and left alone. Losing the connection is what ends the call.
      session.on("error", ({ error }) => {
        console.error("[voice] the realtime session reported an error", error);
      });

      session.transport.on("connection_change", (state) => {
        if (state !== "disconnected") return;
        if (sessionRef.current !== session) return;
        stop();
        handlers.current.onError(
          "The voice connection dropped. Carry on by typing."
        );
      });

      if (attemptRef.current !== attempt) {
        session.close();
        return;
      }
      // Held before connecting, so a `stop()` during the handshake still
      // has something to close and the microphone is never left open.
      sessionRef.current = session;

      // Everything under the surface: the microphone permission prompt,
      // the peer connection, playback of what the agent says. A refused
      // microphone rejects here like any other connection failure.
      await session.connect({ apiKey: payload.value });

      if (attemptRef.current !== attempt) return;
      setStatus("live");
    } catch (error) {
      // Cancelled rather than failed: `stop()` rejects the handshake it
      // interrupts, and telling someone the microphone failed a moment
      // after they switched it off is noise, not news.
      if (attemptRef.current !== attempt) return;

      console.error("[voice] the session could not start", error);
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");

      stop();
      handlers.current.onError(
        denied
          ? "Toplance needs the microphone to talk. Allow it in your browser, or keep typing."
          : error instanceof Error && error.message
            ? error.message
            : "Voice could not start. Type your answers instead."
      );
    } finally {
      startingRef.current = false;
    }
  }, [applicationId, firstName, locale, stop]);

  // A session left open would hold the microphone and keep billing after
  // the screen is gone, so leaving the page ends the call.
  React.useEffect(() => stop, [stop]);

  return { status, start, stop };
}
