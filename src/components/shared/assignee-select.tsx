"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { useT } from "@/components/locale-provider";
import { ASSIGNEE } from "@/lib/i18n/assignee";
import {
  assigneeOptions,
  type AssigneePerson,
} from "@/lib/domain/assignee-options";
import { cn } from "@/lib/utils";

export type { AssigneePerson };

/**
 * Who is on this, as one short dropdown.
 *
 * The client's review of 17 September, for the demo queue and "the same
 * logic" on the agency side: the Assigned To column is always a
 * selector, "Assign to me" is an option inside it rather than a button
 * beside it, and a name reads "First L." with the whole name on hover.
 * Before this, the enquiry row was a 240px roster select plus a button,
 * and the case screen was a Take button, a Hand back button and an
 * "Assign to…" menu — three controls for one question.
 *
 * The options — Unassigned, Assign to me, then the names the reader may
 * pick — are decided by `assigneeOptions`, where they are tested.
 *
 * This mirrors the rules, it does not enforce them: every caller's
 * action checks its own policy (`canAssignDemoRequest`, `canAssignCase`).
 *
 * Commits on the pick. Releasing takes a name off a row; it deletes
 * nothing and closes nobody out — the same reading the Take / Hand back
 * buttons it replaces had under the AGENTS.md rule, and neither asked.
 *
 * Narrow on purpose (`w-[9.5rem]`): three short labels are all it ever
 * shows, and the client asked for the column's width back. A native
 * select truncates its own face, and `title` carries the full name.
 */
export function AssigneeSelect({
  value,
  current,
  viewerId,
  people,
  canAssignOthers,
  onChange,
  label,
  disabled,
  className,
}: {
  /** The holder's id, or `null` for an unassigned row. */
  value: string | null;
  /**
   * The holder as a person, for when they are not in `people` — a
   * colleague who has since left the roster. Ignored when they are.
   */
  current?: AssigneePerson | null;
  /** The reader, whom "Assign to me" names. */
  viewerId: string;
  /** Everyone who could be named. The reader may be among them. */
  people: readonly AssigneePerson[];
  /** Whether to offer anybody other than the reader. */
  canAssignOthers: boolean;
  onChange: (assigneeId: string | null) => void;
  /** The accessible name — the column or field this select answers. */
  label: string;
  disabled?: boolean;
  /** On the `<select>`: a height other than the table row's, say. */
  className?: string;
}) {
  const t = useT();
  const { options, holderFullName } = assigneeOptions({
    value,
    current,
    viewerId,
    people,
    canAssignOthers,
  });

  return (
    <NativeSelect
      aria-label={label}
      title={holderFullName}
      className={cn("h-[var(--row-h)] w-[9.5rem]", className)}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.currentTarget.value || null)}
    >
      {options.map((o) =>
        o.kind === "unassigned" ? (
          <option key="" value="">
            {t(ASSIGNEE.unassigned)}
          </option>
        ) : o.kind === "me" ? (
          <option key={`me:${o.value}`} value={o.value}>
            {t(ASSIGNEE.assignToMe)}
          </option>
        ) : (
          <option key={o.value} value={o.value} title={o.full}>
            {o.short}
          </option>
        )
      )}
    </NativeSelect>
  );
}
