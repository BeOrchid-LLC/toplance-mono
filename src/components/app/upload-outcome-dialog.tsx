"use client";

import * as React from "react";
import { Check, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * What happened to one upload, said once and plainly, instead of a toast
 * that is gone before a phone user has looked up from the camera.
 *
 * Three outcomes, and the wording of each is constrained by what the
 * product actually knows at that moment:
 *
 * - `received` — the file is stored and on its way to a reviewer. It
 *   deliberately does not say "verified". `precheckDocument` runs in an
 *   `after()` hook and is explicitly forbidden from calling anything
 *   verified; only a person does that, later. A modal claiming otherwise
 *   would be the one screen in the product that overstates a document's
 *   standing, on the screen where that matters most.
 * - `flagged` — the automated check refused it and said why. This is the
 *   half worth having: before this, a flag appeared quietly on a row and
 *   the traveller had to notice it.
 * - `complete` — that was the last required document. A ring turns while
 *   the checklist settles, then it says what is true: everything asked
 *   for is in, and reviewers have it.
 */
export type UploadOutcome = "received" | "flagged" | "complete";

/** How long the `complete` variant spins before it says anything. */
const PROCESSING_MS = 3000;

function ProcessingRing() {
  return (
    <svg
      className="size-10 animate-spin text-brand"
      viewBox="0 0 40 40"
      role="img"
      aria-label="Finishing up"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth="4"
      />
      {/* A quarter turn of the circumference, so the gap reads as motion
          rather than as a partially filled progress ring — this is not
          measuring anything. */}
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={2 * Math.PI * 16}
        strokeDashoffset={2 * Math.PI * 16 * 0.75}
      />
    </svg>
  );
}

export function UploadOutcomeDialog({
  outcome,
  documentName,
  reason,
  onOpenChange,
  onReupload,
}: {
  /** `null` closes it. */
  outcome: UploadOutcome | null;
  documentName: string;
  /** The pre-check's own words, for the `flagged` variant. */
  reason?: string | null;
  onOpenChange: (open: boolean) => void;
  onReupload: () => void;
}) {
  /**
   * Whether the processing window has elapsed for *this* opening.
   *
   * The provider gives this component a fresh `key` per upload, so the
   * state starts false every time and needs no clearing — which is what
   * keeps it out of an effect body. It used to be a page-lifetime flag
   * on a page-level dialog, so the second completed checklist in a
   * session skipped the ring and snapped straight to the final wording.
   */
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => {
    if (outcome !== "complete") return;
    // Capped, not measured: nothing here is waiting on a request, so a
    // spinner that could run indefinitely would be theatre. Three
    // seconds is the ceiling the brief asked for, and it resolves to a
    // statement either way.
    const timer = setTimeout(() => setSettled(true), PROCESSING_MS);
    return () => clearTimeout(timer);
  }, [outcome]);

  const processing = outcome === "complete" && !settled;

  return (
    <Dialog open={outcome !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {outcome === "flagged" ? (
              <TriangleAlert
                className="mt-0.5 size-6 shrink-0 text-danger"
                aria-hidden
              />
            ) : processing ? (
              <ProcessingRing />
            ) : (
              <Check className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
            )}
            <div className="min-w-0">
              <DialogTitle>
                {outcome === "flagged"
                  ? "We cannot use this one"
                  : processing
                    ? "Finishing up"
                    : outcome === "complete"
                      ? "That is everything"
                      : "Received"}
              </DialogTitle>
              <DialogDescription>
                {outcome === "flagged" ? (
                  <>
                    {/* The checker's own reason, verbatim. A generic
                        "please upload a clearer copy" would send someone
                        back to re-photograph a document that was refused
                        for being the wrong document entirely. */}
                    {reason?.trim()
                      ? reason
                      : `We could not read your ${documentName}.`}{" "}
                    Upload a clearer copy and we will check it again.
                  </>
                ) : processing ? (
                  <>Adding your {documentName} to the file.</>
                ) : outcome === "complete" ? (
                  <>
                    Every document we asked for is in, and our reviewers have
                    them. We will tell you here and by email as soon as there is
                    an update — there is nothing else for you to do right now.
                  </>
                ) : (
                  <>
                    Your {documentName} is stored and with our reviewers. We
                    will let you know here and by email once it has been
                    checked.
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!processing && (
          <DialogFooter>
            {outcome === "flagged" ? (
              <>
                {/* "Skip for now" leaves the row flagged on the checklist
                    rather than pretending the document is done — the
                    traveller can come back to it, and the count still
                    says it is outstanding. */}
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => onOpenChange(false)}
                >
                  Skip for now
                </Button>
                <Button type="button" onClick={onReupload}>
                  <RotateCcw /> Re-upload {documentName}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Continue
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
