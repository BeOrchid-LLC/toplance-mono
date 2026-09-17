import { shortName } from "@/lib/format/name";

/** Somebody a row can be assigned to. */
export type AssigneePerson = { id: string; fullName: string; email: string };

/** One option of `AssigneeSelect`, before its words are translated. */
export type AssigneeOption =
  | { kind: "unassigned"; value: "" }
  | { kind: "me"; value: string }
  | { kind: "person"; value: string; short: string; full: string | undefined };

/**
 * What `AssigneeSelect` offers, as a pure function so the rules can be
 * tested without rendering.
 *
 * - **Unassigned**, always.
 * - **Assign to me**, unless the reader already holds the row — their
 *   own name is the selected option then.
 * - **Everybody else**, when `canAssignOthers`; otherwise only the
 *   current holder, so the select still says who has the row without
 *   offering a hand-off the server would refuse.
 *
 * A holder the roster no longer lists is still an option, first among
 * the names, or the select would read "Unassigned" over a row that is
 * not — and shows a dash rather than a name it does not have.
 */
export function assigneeOptions({
  value,
  current,
  viewerId,
  people,
  canAssignOthers,
}: {
  value: string | null;
  current?: AssigneePerson | null;
  viewerId: string;
  people: readonly AssigneePerson[];
  canAssignOthers: boolean;
}): { options: AssigneeOption[]; holderFullName: string | undefined } {
  const person = (p: AssigneePerson | null, id: string): AssigneeOption => ({
    kind: "person",
    value: id,
    short: p ? shortName(p.fullName, p.email) || "—" : "—",
    full: p ? p.fullName || p.email || undefined : undefined,
  });

  const named = people.filter(
    (p) => p.id === value || (canAssignOthers && p.id !== viewerId)
  );

  const options: AssigneeOption[] = [{ kind: "unassigned", value: "" }];
  if (value !== viewerId) options.push({ kind: "me", value: viewerId });

  let holder: AssigneePerson | null = null;
  if (value !== null) {
    holder =
      people.find((p) => p.id === value) ??
      (current && current.id === value ? current : null);
    if (!named.some((p) => p.id === value)) options.push(person(holder, value));
  }

  for (const p of named) options.push(person(p, p.id));

  return {
    options,
    holderFullName: holder ? holder.fullName || holder.email || undefined : undefined,
  };
}
