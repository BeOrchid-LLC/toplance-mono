"use client";

import * as React from "react";

import {
  UploadOutcomeDialog,
  type UploadOutcome,
} from "@/components/app/upload-outcome-dialog";

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
  docs,
  children,
}: {
  docs: OutcomeDoc[];
  children: React.ReactNode;
}) {
  const [active, setActive] = React.useState<{
    docKey: string;
    outcome: UploadOutcome;
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
    setActive({ docKey, outcome: completesChecklist ? "complete" : "received" });
  }, []);

  const value = React.useMemo(
    () => ({ report, registerPicker }),
    [report, registerPicker]
  );

  const doc = active ? docs.find((d) => d.docKey === active.docKey) : undefined;

  /**
   * The pre-check runs in an `after()` hook, so its verdict arrives on a
   * later render rather than in the upload's own response. Derived from
   * the live row rather than copied into state, so there is one source
   * of truth and it cannot be a render behind.
   */
  const flagged = doc?.state === "flagged" || doc?.state === "failed";
  const outcome: UploadOutcome | null = !active
    ? null
    : flagged
      ? "flagged"
      : active.outcome;

  return (
    <UploadOutcomeContext.Provider value={value}>
      {children}
      <UploadOutcomeDialog
        outcome={outcome}
        documentName={doc?.name ?? "document"}
        reason={doc?.reason}
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
