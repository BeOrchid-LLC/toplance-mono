import type { MessageView } from "@/lib/data/messages";

/**
 * Same shape as the notifications bell's helper — duplicated rather than
 * shared, the established idiom here (`formatDay` on the profile and
 * ops case pages is duplicated the same way) rather than a premature
 * shared utility for two small call sites.
 */
function relativeTime(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
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
export function MessageThread({ messages }: { messages: MessageView[] }) {
  if (messages.length === 0) {
    return (
      <p className="t-muted pt-3">
        Nothing yet. Write the first message below.
      </p>
    );
  }

  return (
    <ul>
      {messages.map((m) => (
        <li key={m.id} className="border-b border-border py-3 last:border-b-0">
          <p className="special">
            {m.senderName ?? (m.senderRole === "staff" ? "Toplance team" : "Traveller")}{" "}
            · {relativeTime(m.createdAt)}
          </p>
          <p className="t-body mt-1 max-w-[62ch] whitespace-pre-wrap">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}
