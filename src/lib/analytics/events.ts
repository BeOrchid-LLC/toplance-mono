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
   * A traveller holds a passport the product does not cover yet.
   *
   * Emitted at the moment they answer, not eleven questions later when
   * the checklist comes back empty. It is the interest log the coverage
   * decision reads from: curation to full parity is deferred, so which
   * passport to curate next should come from who actually asked rather
   * than from a guess.
   */
  "toplance.nationality_unserved",

  "toplance.document_uploaded",
  /**
   * A business's application reached the point it is charged for — every
   * required document uploaded. Emitted once per application by
   * `markBillableIfComplete`, never on a re-upload after a flag.
   */
  "toplance.application_became_billable",
  "toplance.document_removed",

  /**
   * A whole checklist downloaded as one ZIP, from either side of the
   * desk — the traveller keeping a copy of what they sent, or the agency
   * taking the pack to an embassy. `viewer` says which, because those
   * are different behaviours that happen to share an endpoint.
   */
  "toplance.documents_exported",

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

  /** A reviewer takes an unheld case as their own. */
  "toplance.case_claimed",

  /**
   * A case is handed to a named colleague — someone other than the
   * person doing the handing, which is what separates it from
   * `case_claimed`. Distinct because it is the director's move, and one
   * event for both made "who is picking up their own work" and "who is
   * being given work" the same number.
   */
  "toplance.case_assigned",

  /** A case is put back into the agency's pool. */
  "toplance.case_released",

  /**
   * A message sent on a case thread, from either side — `senderRole` is
   * "traveler" or "staff". Emitted by `sendMessage` in
   * `@/app/[locale]/(app)/actions.ts`, the one action both ends post to.
   */
  "toplance.message_sent",

  /** A new employer names their organisation and becomes its owner. */
  "toplance.organisation_created",

  /**
   * The invitation lifecycle: sent from `inviteTraveller`, resent from
   * `resendInvitation`, revoked from `revokeInvitation` (all three in
   * `@/app/[locale]/agency/actions.ts`), accepted from `acceptInvitation` in
   * `@/app/[locale]/invite/actions.ts`.
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
   * The paywall. `checkout_started` is emitted before the provider is
   * asked for anything, so the gap between it and a purchase is the
   * abandonment rate — which is the only way to see somebody who reached
   * a payment screen and did not pay, since nothing else records them.
   *
   * Two purchases rather than one event with a `kind`, because they are
   * two different questions: how many agencies are paying to be here,
   * and how many travellers are paying for a case. Folding them together
   * would need every consumer to split them again.
   */
  "toplance.checkout_started",
  "toplance.subscription_purchased",
  "toplance.application_purchased",

  /**
   * An agency gave up the rest of a month it had paid for.
   *
   * Counted apart from a plan simply running out, which emits nothing
   * because nothing happens — a period ends on its own. This is a
   * decision somebody made mid-month, and the gap between it and
   * `subscription_purchased` is the only churn signal the product has
   * while nothing renews.
   */
  "toplance.subscription_cancelled",

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

  /**
   * The platform console's tenant surface. `provisioned` is one event
   * for one transaction — an agency and its first invitation — so the
   * funnel from `demo_requested` to a working tenant is two rows, not
   * five.
   */
  "toplance.tenant_provisioned",
  "toplance.tenant_suspended",
  "toplance.tenant_restored",
  "toplance.tenant_seats_changed",
  "toplance.tenant_member_role_changed",
  "toplance.demo_request_status_changed",
  "toplance.demo_request_assigned",

  /** A traveller put a photo on their own profile, or replaced it. */
  "toplance.avatar_uploaded",

  /** An approved traveller opened the post-arrival companion. */
  "toplance.companion_viewed",

  /** The companion's cached local tips were generated (or refreshed) by AI. */
  "toplance.companion_generated",

  /**
   * An agency asked for a demo from the landing page. The only event
   * emitted with no `userId` — the visitor has no account, which is the
   * entire point of the form.
   *
   * `locale` rides along in the props because it is the one thing the
   * landing page learns about a stranger for free, and it answers a
   * question the funnel cannot otherwise: whether the nine translations
   * bring anyone in, or whether every lead reads English anyway.
   */
  "toplance.demo_requested",

  /**
   * A director opened the business dashboard.
   *
   * Worth counting because the dashboard is the one screen built for an
   * audience of about three people: if it turns out nobody opens it, the
   * answer is to change what it shows rather than to add more to it.
   */
  "toplance.dashboard_viewed",
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];
