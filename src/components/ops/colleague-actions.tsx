"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Ban, RotateCcw, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  removeColleague,
  restoreColleague,
  resetColleagueTwoFactor,
  suspendColleague,
} from "@/app/[locale]/ops/staff/actions";
import {
  colleagueActs,
  refuseColleagueAct,
  type ColleagueAct,
  type ColleagueSubject,
} from "@/lib/domain/colleague-actions";
import { fill } from "@/lib/i18n/fill";
import type { Locale } from "@/lib/i18n/locales";
import { OPS_STAFF } from "@/lib/i18n/ops-staff";

/**
 * What a director can do to one colleague, at the end of their row.
 *
 * Inline buttons rather than an overflow menu, and that was the one
 * layout question worth asking on this screen. The invitations table
 * directly below carries its two acts inline; hiding these three behind
 * a `⋯` would mean one page answers "what can I do to a person here"
 * two different ways, and the acts a director most needs to find in a
 * hurry — somebody has lost their phone, somebody has left — would be
 * the hidden ones.
 *
 * Three of the four confirm, per the rule in `AGENTS.md`. Restore does
 * not: it is the undo for the suspension beside it, it gives access back
 * rather than taking it away, and gating the way out of a mistake makes
 * recovery harder than the mistake was.
 *
 * The rules that grey a button out are the same module the server acts
 * on, `@/lib/domain/colleague-actions`, so a button is never live for
 * something the action will refuse. The reverse — a button greyed out on
 * a roster that has since changed — is the harmless direction, and the
 * action rechecks under a lock either way.
 */

type ActionResult = { ok: true } | { error: string };
type Copy = Record<Locale, string>;

const ACTIONS: Record<ColleagueAct, (formData: FormData) => Promise<ActionResult>> = {
  remove: removeColleague,
  suspend: suspendColleague,
  restore: restoreColleague,
  reset_two_factor: resetColleagueTwoFactor,
};

const ICONS: Record<ColleagueAct, React.ReactNode> = {
  remove: <UserMinus />,
  suspend: <Ban />,
  restore: <RotateCcw />,
  reset_two_factor: <KeyRound />,
};

const LABELS: Record<ColleagueAct, Copy> = {
  remove: OPS_STAFF.colleagueRemove,
  suspend: OPS_STAFF.colleagueSuspend,
  restore: OPS_STAFF.colleagueRestore,
  reset_two_factor: OPS_STAFF.colleagueResetTwoFactor,
};

const TOASTS: Record<ColleagueAct, Copy> = {
  remove: OPS_STAFF.toastColleagueRemoved,
  suspend: OPS_STAFF.toastColleagueSuspended,
  restore: OPS_STAFF.toastColleagueRestored,
  reset_two_factor: OPS_STAFF.toastTwoFactorReset,
};

/**
 * The dialog each act raises, keyed on the act rather than chosen by a
 * chain of ternaries — `restore` is absent because it has none, which is
 * a fact the type can hold rather than a case the render has to skip.
 *
 * Each `body` says what lands the moment the button commits, in the
 * present tense, and says something the page behind it does not: that
 * the person's work survives a removal, that a suspension freezes their
 * assignments rather than redistributing them, that a reset ends the
 * sessions already open.
 */
const CONFIRMATIONS: Partial<
  Record<ColleagueAct, { title: Copy; body: Copy; cancel: Copy }>
> = {
  remove: {
    title: OPS_STAFF.removeConfirmTitle,
    body: OPS_STAFF.removeConfirmBody,
    cancel: OPS_STAFF.removeCancel,
  },
  suspend: {
    title: OPS_STAFF.suspendConfirmTitle,
    body: OPS_STAFF.suspendConfirmBody,
    cancel: OPS_STAFF.suspendCancel,
  },
  reset_two_factor: {
    title: OPS_STAFF.resetTwoFactorConfirmTitle,
    body: OPS_STAFF.resetTwoFactorConfirmBody,
    cancel: OPS_STAFF.resetTwoFactorCancel,
  },
};

export function ColleagueActions({
  colleague,
  colleagues,
  viewerId,
  locale,
}: {
  colleague: ColleagueSubject & { fullName: string; email: string };
  /**
   * The whole roster, unfiltered by the toolbar. The last-director
   * question is about every colleague, not the nine a search left on
   * screen — answering it from the filtered rows would grey out a
   * perfectly ordinary removal the moment somebody typed a name.
   */
  colleagues: ColleagueSubject[];
  viewerId: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  /** The act awaiting an answer, or `null`. */
  const [confirming, setConfirming] = React.useState<ColleagueAct | null>(null);

  /** What the dialogs and toasts call this person. */
  const name = colleague.fullName || colleague.email;
  const dialog = confirming ? CONFIRMATIONS[confirming] : undefined;

  function run(act: ColleagueAct) {
    const formData = new FormData();
    formData.set("colleague_id", colleague.id);

    startTransition(async () => {
      const result = await ACTIONS[act](formData);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // Only on success, for the reason `tenant-controls.tsx` gives: a
      // failed act leaves its dialog standing so the operator reads the
      // error against the question they asked, rather than watching it
      // close and having to work out from a toast what happened.
      setConfirming(null);
      toast.success(fill(TOASTS[act][locale], { name }));
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {colleagueActs(colleague).map((act) => {
        const refusal = refuseColleagueAct({
          act,
          actorId: viewerId,
          subjectId: colleague.id,
          colleagues,
        });

        const button = (
          <Button
            variant="tertiary"
            size="sm"
            disabled={pending || refusal !== null}
            onClick={() => (CONFIRMATIONS[act] ? setConfirming(act) : run(act))}
          >
            {ICONS[act]} {LABELS[act][locale]}
          </Button>
        );

        /**
         * The reason sits beside the button rather than in a toast the
         * operator has to earn by clicking. "Remove" greyed out with no
         * explanation reads as a broken screen; the same button carrying
         * "This is the last director who can still open the console" has
         * already answered the question.
         *
         * On the wrapper, not on the button: a disabled button receives
         * no pointer events, so its own `title` never opens. The span
         * does, and it also gives the sentence somewhere to live for a
         * screen reader, which a disabled control drops out of the tab
         * order and away from.
         */
        return refusal ? (
          <span
            key={act}
            title={OPS_STAFF.colleagueRefusal[refusal][locale]}
            aria-label={OPS_STAFF.colleagueRefusal[refusal][locale]}
          >
            {button}
          </span>
        ) : (
          <React.Fragment key={act}>{button}</React.Fragment>
        );
      })}

      {confirming && dialog && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirming(null)}
          title={fill(dialog.title[locale], { name })}
          body={fill(dialog.body[locale], { name })}
          confirmLabel={LABELS[confirming][locale]}
          cancelLabel={dialog.cancel[locale]}
          icon={ICONS[confirming]}
          pending={pending}
          onConfirm={() => run(confirming)}
        />
      )}
    </div>
  );
}
