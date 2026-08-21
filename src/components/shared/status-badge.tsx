import { Badge } from "@/components/ui/badge";
import { DOC_STATE, STATUS, type ApplicationStatus, type DocumentState } from "@/lib/domain/status";

/** Colour plus label. The label is always present — colour never stands alone. */
export function StatusBadge({
  status,
  short = false,
}: {
  status: ApplicationStatus;
  short?: boolean;
}) {
  const s = STATUS[status];
  return <Badge variant={s.variant}>{short ? s.short : s.label}</Badge>;
}

export function DocStateBadge({ state }: { state: DocumentState }) {
  const s = DOC_STATE[state];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
