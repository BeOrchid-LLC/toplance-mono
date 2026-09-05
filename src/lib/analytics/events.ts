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
  /**
   * A business's application reached the point it is charged for — every
   * required document uploaded. Emitted once per application by
   * `markBillableIfComplete`, never on a re-upload after a flag.
   */
  "toplance.application_became_billable",
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

  /**
   * Every required document on a checklist was collected — the brief's
   * "score reaches 100%". Recorded once per application, at the same
   * moment the review desk is told.
   */
  "toplance.checklist_completed",

  /** An arrival plan generated (or refreshed) on approval. */
  "toplance.itinerary_generated",

  /**
   * A traveller asked to hear their arrival plan read aloud. Recorded on
   * the request, not on playback — the browser never tells us whether
   * anyone listened.
   */
  "toplance.itinerary_spoken",

  /**
   * The traveller supplied (or corrected) the expiry date printed on
   * their own visa. Never a value this product derived.
   */
  "toplance.visa_expiry_set",

  /** One of the three pre-expiry warnings actually went out. */
  "toplance.expiry_reminder_sent",

  /** A government advisory for a destination moved, and we told the traveller. */
  "toplance.advisory_change_notified",

  /** Advisories were re-read from their sources for one application. */
  "toplance.advisories_refreshed",

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

  /**
   * The corridor review lifecycle. `corridor_drafted` is emitted by the
   * drafting script, the other two by the ops console.
   *
   * Worth counting separately from the audit trail beside them:
   * `audit_log` answers "who approved this corridor" for accountability,
   * these answer "how long does a draft wait" — the question the plan's
   * critical path actually runs through, since 15 corridors cannot go
   * live faster than one person approves them.
   */
  "toplance.corridor_drafted",
  "toplance.corridor_approved",
  "toplance.corridor_rejected",

  /**
   * An approver wrote (or cleared) the rule that decides which
   * travellers a conditional document applies to.
   *
   * Counted because it measures the 01/09 review's actual ask — "tell
   * them what applies" — as a number that can only go one way: every
   * one of these is a document that stopped being a maybe on somebody's
   * checklist. The audit trail beside it answers who; this answers how
   * much of the hedge is left.
   */
  "toplance.requirement_condition_set",

  /**
   * A source page moved under a live corridor. Reserved for the
   * re-check job; nothing emits it yet.
   */
  "toplance.corridor_drift_detected",

  /** A traveller put a photo on their own profile, or replaced it. */
  "toplance.avatar_uploaded",

  /** An approved traveller opened the post-arrival companion. */
  "toplance.companion_viewed",

  /** The companion's cached local tips were generated (or refreshed) by AI. */
  "toplance.companion_generated",
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];
