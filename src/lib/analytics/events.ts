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
  "toplance.application_submitted",
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];
