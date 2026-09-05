import { z } from "zod";

import { INTAKE_QUESTIONS } from "@/lib/domain/intake";

/**
 * The one tool both intake agents get, described once.
 *
 * The text agent runs on the Vercel AI SDK and the voice agent on
 * `@openai/agents-realtime`. The two name the field differently —
 * `inputSchema` against `parameters` — and otherwise agree: a zod object,
 * converted to JSON schema for the model. Sharing the schema is what
 * keeps a spoken answer and a typed answer the same kind of thing, one
 * of the intake's keys capped at the same length, rather than two contracts
 * that drift apart the first time a question is renamed.
 *
 * The enum is built from `INTAKE_QUESTIONS` rather than a hand-copied
 * list, so a topic added there is callable immediately and one removed
 * is rejected immediately.
 */
export const intakeAnswerSchema = z.object({
  questionKey: z.enum(INTAKE_QUESTIONS.map((q) => q.key)),
  value: z.string().min(1).max(500),
});

/** Why the model would call it, in the words both agents are given. */
export const INTAKE_TOOL_DESCRIPTION =
  "Save one intake answer. Call this the moment the traveler " +
  "answers a topic, before replying to them.";
