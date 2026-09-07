"use client";

import * as React from "react";
import { ChevronDown, UserCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCaseHandler } from "@/app/[locale]/agency/actions";
import { useT } from "@/components/locale-provider";
import { CASE_COMMON } from "@/lib/i18n/case-review-actions";

/** Just enough of a colleague to offer them the case. */
export type Colleague = { userId: string; fullName: string; email: string };

/**
 * Who is handling this case, and the controls to change it.
 *
 * This is the one control on the screen that changes who else can *see*
 * the screen. `handlesCase` reads `assignee_id`, so handing a case to a
 * colleague grants them a client's documents and handing it back to the
 * pool returns it to the whole agency — which is why the reassignment
 * menu is the director's alone, and why the copy says "hand" rather
 * than "tag".
 *
 * A reviewer looking at an unheld case can take it; the assignee can
 * give it back. Anyone else with an opinion about a colleague's case is
 * not looking at this screen, because the guard did not let them in.
 */
export function CaseHandlerControl({
  applicationId,
  assigneeId,
  assigneeName,
  viewerId,
  isDirector,
  colleagues,
}: {
  applicationId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  viewerId: string;
  isDirector: boolean;
  colleagues: Colleague[];
}) {
  const t = useT();
  const [pending, startTransition] = React.useTransition();

  function set(nextAssignee: string) {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("assignee_id", nextAssignee);

    startTransition(async () => {
      const result = await setCaseHandler(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
    });
  }

  /**
   * Who this case can be handed to: everyone but its current holder and
   * the director doing the handing.
   *
   * Dropping yourself is not cosmetic. Handing a case to yourself is
   * taking it, and taking it is the button standing next to this menu —
   * so your own name here is a second route to a thing you can already
   * do, in a control whose whole subject is somebody else. In practice
   * the only director is the owner, which is why the owner stopped
   * appearing in their own hand-off list.
   */
  const others = colleagues.filter(
    (c) => c.userId !== assigneeId && c.userId !== viewerId
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="t-muted">
        <span className="special-caps">{t(CASE_COMMON.handledBy)}</span>{" "}
        <span className="t-title">
          {/* A held case whose holder's profile is gone shows a dash,
              never "Nobody yet" — the case is still theirs, and the
              difference is what tells a director there is something to
              reassign. */}
          {assigneeId ? (assigneeName || "—") : t(CASE_COMMON.unheld)}
        </span>
      </p>

      {!assigneeId && (
        <Button size="sm" onClick={() => set(viewerId)} disabled={pending}>
          <UserCheck /> {t(CASE_COMMON.takeCase)}
        </Button>
      )}

      {assigneeId && (assigneeId === viewerId || isDirector) && (
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => set("")}
          disabled={pending}
        >
          <UserMinus /> {t(CASE_COMMON.release)}
        </Button>
      )}

      {isDirector && others.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* `secondary`, not `tertiary`: this opens a menu that
                reassigns a client's documents, and a bare line of brand
                text reads as a link to somewhere rather than as a
                control that does something. Bordered keeps it plainly
                subordinate to the filled "Take this case" beside it. */}
            <Button variant="secondary" size="sm" disabled={pending}>
              {t(CASE_COMMON.assignTo)} <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px]">
            {others.map((c) => (
              <DropdownMenuItem key={c.userId} onSelect={() => set(c.userId)}>
                {/* The name, and only the name. The address under it
                    was disambiguating colleagues who do not need it —
                    this is one agency's own team, read by the person who
                    invited every one of them. It stays as the fallback
                    for a colleague who accepted without giving a name,
                    where the alternative is a blank row. */}
                <span className="min-w-0 truncate">{c.fullName || c.email}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
