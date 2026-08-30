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
   * The invitation lifecycle: sent from `inviteTraveller`, revoked from
   * `revokeInvitation` (both in `@/app/employer/actions.ts`), accepted
   * from `acceptInvitation` in `@/app/invite/actions.ts`.
   */
  "toplance.invitation_sent",
  "toplance.invitation_revoked",
  "toplance.invitation_accepted",

  /** An approved traveller opened the post-arrival companion. */
  "toplance.companion_viewed",

  /** The companion's cached local tips were generated (or refreshed) by AI. */
  "toplance.companion_generated",
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];
