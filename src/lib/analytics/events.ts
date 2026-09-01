/**
 * Every analytics event Toplance emits.
 *
 * The shape is `app.object_action`, all lowercase — a BeOrchid platform
 * convention locked on 2026-08-21 and shared across every product.
 * Nothing in this repo emitted analytics before this list, so it sets
 * the precedent for the platform; `events.test.ts` enforces the format
 * rather than leaving it to whoever adds the next one to remember.
 *
 * A union rather than a free `string`, so a typo is a compile error
 * instead of an event nobody notices is missing from the dashboard.
 */
export const EVENT_NAMES = [
  "toplance.intake_completed",

  /**
   * One turn of the typed intake conversation — `mode` is "text", the
   * only value emitted. Counted per request rather than per message, so
   * it measures conversations, not tokens. The voice intake does not
   * emit a turn per spoken exchange (the realtime session runs between
   * the browser and OpenAI, so the server never sees them); it is
   * counted once per session by `voice_session_started` below.
   */
  "toplance.intake_message_sent",

  /** A traveller opened the voice intake and a realtime session began. */
  "toplance.voice_session_started",

  /** A corridor resolved to a rule set the traveller can act on. */
  "toplance.corridor_resolved",

  /**
   * A corridor nobody serves yet. The requirements screen tells the
   * traveller "your request has been counted towards it — corridors are
   * prioritised by real demand, not guesswork". Until this event, that
   * sentence was not true. This is what counts it.
   */
  "toplance.corridor_requested",

  /**
   * The staleness sweep (`npm run visa:drift`) found a live corridor
   * whose "a visa is required" assumption the vendor no longer repeats.
   * A flag for human re-verification, never an automatic edit: the
   * vendor's verdict is a short-stay default, so it may prompt a check
   * against the mission but cannot overrule one. Written by the runner
   * with raw SQL — the one emitter that cannot go through `track()`.
   */
  "toplance.corridor_drift_detected",

  "toplance.document_uploaded",
  "toplance.document_removed",

  /** A reviewer's verdict — the transitions out of `checking`. */
  "toplance.document_verified",
  "toplance.document_flagged",

  /**
   * The AI pre-check's verdict on one upload, `pass` or `flag` — not a
   * reviewer's, which stays `document_verified` / `document_flagged`.
   */
  "toplance.document_prechecked",

  "toplance.application_submitted",

  /** A past trip on the traveller's own travel history. */
  "toplance.travel_record_added",
  "toplance.travel_record_removed",

  /** A reviewer's note on a case — the traveller reads these too. */
  "toplance.case_note_added",

  /** An arrival plan generated (or refreshed) on approval. */
  "toplance.itinerary_generated",

  /** A staff decision that moves a case through review — see `changeStatusTx`. */
  "toplance.application_status_changed",

  /** A reviewer takes a case as theirs. */
  "toplance.case_claimed",

  /** A reviewer hands a case back to the queue. */
  "toplance.case_released",

  /**
   * A message sent on a case thread, from either side — `senderRole` is
   * "traveler" or "staff". Emitted by `sendMessage` in
   * `@/app/(app)/actions.ts`, the one action both ends post to.
   */
  "toplance.message_sent",

  /** A new employer names their organisation and becomes its owner. */
  "toplance.organisation_created",

  /**
   * The invitation lifecycle: sent from `inviteTraveller`, resent from
   * `resendInvitation`, revoked from `revokeInvitation` (all three in
   * `@/app/employer/actions.ts`), accepted from `acceptInvitation` in
   * `@/app/invite/actions.ts`.
   *
   * A resend is counted apart from a send rather than folded into it.
   * The two mean different things: one is an employer adding a person,
   * the other is an employer telling us the first email did not arrive,
   * and conflating them would hide exactly the signal worth watching now
   * that the email is the only way a traveller can get in.
   */
  "toplance.invitation_sent",
  "toplance.invitation_resent",
  "toplance.invitation_revoked",
  "toplance.invitation_accepted",

  /** A traveller put a photo on their own profile, or replaced it. */
  "toplance.avatar_uploaded",

  /** An approved traveller opened the post-arrival companion. */
  "toplance.companion_viewed",

  /** The companion's cached local tips were generated (or refreshed) by AI. */
  "toplance.companion_generated",
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];
