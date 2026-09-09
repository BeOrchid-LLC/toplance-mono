import type { SupportMessageRow } from "@/lib/data/support";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_SUPPORT } from "@/lib/i18n/ops-support";
import { cn } from "@/lib/utils";

/**
 * One support conversation, read by both sides.
 *
 * A server component shared by the ops queue and the agency console
 * rather than one each: the two see the same thread, and two
 * components would be two chances for them to disagree about what was
 * said. Only the composer below it differs, because the actions do.
 *
 * The request's own subject and body open the thread — they are the
 * first message, written when the agency raised it, and repeating them
 * in a header above a conversation that starts with them would say the
 * same thing twice.
 */
export function SupportThread({
  opening,
  messages,
  locale,
}: {
  /** The request itself: who wrote it, when, and what it said. */
  opening: { body: string; authorName: string | null; createdAt: Date };
  messages: SupportMessageRow[];
  locale: Locale;
}) {
  const entries = [
    {
      id: "opening",
      fromStaff: false,
      body: opening.body,
      authorName: opening.authorName,
      createdAt: opening.createdAt,
    },
    ...messages,
  ];

  return (
    <ol className="flex flex-col gap-5">
      {entries.map((m) => (
        <li
          key={m.id}
          className={cn(
            "rounded-md border p-4",
            // Ours sits on the brand tint, theirs on the plain surface.
            // A conversation with two participants needs the eye to
            // separate them before the reader has parsed a single name.
            m.fromStaff
              ? "border-brand/40 bg-[color-mix(in_srgb,var(--brand)_7%,var(--mix))]"
              : "border-border bg-surface"
          )}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="t-title">
              {m.authorName ??
                (m.fromStaff ? OPS_SUPPORT.fromUs[locale] : OPS_SUPPORT.fromAgency[locale])}
            </span>
            <span className="special">
              {m.fromStaff ? OPS_SUPPORT.fromUs[locale] : OPS_SUPPORT.fromAgency[locale]}
            </span>
            <span className="t-muted num ms-auto">
              {m.createdAt.toISOString().slice(0, 10)}
            </span>
          </div>
          {/* Plain text, wrapped. Agency-authored and staff-authored
              alike — nothing here is model output, so nothing here
              renders Markdown. */}
          <p className="t-body mt-2 whitespace-pre-wrap">{m.body}</p>
        </li>
      ))}
    </ol>
  );
}
