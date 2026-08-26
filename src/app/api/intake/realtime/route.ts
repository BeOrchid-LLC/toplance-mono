import { after } from "next/server";

import { REALTIME_MODEL, aiEnabled } from "@/lib/ai/models";
import { requireApplicationAccess, toActionError } from "@/lib/auth/guards";
import { canWriteIntakeAnswers } from "@/lib/auth/policy";
import { track } from "@/lib/analytics/track";

/**
 * Mints the short-lived credential a browser needs to open a realtime
 * voice session.
 *
 * The realtime API is spoken to directly from the traveller's browser
 * over WebRTC — that is what makes it a conversation rather than a
 * round trip through us — so the browser needs a credential. This route
 * exists so that credential is never our API key: OpenAI issues an
 * ephemeral client secret (`ek_…`, ten minutes by default, one session)
 * and that is the only thing that crosses to the client. The SDK
 * enforces the same rule from the other side — its WebRTC transport
 * refuses any browser key that is not an `ek_`.
 *
 * The guard is the chat route's guard, for the chat route's reason: the
 * proxy redirects, it does not authorize, so this is what stands between
 * a caller and a voice session over someone else's intake.
 *
 * Nothing about the conversation is decided here. The instructions and
 * the `record_answer` tool are attached by the client when it connects,
 * and every answer that session records still goes through the guarded
 * `answerQuestion` action — the browser holds a microphone, not a write
 * path.
 */

export async function POST(request: Request) {
  let body: { applicationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "That request did not arrive in one piece. Try again." },
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
      { error: "Voice is unavailable. Type your answers instead." },
      { status: 503 }
    );
  }

  // The model is named at mint time so the secret and the session the
  // client opens with it cannot disagree. No expiry is set: OpenAI's
  // default is ten minutes, an intake is shorter than that, and there is
  // deliberately no refresh — a session that outlives its secret is a
  // problem worth having later, not a mechanism to build now.
  let minted: Response;
  try {
    minted = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: { type: "realtime", model: REALTIME_MODEL },
      }),
    });
  } catch (error) {
    console.error("[intake] could not reach the realtime API", error);
    return Response.json(
      { error: "Voice could not start. Type your answers instead." },
      { status: 502 }
    );
  }

  if (!minted.ok) {
    // Quota, a revoked key, a model the account cannot reach — all of it
    // is the operator's problem and none of it is the traveller's, so
    // the real body stays in the log.
    console.error(
      `[intake] the realtime API refused a client secret (${minted.status})`,
      await minted.text().catch(() => "")
    );
    return Response.json(
      { error: "Voice could not start. Type your answers instead." },
      { status: 502 }
    );
  }

  const secret = (await minted.json().catch(() => null)) as {
    value?: unknown;
  } | null;

  if (typeof secret?.value !== "string") {
    console.error("[intake] the realtime API returned no client secret", secret);
    return Response.json(
      { error: "Voice could not start. Type your answers instead." },
      { status: 502 }
    );
  }

  // A session opened, not a minute of audio — and never worth delaying
  // the connection for.
  after(() =>
    track("toplance.voice_session_started", { applicationId }, userId)
  );

  // The secret and nothing else. The key it was minted with does not
  // leave this process.
  return Response.json({ value: secret.value });
}
