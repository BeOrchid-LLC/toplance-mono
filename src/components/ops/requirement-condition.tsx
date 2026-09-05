"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setRequirementCondition } from "@/app/ops/actions";
import type { AppliesWhen } from "@/lib/domain/applies-when";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import { useT } from "@/components/locale-provider";
import { OPS_REQUIREMENT_CONDITION } from "@/lib/i18n/ops-corridor-review";
import { OPS_COMMON } from "@/lib/i18n/ops-common";

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
  const t = useT();
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

      toast.success(
        clear
          ? t(OPS_REQUIREMENT_CONDITION.toastCleared)
          : t(OPS_REQUIREMENT_CONDITION.toastSaved)
      );
      setOpen(false);
      router.refresh();
    });
  }

  // `current.in` names the traveller's own answer tokens verbatim (see
  // `@/lib/domain/intake.ts`'s `chip.value`), stored for matching and
  // never translated — only the joining word is.
  if (!editable) {
    return current ? (
      <p className="t-muted mt-2">
        {t(OPS_REQUIREMENT_CONDITION.appliesWhen)}{" "}
        <span className="font-semibold">
          {current.in.join(` ${t(OPS_REQUIREMENT_CONDITION.orWord)} `)}
        </span>
      </p>
    ) : (
      <p className="t-muted mt-2">{t(OPS_REQUIREMENT_CONDITION.noRuleReadOnly)}</p>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {current ? (
          <Badge variant="success">
            {t(OPS_REQUIREMENT_CONDITION.appliesWhen)}{" "}
            {current.in.join(` ${t(OPS_REQUIREMENT_CONDITION.orWord)} `)}
          </Badge>
        ) : (
          <Badge variant="warning">{t(OPS_REQUIREMENT_CONDITION.noRuleBadge)}</Badge>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-base font-semibold text-brand-text hover:underline"
        >
          {open
            ? t(OPS_COMMON.cancel)
            : current
              ? t(OPS_REQUIREMENT_CONDITION.changeRule)
              : t(OPS_REQUIREMENT_CONDITION.writeTheRule)}
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-sm border border-border-strong p-4">
          <label className="special-caps block" htmlFor={`answer-${requirementId}`}>
            {t(OPS_REQUIREMENT_CONDITION.appliesWhenAnswered)}
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
            <option value="">{t(OPS_REQUIREMENT_CONDITION.chooseQuestion)}</option>
            {INTAKE_QUESTIONS.map((q) => (
              <option key={q.key} value={q.key}>
                {t(q.prompt)}
              </option>
            ))}
          </select>

          {question && (
            <fieldset className="mt-4">
              <legend className="special-caps">
                {t(OPS_REQUIREMENT_CONDITION.withAnyOfTheseAnswers)}
              </legend>
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
                    {t(chip.label)}
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
                {t(OPS_REQUIREMENT_CONDITION.freeTextNotice)}
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
              {t(OPS_REQUIREMENT_CONDITION.saveRule)}
            </Button>
            {current && (
              <Button
                type="button"
                size="sm"
                variant="tertiary"
                disabled={pending}
                onClick={() => save(true)}
              >
                {t(OPS_REQUIREMENT_CONDITION.clearRule)}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
