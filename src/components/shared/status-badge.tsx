import { Badge } from "@/components/ui/badge";
import { DOC_STATE, STATUS, type ApplicationStatus, type DocumentState } from "@/lib/domain/status";

/** Icon plus label plus colour — never colour alone. */
export function StatusBadge({
  status,
  short = false,
}: {
  status: ApplicationStatus;
  short?: boolean;
}) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      <Icon aria-hidden />
      {short ? s.short : s.label}
    </Badge>
  );
}

export function DocStateBadge({ state }: { state: DocumentState }) {
  const s = DOC_STATE[state];
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      <Icon aria-hidden />
      {s.label}
    </Badge>
  );
}
