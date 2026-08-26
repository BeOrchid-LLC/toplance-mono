/**
 * Every email `notify()` can send, as pure functions — no I/O, nothing
 * async. `notify()` decides who and when; these decide only what it says.
 *
 * Plain semantic HTML: a heading, a paragraph, one link. No react-email,
 * no images, no styling beyond what keeps a message readable in a plain
 * inbox — a lot of these land on low-bandwidth connections.
 *
 * Every user-authored value (a staff message, a flag reason, a sender's
 * name, an organisation's name) is passed through `escapeHtml` before it
 * reaches the HTML body. Links are absolute URLs the caller already
 * built with `appUrl()`, not user text, so they are not escaped.
 */

export type EmailContent = { subject: string; html: string; text: string };

/** Applied to every user-authored value before it reaches an HTML string. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const ref = escapeHtml(caseRef);
  return {
    subject: `${caseRef} is ready for review`,
    html: `<h1>${ref} is ready for review</h1><p>A traveller finished their checklist and submitted their file.</p><p><a href="${url}">Open the case</a></p>`,
    text: `${caseRef} is ready for review.\n\nA traveller finished their checklist and submitted their file.\n\nOpen the case: ${url}`,
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
  const label = escapeHtml(statusLabel);
  const body = escapeHtml(message);
  return {
    subject: `Your application is now: ${statusLabel}`,
    html: `<h1>${label}</h1><p>${body}</p><p><a href="${url}">See your application</a></p>`,
    text: `${statusLabel}\n\n${message}\n\nSee your application: ${url}`,
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
  const name = escapeHtml(documentName);
  const why = escapeHtml(reason);
  return {
    subject: `${documentName} needs another look`,
    html: `<h1>${name} needs another look</h1><p>${why}</p><p><a href="${url}">Re-upload it</a></p>`,
    text: `${documentName} needs another look.\n\n${reason}\n\nRe-upload it: ${url}`,
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
  const short = truncate(preview, 140);
  const name = escapeHtml(senderName);
  const body = escapeHtml(short);
  return {
    subject: `New message from ${senderName}`,
    html: `<h1>New message from ${name}</h1><p>${body}</p><p><a href="${url}">Read and reply</a></p>`,
    text: `New message from ${senderName}\n\n${short}\n\nRead and reply: ${url}`,
  };
}

/** → traveller. */
export function itineraryReadyEmail({ url }: { url: string }): EmailContent {
  return {
    subject: "Your arrival plan is ready",
    html: `<h1>Your arrival plan is ready</h1><p>We have put together an itinerary for your trip.</p><p><a href="${url}">Open it</a></p>`,
    text: `Your arrival plan is ready.\n\nWe have put together an itinerary for your trip.\n\nOpen it: ${url}`,
  };
}

/**
 * To an invitee who has NO account. Deliberately not routed through
 * `notify()` — there is no `profiles` row to attach it to, which is also
 * why `invitation` is not a `notification_kind`.
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
  const org = escapeHtml(orgName);
  const greeting = fullName ? `${escapeHtml(fullName)}, y` : "Y";
  const greetingText = fullName ? `${fullName}, y` : "Y";
  return {
    subject: `${orgName} has invited you to Toplance`,
    html: `<h1>${org} has invited you to Toplance</h1><p>${greeting}ou have been invited to start a visa application sponsored by ${org}.</p><p><a href="${inviteUrl}">Accept the invitation</a></p>`,
    text: `${orgName} has invited you to Toplance.\n\n${greetingText}ou have been invited to start a visa application sponsored by ${orgName}.\n\nAccept the invitation: ${inviteUrl}`,
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
  const items = highlights.map((h) => escapeHtml(h));
  return {
    subject: "Your weekly Toplance digest",
    html: `<h1>Your weekly digest</h1><ul>${items.map((h) => `<li>${h}</li>`).join("")}</ul><p><a href="${url}">Open your companion</a></p>`,
    text: `Your weekly digest\n\n${highlights.map((h) => `- ${h}`).join("\n")}\n\nOpen your companion: ${url}`,
  };
}
