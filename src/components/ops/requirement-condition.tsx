"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setRequirementCondition } from "@/app/ops/actions";
import type { AppliesWhen } from "@/lib/domain/applies-when";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";

/**
 * The rule that turns "only if it applies" into "this one is yours".
 *
 * One topic and the answers it fires on, because that is the shape every
 * real conditional document has turned out to have — married applicants,
 * travelling with children, students. A rule builder that could express
 * more would mostly express mistakes, and an approver has to be able to
 * read this back and be certain what it does.
 *
 * The options come from `INTAKE_QUESTIONS` rather than a free text box,
 * so a rule can only name answers a traveller can actually give. A typed
 * rule that never matches is a document that silently never appears,
 * which is the failure this whole feature exists to prevent.
 */
export function RequirementCondition({
  requirementId,
  rule,
  editable,
}: {
  requirementId: string;
  rule: AppliesWhen | null;
  /**
   * False on a version already serving travellers. The rule is shown,
   * because an approver reading a live corridor needs to know what it
   * says; it is edited on a draft and takes effect when that is
   * approved, like every other corridor change.
   */
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  const current = rule?.[0] ?? null;
  const [answer, setAnswer] = React.useState(current?.answer ?? "");
  const [options, setOptions] = React.useState<string[]>(current?.in ?? []);

  const question = INTAKE_QUESTIONS.find((q) => q.key === answer);

  function save(clear = false) {
    const formData = new FormData();
    formData.set("requirement_id", requirementId);
    formData.set("answer", clear ? "" : answer);
    if (!clear) for (const o of options) formData.append("options", o);

    startTransition(async () => {
      const result = await setRequirementCondition(formData);

      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(clear ? "Rule cleared." : "Rule saved.");
      setOpen(false);
      router.refresh();
    });
  }

  if (!editable) {
    return current ? (
      <p className="t-muted mt-2">
        Applies when <span className="font-semibold">{current.in.join(" or ")}</span>
      </p>
    ) : (
      <p className="t-muted mt-2">
        No rule yet — travellers are asked about this one with a hedge.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {current ? (
          <Badge variant="success">
            Applies when {current.in.join(" or ")}
          </Badge>
        ) : (
          <Badge variant="warning">No rule yet</Badge>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-base font-semibold text-brand-text hover:underline"
        >
          {open ? "Cancel" : current ? "Change rule" : "Write the rule"}
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-sm border border-border-strong p-4">
          <label className="special-caps block" htmlFor={`answer-${requirementId}`}>
            Applies when the traveller answered
          </label>
          <select
            id={`answer-${requirementId}`}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              // The options belong to the topic. Keeping them across a
              // change would let a rule name an answer to a different
              // question — which parses, and never matches.
              setOptions([]);
            }}
            className="mt-2 min-h-[var(--row-h)] w-full rounded-sm border border-border-strong bg-surface px-3 text-base"
          >
            <option value="">Choose a question…</option>
            {INTAKE_QUESTIONS.map((q) => (
              <option key={q.key} value={q.key}>
                {q.prompt.en}
              </option>
            ))}
          </select>

          {question && (
            <fieldset className="mt-4">
              <legend className="special-caps">with any of these answers</legend>
              <div className="mt-2 flex flex-col gap-2">
                {question.chips.map((chip) => (
                  <label
                    key={chip.value}
                    className="flex items-center gap-3 text-base"
                  >
                    <input
                      type="checkbox"
                      checked={options.includes(chip.value)}
                      onChange={(e) =>
                        setOptions((prev) =>
                          e.target.checked
                            ? [...prev, chip.value]
                            : prev.filter((o) => o !== chip.value)
                        )
                      }
                    />
                    {chip.label.en}
                  </label>
                ))}
              </div>
              {/*
                Free text is allowed on every intake question, so a chip
                list is not the whole answer space. Said plainly rather
                than hidden: a rule matches what it names, and somebody
                who typed their own answer keeps the hedge.
              */}
              <p className="t-muted mt-3 max-w-[62ch]">
                A traveller who typed their own answer instead of tapping one of
                these is not matched by the rule, and keeps this document on
                their conditional list.
              </p>
            </fieldset>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              size="sm"
              disabled={pending || !answer || !options.length}
              onClick={() => save()}
            >
              Save rule
            </Button>
            {current && (
              <Button
                type="button"
                size="sm"
                variant="tertiary"
                disabled={pending}
                onClick={() => save(true)}
              >
                Clear the rule
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
