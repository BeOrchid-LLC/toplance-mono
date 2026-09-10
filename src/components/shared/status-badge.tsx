import { Badge } from "@/components/ui/badge";
import {
  DOC_STATE_VARIANT,
  INVITATION_STATUS_VARIANT,
  STATUS_VARIANT,
  type ApplicationStatus,
  type DocumentVerdict,
  type DocumentState,
  type InvitationStatus,
} from "@/lib/domain/status";
import {
  DOC_STATE_COPY,
  DOC_VERDICT_COPY,
  INVITATION_STATUS_COPY,
  STATUS_COPY,
} from "@/lib/i18n/status";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Colour plus label. The label is always present — colour never stands
 * alone.
 *
 * `locale` is a required prop rather than a `getLocale()` call inside,
 * because these three render from both sides: server pages read
 * `getLocale()` from the route segment, and `document-row.tsx` and
 * `review-row.tsx` are client components that can only get there through
 * `useLocale()`. A prop is the one signature both can satisfy, and it
 * keeps the badge synchronous.
 */
export function StatusBadge({
  status,
  locale,
  short = false,
}: {
  status: ApplicationStatus;
  locale: Locale;
  short?: boolean;
}) {
  const copy = STATUS_COPY[status];
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {short ? copy.short[locale] : copy.label[locale]}
    </Badge>
  );
}

/**
 * `verdict` overrides the label, never the state.
 *
 * Two of the four verdicts describe the row better than its state does.
 * A document the AI has passed sits on `checking`, whose label reads
 * "Checking" — a machine still working on a file it has in fact already
 * cleared, which then waits on a person for as long as the queue takes.
 * A document the AI has flagged sits on `flagged`, whose label,
 * "Needs re-upload", is right about what to do and silent about who
 * decided, on the one screen where the reviewer needs to know nobody
 * has.
 *
 * The colour still comes from `state`, so a flag is amber whoever raised
 * it, and the pill keeps meaning what the rest of the product means by
 * it. Omit `verdict` and this is the badge it always was.
 */
export function DocStateBadge({
  state,
  locale,
  verdict = "none",
}: {
  state: DocumentState;
  locale: Locale;
  verdict?: DocumentVerdict;
}) {
  const label =
    verdict === "ai_checked"
      ? DOC_VERDICT_COPY.aiChecked[locale]
      : verdict === "ai_flagged"
        ? DOC_VERDICT_COPY.aiFlagged[locale]
        : DOC_STATE_COPY[state].label[locale];

  return <Badge variant={DOC_STATE_VARIANT[state]}>{label}</Badge>;
}

export function InvitationStatusBadge({
  status,
  locale,
}: {
  status: InvitationStatus;
  locale: Locale;
}) {
  return (
    <Badge variant={INVITATION_STATUS_VARIANT[status]}>
      {INVITATION_STATUS_COPY[status].label[locale]}
    </Badge>
  );
}
