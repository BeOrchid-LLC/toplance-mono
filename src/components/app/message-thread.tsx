import type { MessageView } from "@/lib/data/messages";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import { MESSAGES } from "@/lib/i18n/messages";
import { RELATIVE_TIME } from "@/lib/i18n/relative-time";

/**
 * Same shape as the notifications bell's helper — duplicated rather than
 * shared, the established idiom here (`formatDay` on the profile and
 * ops case pages is duplicated the same way) rather than a premature
 * shared utility for two small call sites. Only the strings underneath it
 * are shared, via `RELATIVE_TIME`.
 */
export function relativeTime(date: Date, locale: Locale): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return RELATIVE_TIME.justNow[locale];
  if (minutes < 60) {
    return RELATIVE_TIME.minutesAgo[locale].replace("{n}", String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return RELATIVE_TIME.hoursAgo[locale].replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days < 7) return RELATIVE_TIME.daysAgo[locale].replace("{n}", String(days));
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * What a message's author is called.
 *
 * Exported beside `relativeTime` above so the case rail can print the
 * last line of the thread in its panel header without a second opinion
 * about who wrote it — the fallback is the interesting part, and one
 * copy of it means the header and the message underneath can never
 * disagree.
 */
export function senderLabel(m: MessageView, locale: Locale): string {
  if (m.senderName) return m.senderName;
  return m.side === "agency"
    ? MESSAGES.senderAgency[locale]
    : MESSAGES.senderTraveler[locale];
}

/**
 * The thread, oldest first — a conversation reads top to bottom, unlike
 * case notes which read as a running log. Server-friendly and
 * presentational: no state, no client boundary, just `listMessages`'
 * rows laid out.
 *
 * Every body renders as plain text in `whitespace-pre-wrap`. AGENTS.md
 * is explicit that traveller-authored content is never Markdown- or
 * HTML-rendered, and the agency's replies here are just as
 * human-authored — so this never routes through `chat-markdown.tsx`, on
 * either side.
 */
export async function MessageThread({ messages }: { messages: MessageView[] }) {
  const locale = await getLocale();

  if (messages.length === 0) {
    return <p className="t-muted pt-3">{MESSAGES.empty[locale]}</p>;
  }

  return (
    <ul>
      {messages.map((m) => (
        <li key={m.id} className="border-b border-border py-3 last:border-b-0">
          <p className="special">
            {senderLabel(m, locale)} · {relativeTime(m.createdAt, locale)}
          </p>
          <p className="t-body mt-1 max-w-[62ch] whitespace-pre-wrap">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}
