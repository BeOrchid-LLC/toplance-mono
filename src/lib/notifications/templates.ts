/**
 * Every email `notify()` can send, as pure functions — no I/O, nothing
 * async. `notify()` decides who and when; these decide only what it says.
 *
 * Each template supplies a heading, a paragraph or two, and one call to
 * action, then hands them to `renderEmail` in `./layout`. The layout owns
 * every decision about markup: templates contain no HTML at all, which is
 * what keeps the seven of them looking like one product and means a
 * change to the shell is a change to one file.
 *
 * The values passed in are raw. `renderEmail` escapes them at the
 * boundary — a staff message, a flag reason, a sender's name and an
 * organisation's name all originate in a form somewhere, and escaping in
 * one place is the only version of that rule nobody can forget to follow.
 * Subject lines are a header rather than HTML, so they stay unescaped.
 */

import { renderEmail } from "@/lib/notifications/layout";

export type EmailContent = { subject: string; html: string; text: string };

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** → staff: a case reached 100% and was submitted. */
export function submissionEmail({
  caseRef,
  url,
}: {
  caseRef: string;
  url: string;
}): EmailContent {
  return {
    subject: `${caseRef} is ready for review`,
    ...renderEmail({
      heading: `${caseRef} is ready for review`,
      paragraphs: ["A traveller finished their checklist and submitted their file."],
      cta: { href: url, label: "Open the case" },
    }),
  };
}

/** → traveller. `message` is staff-authored free text. */
export function statusChangedEmail({
  statusLabel,
  message,
  url,
}: {
  statusLabel: string;
  message: string;
  url: string;
}): EmailContent {
  return {
    subject: `Your application is now: ${statusLabel}`,
    ...renderEmail({
      heading: statusLabel,
      paragraphs: [message],
      cta: { href: url, label: "See your application" },
    }),
  };
}

/** → traveller. */
export function documentFlaggedEmail({
  documentName,
  reason,
  url,
}: {
  documentName: string;
  reason: string;
  url: string;
}): EmailContent {
  return {
    subject: `${documentName} needs another look`,
    ...renderEmail({
      heading: `${documentName} needs another look`,
      paragraphs: [reason],
      cta: { href: url, label: "Re-upload it" },
    }),
  };
}

/** → the other side of the thread. `preview` is truncated to ~140 characters. */
export function messageReceivedEmail({
  senderName,
  preview,
  url,
}: {
  senderName: string;
  preview: string;
  url: string;
}): EmailContent {
  return {
    subject: `New message from ${senderName}`,
    ...renderEmail({
      heading: `New message from ${senderName}`,
      paragraphs: [truncate(preview, 140)],
      cta: { href: url, label: "Read and reply" },
    }),
  };
}

/** → traveller. */
export function itineraryReadyEmail({ url }: { url: string }): EmailContent {
  return {
    subject: "Your arrival plan is ready",
    ...renderEmail({
      heading: "Your arrival plan is ready",
      paragraphs: ["We have put together an itinerary for your trip."],
      cta: { href: url, label: "Open it" },
    }),
  };
}

/**
 * To an invitee who has NO account. Deliberately not routed through
 * `notify()` — there is no `profiles` row to attach it to, which is also
 * why `invitation` is not a `notification_kind`.
 *
 * The only email in this file that reaches a cold inbox. Everyone else
 * has an account and knows what Toplance is; this recipient is deciding
 * whether an organisation they may not recognise, and a product they
 * have never heard of, are worth handing a visa application to. That is
 * why the layout prints the destination URL in full underneath the
 * button rather than hiding it behind link text.
 */
export function invitationEmail({
  orgName,
  inviteUrl,
  fullName,
}: {
  orgName: string;
  inviteUrl: string;
  fullName?: string;
}): EmailContent {
  const greeting = fullName ? `${fullName}, y` : "Y";
  return {
    subject: `${orgName} has invited you to Toplance`,
    ...renderEmail({
      heading: `${orgName} has invited you to Toplance`,
      paragraphs: [
        `${greeting}ou have been invited to start a visa application sponsored by ${orgName}.`,
      ],
      cta: { href: inviteUrl, label: "Open your invitation" },
    }),
  };
}

/** → traveller: weekly post-arrival digest. */
export function companionDigestEmail({
  url,
  highlights,
}: {
  url: string;
  highlights: string[];
}): EmailContent {
  return {
    subject: "Your weekly Toplance digest",
    ...renderEmail({
      heading: "Your weekly digest",
      list: highlights,
      cta: { href: url, label: "Open your companion" },
    }),
  };
}
