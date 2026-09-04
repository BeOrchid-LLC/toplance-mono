"use client";

import * as React from "react";

import { documentVerdict } from "@/app/(app)/actions";

import {
  UploadOutcomeDialog,
  type UploadOutcome,
} from "@/components/app/upload-outcome-dialog";

/**
 * How long to keep asking the server whether the pre-check has landed,
 * and how often.
 *
 * `precheckDocument` is a model call scheduled in an `after()` hook, so
 * it finishes a second or two after the upload's own response — and its
 * `revalidatePath` cannot reach a client that has already rendered.
 * Without this the refusal was unreachable: the traveller was told
 * "Received", the flag arrived unseen, and the Re-upload/Skip variant
 * never appeared at all.
 *
 * Bounded rather than open-ended. A verdict that has not arrived in
 * fifteen seconds is one the traveller should not be held at a modal
 * for; the flag still lands on the row, which is where it lived before
 * this dialog existed.
 */
const VERDICT_POLL_MS = 1500;
const VERDICT_WINDOW_MS = 15_000;

/** The parts of a checklist row this needs to describe an outcome. */
export type OutcomeDoc = {
  docKey: string;
  name: string;
  state: string;
  reason: string | null;
};

type UploadOutcomeContextValue = {
  /** A row reporting that its upload succeeded. */
  report: (docKey: string, completesChecklist: boolean) => void;
  /**
   * A row lending its file picker, so "Re-upload" can open the right one.
   * Returns the deregister function, for the effect that called it.
   */
  registerPicker: (docKey: string, open: () => void) => () => void;
};

const UploadOutcomeContext = React.createContext<UploadOutcomeContextValue>({
  report: () => {},
  registerPicker: () => () => {},
});

export const useUploadOutcome = () => React.useContext(UploadOutcomeContext);

/**
 * Owns the "what happened to your upload" dialog for the whole checklist.
 *
 * It lives here, above the three document sets, rather than inside the
 * row that was uploaded — which is where it started, and which does not
 * work. Uploading moves a row between sets ("still to do" → "with us"),
 * so the server re-render unmounts that row and remounts it somewhere
 * else in the list. A dialog owned by the row goes with it: the modal
 * appears and is destroyed a few hundred milliseconds later, exactly
 * when the traveller is reading it.
 *
 * The row is still the only thing that can open a file picker, so it
 * lends one instead. Rows register on mount and deregister on unmount,
 * which means the entry re-points at the current instance after every
 * re-sort — the same churn that broke the dialog is what keeps this
 * correct.
 */
export function UploadOutcomeProvider({
  applicationId,
  docs,
  children,
}: {
  applicationId: string;
  docs: OutcomeDoc[];
  children: React.ReactNode;
}) {
  const [active, setActive] = React.useState<{
    docKey: string;
    outcome: UploadOutcome;
    /** Distinguishes one opening from the next, so the dialog remounts. */
    openId: number;
  } | null>(null);

  const pickers = React.useRef(new Map<string, () => void>());

  const registerPicker = React.useCallback(
    (docKey: string, open: () => void) => {
      pickers.current.set(docKey, open);
      return () => {
        // Only if it is still ours: a remount registers the new instance
        // before the old one's cleanup runs, and an unguarded delete
        // would drop the live picker.
        if (pickers.current.get(docKey) === open) pickers.current.delete(docKey);
      };
    },
    []
  );

  const report = React.useCallback((docKey: string, completesChecklist: boolean) => {
    setActive({
      docKey,
      outcome: completesChecklist ? "complete" : "received",
      openId: Date.now(),
    });
  }, []);

  const value = React.useMemo(
    () => ({ report, registerPicker }),
    [report, registerPicker]
  );

  const doc = active ? docs.find((d) => d.docKey === active.docKey) : undefined;

  /**
   * The verdict, once it has been fetched — because it cannot be sent.
   *
   * `router.refresh()` was the first attempt and it did not work: the
   * interval ran and the provider never re-rendered, so the dialog sat
   * on "Received" while the flag was already in the database. Asking a
   * server action for the row is the same question without the
   * router's caching semantics in the middle, and it is a thing a test
   * can watch happen.
   */
  const [fetched, setFetched] = React.useState<{
    docKey: string;
    state: string;
    reason: string | null;
  } | null>(null);

  const verdict = fetched?.docKey === active?.docKey ? fetched : null;
  const state = verdict?.state ?? doc?.state;
  const reason = verdict?.reason ?? doc?.reason ?? null;

  const flagged = state === "flagged" || state === "failed";
  const outcome: UploadOutcome | null = !active
    ? null
    : flagged
      ? "flagged"
      : active.outcome;

  /**
   * Go and fetch the verdict, because it cannot be pushed.
   *
   * `revalidatePath` inside the upload's `after()` hook invalidates the
   * cache for the *next* request; it does not reach a client already on
   * the page. So while the dialog is open on a document still in
   * `checking`, ask `documentVerdict` for that one row on a timer.
   *
   * Stops the moment the row settles, when the traveller dismisses the
   * dialog, or when the window runs out.
   */
  const waiting = active !== null && state === "checking";
  const activeKey = active?.docKey;

  React.useEffect(() => {
    if (!waiting || !activeKey) return;

    let cancelled = false;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > VERDICT_WINDOW_MS) {
        clearInterval(timer);
        return;
      }

      const result = await documentVerdict(applicationId, activeKey);
      if (cancelled || "error" in result) return;
      // Only a settled verdict is worth a state update; `checking` is
      // what we already knew, and writing it back would re-render the
      // page on every tick for nothing.
      if (result.state !== "checking") {
        clearInterval(timer);
        setFetched({ docKey: activeKey, state: result.state, reason: result.reason });
      }
    }, VERDICT_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `active?.openId` rather than `active`: one upload is one wait, and
    // restarting the window on every unrelated re-render would let it
    // run forever.
  }, [waiting, activeKey, active?.openId, applicationId]);

  return (
    <UploadOutcomeContext.Provider value={value}>
      {children}
      {/* Keyed per opening, so the dialog's processing timer starts
          fresh every time. It used to persist across uploads — the
          provider outlives them all — and a second completed checklist
          skipped its ring entirely. */}
      <UploadOutcomeDialog
        key={active?.openId ?? "closed"}
        outcome={outcome}
        documentName={doc?.name ?? "document"}
        reason={reason}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        onReupload={() => {
          const open = active ? pickers.current.get(active.docKey) : undefined;
          setActive(null);
          open?.();
        }}
      />
    </UploadOutcomeContext.Provider>
  );
}
