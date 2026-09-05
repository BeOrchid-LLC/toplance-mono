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

/**
 * → staff: a traveller's checklist reached 100% collected.
 *
 * Not the same email as `submissionEmail`, and deliberately so. That one
 * says a file is ready for review; this one says every document is in
 * and the traveller has not sent it. The two need different actions from
 * a reviewer — one opens a case, the other nudges a person — so they
 * must not read alike.
 */
export function checklistCompleteEmail({
  caseRef,
  url,
}: {
  caseRef: string;
  url: string;
}): EmailContent {
  return {
    subject: `${caseRef} has every document, but has not been submitted`,
    ...renderEmail({
      heading: `${caseRef} reached 100%`,
      paragraphs: [
        "Every required document on this checklist has been uploaded. The traveller has not pressed Submit, so the case is not in the review queue yet.",
        "They may still be checking their file — or they may be waiting for something nobody has told them about.",
      ],
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
 * → traveller: their visa is approaching the expiry date they gave us.
 *
 * The date is theirs, so it is repeated back in the same terms the
 * renewal card uses — attributed, and formatted in UTC, because a
 * date-only value formatted locally reads as the previous day for every
 * recipient west of Greenwich.
 *
 * This email states no rule and promises no outcome: it names a date the
 * traveller supplied and sends them to the card that explains where the
 * real renewal route is. `visaName` comes off a curated corridor row and
 * is null when none resolved, which is a fallback rather than the string
 * "null" in someone's inbox.
 */
export function visaExpiringEmail({
  visaName,
  expiresOn,
  daysOut,
  url,
}: {
  visaName: string | null;
  expiresOn: string;
  daysOut: number;
  url: string;
}): EmailContent {
  const visa = visaName ?? "visa";
  const when = new Date(`${expiresOn}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    subject: `Your ${visa} expires in ${daysOut} days`,
    ...renderEmail({
      heading: `${daysOut} days until your ${visa} expires`,
      paragraphs: [
        `You told us your ${visa} expires on ${when}.`,
        "If you plan to stay, start your extension or renewal before that date — most routes will not accept an application filed after it.",
      ],
      cta: { href: url, label: "See what to check" },
    }),
  };
}

/**
 * → traveller: a government travel advisory for their destination moved.
 *
 * Every substantive sentence here belongs to the issuing government and
 * is quoted with its name attached. This product does not summarise,
 * rank or interpret a safety advisory — it says who changed what, and
 * sends the traveller to read it at the source. The note arrives over
 * the network from a third party, so it is passed to `renderEmail` raw
 * and escaped at that boundary like every other untrusted string here.
 */
export function advisoryChangedEmail({
  destination,
  source,
  level,
  changeNote,
  url,
}: {
  destination: string;
  source: string;
  level: string | null;
  changeNote: string | null;
  url: string;
}): EmailContent {
  // The note is what the source itself said changed; the level is the
  // fallback when a source publishes a rating but no note. One of the
  // two is always present, so the email never says merely "something
  // changed" with nothing to show for it.
  const detail = changeNote
    ? `“${changeNote}” — ${source}`
    : `${source} now rates ${destination} as ${level}.`;

  return {
    subject: `Travel advice for ${destination} has been updated`,
    ...renderEmail({
      heading: `Travel advice for ${destination} has been updated`,
      paragraphs: [
        detail,
        "This is their wording, not ours. Read the full advice on their own page before you act on it.",
      ],
      cta: { href: url, label: `Read it on ${source}` },
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

/**
 * A corridor revision changed what this traveller must produce.
 *
 * The email names the documents rather than saying "your checklist has
 * changed" and making them go and diff it themselves — added and dropped
 * are different news, and someone who has already gathered a document
 * needs to be told it is no longer wanted as plainly as they need to be
 * told about a new one.
 *
 * It states outright that nothing they uploaded was destroyed, because
 * that is the first thing anyone reading "your requirements changed"
 * will fear, and `adoptRuleSet` guarantees it.
 */
export function checklistChangedEmail({
  visaName,
  added,
  removed,
  url,
}: {
  visaName: string;
  added: string[];
  removed: string[];
  url: string;
}): EmailContent {
  const list = [
    ...added.map((name) => `Now needed: ${name}`),
    ...removed.map((name) => `No longer needed: ${name}`),
  ];

  return {
    subject: `Your ${visaName} checklist has changed`,
    ...renderEmail({
      heading: "Your checklist has changed",
      paragraphs: [
        `The mission has revised what it asks for on your ${visaName}, and ` +
          "your checklist has been updated to match. Everything you have " +
          "already uploaded has been kept.",
      ],
      list,
      cta: { href: url, label: "See your documents" },
    }),
  };
}
