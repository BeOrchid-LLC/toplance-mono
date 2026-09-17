"use client";

import * as React from "react";
import { toast } from "sonner";

import { AssigneeSelect } from "@/components/shared/assignee-select";
import { setCaseHandler } from "@/app/[locale]/agency/actions";
import { useT } from "@/components/locale-provider";
import { CASE_COMMON } from "@/lib/i18n/case-review-actions";

/** Just enough of a colleague to offer them the case. */
export type Colleague = { userId: string; fullName: string; email: string };

/**
 * Who is handling a case, as the one assignee dropdown the demo queue
 * uses — Unassigned, Assign to me, and the colleagues the reader may
 * hand it to.
 *
 * It replaced a Take button, a Hand back button and a director-only
 * "Assign to…" menu, at the client's request on 17 September ("this
 * same logic applies to the agency side"). What each option does is
 * unchanged, because it posts to the same `setCaseHandler`: picking
 * yourself on an unheld case is `claimCase`, which refuses if a
 * colleague won the race; Unassigned is `releaseCase`; anybody else is
 * `assignCaseTo`, which refuses if the case moved since this screen
 * read it.
 *
 * This is the one control that changes who else can *see* a case.
 * `handlesCase` reads `assignee_id`, so handing a case on grants a
 * colleague a client's documents — which is why colleagues are offered
 * to the director alone (`canAssignCase`, enforced by the action). A
 * reviewer sees Assign to me on an unheld case and Unassigned on their
 * own, which are the two moves that were theirs as buttons.
 *
 * Commits on the pick, as the buttons did: releasing takes a name off a
 * case and deletes nothing, so it is not destructive under the AGENTS.md
 * rule. A director may now also pick themselves on a colleague's case
 * in one step, where before it took Hand back then Take.
 */
export function CaseAssigneeSelect({
  applicationId,
  assigneeId,
  assigneeName,
  viewerId,
  isDirector,
  colleagues,
  className,
}: {
  applicationId: string;
  assigneeId: string | null;
  assigneeName?: string | null;
  viewerId: string;
  isDirector: boolean;
  colleagues: readonly Colleague[];
  className?: string;
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();

  function set(next: string | null) {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("assignee_id", next ?? "");

    startTransition(async () => {
      const result = await setCaseHandler(formData);
      if ("error" in result) toast.error(result.error);
    });
  }

  return (
    <AssigneeSelect
      label={t(CASE_COMMON.handledBy)}
      className={className}
      value={assigneeId}
      current={
        assigneeId ? { id: assigneeId, fullName: assigneeName ?? "", email: "" } : null
      }
      viewerId={viewerId}
      people={colleagues.map((c) => ({ id: c.userId, fullName: c.fullName, email: c.email }))}
      canAssignOthers={isDirector}
      disabled={pending}
      onChange={set}
    />
  );
}

/** The case screen's version: the dropdown under a "Handled by" label. */
export function CaseHandlerControl(props: React.ComponentProps<typeof CaseAssigneeSelect>) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="special-caps t-muted">{t(CASE_COMMON.handledBy)}</span>
      <CaseAssigneeSelect {...props} />
    </div>
  );
}
