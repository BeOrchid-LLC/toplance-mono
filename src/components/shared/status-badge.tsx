import { Badge } from "@/components/ui/badge";
import {
  DOC_STATE_VARIANT,
  INVITATION_STATUS_VARIANT,
  STATUS_VARIANT,
  type ApplicationStatus,
  type DocumentState,
  type InvitationStatus,
} from "@/lib/domain/status";
import {
  DOC_STATE_COPY,
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

export function DocStateBadge({
  state,
  locale,
}: {
  state: DocumentState;
  locale: Locale;
}) {
  return (
    <Badge variant={DOC_STATE_VARIANT[state]}>{DOC_STATE_COPY[state].label[locale]}</Badge>
  );
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
