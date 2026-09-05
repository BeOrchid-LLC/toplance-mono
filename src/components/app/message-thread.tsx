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
function relativeTime(date: Date, locale: Locale): string {
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
 * The thread, oldest first — a conversation reads top to bottom, unlike
 * case notes which read as a running log. Server-friendly and
 * presentational: no state, no client boundary, just `listMessages`'
 * rows laid out.
 *
 * Every body renders as plain text in `whitespace-pre-wrap`. AGENTS.md
 * is explicit that traveller-authored content is never Markdown- or
 * HTML-rendered, and staff replies here are just as human-authored — so
 * this never routes through `chat-markdown.tsx`, on either side.
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
            {m.senderName ??
              (m.senderRole === "staff"
                ? MESSAGES.senderStaff[locale]
                : MESSAGES.senderTraveler[locale])}{" "}
            · {relativeTime(m.createdAt, locale)}
          </p>
          <p className="t-body mt-1 max-w-[62ch] whitespace-pre-wrap">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}
