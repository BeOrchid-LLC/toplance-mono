import { after } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateSpeech } from "ai";

import { SPEECH_MODEL, SPEECH_VOICE, aiEnabled } from "@/lib/ai/models";
import { requireApplicationAccess, toActionError } from "@/lib/auth/guards";
import { canReadItinerary } from "@/lib/auth/policy";
import { getItinerary } from "@/lib/data/applications";
import { itinerarySpeechChunks } from "@/lib/domain/itinerary";
import { track } from "@/lib/analytics/track";

/**
 * The arrival plan, read aloud.
 *
 * The brief asks for the itinerary to reach the traveller "via email,
 * in-app notification, and voice summary". The first two are delivery
 * channels for a document that already exists, and so is this: it speaks
 * the stored itinerary and nothing else. No model is asked to summarise,
 * rephrase or add — `itinerarySpeechChunks` is pure, and the only thing
 * that reaches OpenAI is text the traveller can already read on their
 * profile page. A voice that could invent a fact about someone's
 * relocation is not a feature this product wants.
 *
 * A route handler rather than a server action because the response is
 * binary: an action returns serialisable values, and base64 in a JSON
 * envelope would be a third larger for no gain.
 *
 * The guard is the same one the pages use. The proxy only redirects, so
 * this is what stands between a caller and someone else's plan.
 */

/**
 * A ceiling on how many speech calls one press may make.
 *
 * Chunking exists so a long plan is spoken in full rather than
 * truncated, but each chunk is a paid call, and nothing else here bounds
 * the loop. A schema-valid itinerary is nowhere near this — ten sections
 * of prose is two or three chunks — so reaching it means the payload is
 * not what this route thinks it is, and stopping is better than
 * spending. It is logged, because it should never happen.
 */
const MAX_CHUNKS = 8;

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
      canReadItinerary
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
      { error: "Reading aloud is unavailable here. The plan is on the page." },
      { status: 503 }
    );
  }

  const itinerary = await getItinerary(applicationId);
  const chunks = itinerary ? itinerarySpeechChunks(itinerary.payload) : [];

  if (chunks.length === 0) {
    return Response.json(
      { error: "There is no arrival plan to read yet." },
      { status: 404 }
    );
  }

  if (chunks.length > MAX_CHUNKS) {
    console.error(
      `[speech] itinerary for ${applicationId} split into ${chunks.length} chunks; refusing`
    );
    return Response.json(
      { error: "That plan is too long to read aloud." },
      { status: 413 }
    );
  }

  let audio: Uint8Array;
  try {
    // Sequential rather than concurrent: this is one person pressing one
    // button, and a burst of parallel calls buys a second of latency at
    // the cost of a rate limit that would fail the whole request.
    const parts: Uint8Array[] = [];
    for (const text of chunks) {
      const result = await generateSpeech({
        model: openai.speech(SPEECH_MODEL),
        voice: SPEECH_VOICE,
        outputFormat: "mp3",
        text,
      });
      parts.push(result.audio.uint8Array);
    }
    // MP3 frames are self-describing, so concatenated parts play as one
    // file in every browser this product supports.
    audio = concat(parts);
  } catch (error) {
    console.error(`[speech] could not read the plan for ${applicationId}`, error);
    return Response.json(
      { error: "The plan could not be read aloud just now. Try again shortly." },
      { status: 502 }
    );
  }

  after(() =>
    track("toplance.itinerary_spoken", { applicationId, chunks: chunks.length }, userId)
  );

  return new Response(audio as unknown as BodyInit, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audio.byteLength),
      // Someone's relocation plan, spoken. It belongs to one person and
      // to one session; no shared cache should ever hold it.
      "Cache-Control": "private, no-store",
    },
  });
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.byteLength;
  }
  return out;
}
