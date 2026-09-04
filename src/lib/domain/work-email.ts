/**
 * Whether a director signing up gave a work address.
 *
 * Toplance's organisation accounts are meant to be registered, licensed
 * travel agencies, and the address is the first cheap signal that the
 * account belongs to one. It is only a signal: a consumer mailbox is
 * the one thing this can rule out, and a bought domain proves nothing
 * — the licence check after sign-up is what actually decides.
 *
 * A deny list rather than an allow list, because there is no list of
 * every legitimate agency domain and there never will be. This one is
 * short on purpose: the mailboxes people in the covered regions
 * actually use personally. Getting it wrong in the strict direction
 * turns away a real customer at the door, which is far worse than
 * letting one personal address through to a licence check that will
 * catch it.
 */
const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
]);

/** The part after the `@`, lowercased — or `null` if there isn't one. */
export function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export function isWorkEmail(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) return false;
  return !CONSUMER_DOMAINS.has(domain);
}

/**
 * Named so the refusal can say which address it is refusing. A rule the
 * visitor cannot see the shape of is one they retry at random.
 */
export function workEmailRefusal(email: string): string {
  const domain = domainOf(email);
  return `Use your organisation's own email address${
    domain ? ` — ${domain} is a personal mailbox` : ""
  }. Organisation accounts are registered to licensed travel agencies.`;
}
