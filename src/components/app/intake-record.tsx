"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { MrzBand } from "@/components/shared/mrz-band";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import { iso3 } from "@/lib/domain/corridors";
import { cn } from "@/lib/utils";

type Answers = Record<string, string>;

/**
 * The label each topic is filed under. UI copy, not domain: the record
 * reads "Living in" where the question asks "where are you living right
 * now?", and the checklist downstream is keyed on `q.key` either way.
 */
export const LABELS: Record<string, string> = {
  nationality: "Nationality",
  residence: "Living in",
  destination: "Destination",
  purpose: "Purpose",
  dates: "Travel dates",
  budget: "Budget",
  accommodation: "Accommodation",
  companions: "Travel party",
  needs: "Food & support",
  history: "Visa history",
};

/**
 * The code the band resolves to, built from however much of the corridor
 * is known. `mrz()` in the domain takes all three at once and pads the
 * gaps with the country slice of an empty string, which prints
 * `TPL<<<<<` before anyone has answered anything — a real-looking code
 * for a corridor nobody has stated.
 *
 * Built up a segment at a time instead, so the band is `TPL` on arrival
 * and grows by one field as each of the three answers lands. `MrzBand`
 * is keyed on the string, so every growth re-runs its resolve — the
 * corridor assembling itself is the same gesture the finished header
 * makes on `/app/requirements`, three questions earlier.
 */
function recordMrz(answers: Answers): string {
  let code = "TPL";
  if (!answers.nationality) return code;
  code += `<${iso3(answers.nationality)}`;
  if (!answers.destination) return code;
  code += `<<${iso3(answers.destination)}`;
  if (!answers.purpose) return code;
  return `${code}<<${answers.purpose.toUpperCase()}`;
}

/**
 * The record the conversation is filling in, as the page's subject
 * rather than as a summary beside it.
 *
 * A passport data page is the honest model: a fixed set of fields in a
 * fixed order, printed whether or not they are filled, under a
 * machine-readable band. That fixity is the point — ten labelled fields
 * are the same amount of structure on an empty intake as on a finished
 * one, so the opening screen has something to be instead of an empty
 * transcript waiting to become something.
 *
 * The agent asks from the dock below. This never scrolls out from under
 * it: the document owns the space above, and keeps whichever field is
 * being asked about in view.
 */
export function RecordDocument({
  answers,
  frontier,
  done,
  reopenedKey,
  reopenedPrevious,
  onEdit,
  editDisabled,
}: {
  answers: Answers;
  /** Index of the question being asked — see `intakeFrontier`. */
  frontier: number;
  done: boolean;
  /** The topic reopened for correction, being re-asked in the dock. */
  reopenedKey?: string;
  /** What it used to say, struck through while the replacement is asked. */
  reopenedPrevious?: string;
  onEdit?: (key: string) => void;
  /** Shown but inert — reopening is something to say, not tap, mid-call. */
  editDisabled?: boolean;
}) {
  const asking = React.useRef<HTMLDivElement>(null);
  const answered = INTAKE_QUESTIONS.filter((q) => answers[q.key]).length;

  // The document's equivalent of a transcript scrolling to its newest
  // line. `nearest` rather than `center`: the field is usually already
  // on screen, and pulling it to the middle of the card on every answer
  // would move nine settled fields to reposition one.
  React.useEffect(() => {
    asking.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [frontier, reopenedKey]);

  return (
    <div className="ovi-edge mx-auto w-full max-w-[720px] rounded-[var(--radius-lg)] bg-surface px-5 py-4 shadow-[var(--shadow-lg)] sm:px-7 sm:py-5">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <p className="special-caps truncate">Traveller record</p>
        {/* Two readings of one fact, as the tick meter used to carry.
            Sighted, "3 / 10" sits over ten fields that say what it
            counts; read aloud it could be anything, so the spoken
            version names the question being asked. The e2e journey
            reads this string.

            Deliberately not "Profile complete" when done: the bar below
            says exactly that, and two elements carrying the same phrase
            made a screen reader announce it twice — and left the
            journey's `getByText("Profile complete")` matching a 1px
            `sr-only` span as readily as the heading it meant. */}
        <p className="num special shrink-0 text-ink-2">
          <span className="sr-only">
            {done
              ? `All ${INTAKE_QUESTIONS.length} questions answered`
              : `Question ${frontier + 1} of ${INTAKE_QUESTIONS.length}`}
          </span>
          <span aria-hidden>
            {done
              ? "Complete"
              : `${answered} / ${INTAKE_QUESTIONS.length} complete`}
          </span>
        </p>
      </div>

      {/* Two columns where there is width for them, one where there is
          not. A phone gets the same ten fields in the same order and
          scrolls them under a pinned dock — the layout narrows, the
          document does not become a different object. */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-7">
        {INTAKE_QUESTIONS.map((q, i) => (
          <RecordField
            key={q.key}
            ref={i === frontier ? asking : undefined}
            label={LABELS[q.key]}
            value={answers[q.key]}
            asking={i === frontier}
            reopened={reopenedKey === q.key}
            previous={reopenedKey === q.key ? reopenedPrevious : undefined}
            edit={
              onEdit && answers[q.key] ? (
                <EditButton
                  label={LABELS[q.key]}
                  disabled={editDisabled}
                  onClick={() => onEdit(q.key)}
                />
              ) : null
            }
          />
        ))}
      </dl>

      {/* The band a passport prints under the same fields. It resolves
          as the corridor does — `TPL` on arrival, `TPL<NGA<<GBR<<WORK`
          by the fourth answer — and is the same object the corridor
          header draws once the checklist exists. */}
      <div className="mt-4 border-t border-border pt-3.5">
        <MrzBand code={recordMrz(answers)} />
      </div>
    </div>
  );
}

/**
 * One field of the record. The label sits above the value rather than
 * opposite it: half these answers are phrases — "Partner and children",
 * "A medical condition" — and a label-left/value-right row forces those
 * to wrap into a ragged right-aligned column two words wide.
 */
function RecordField({
  ref,
  label,
  value,
  asking,
  reopened,
  previous,
  edit,
}: {
  /** Set on the field being asked, so the document can keep it in view. */
  ref?: React.Ref<HTMLDivElement>;
  label: string;
  value?: string;
  asking: boolean;
  reopened: boolean;
  previous?: string;
  edit: React.ReactNode;
}) {
  // The wash fires on the render the answer first appears in, and only
  // then — a field that was already filled when the page loaded has not
  // just been answered, and animating it would be inventing an event.
  //
  // Adjusting state during render rather than in an effect, which is the
  // supported way to derive from a changed prop: the field paints filled
  // and washing in one pass. An effect would paint it filled and unwashed
  // first, and the wash would arrive a frame late as a flicker.
  const [prev, setPrev] = React.useState(value);
  const [landed, setLanded] = React.useState(false);
  if (value !== prev) {
    setPrev(value);
    // Only filling counts. Clearing one on an edit takes the class off
    // again, which is what lets the wash replay when it is re-answered —
    // a CSS animation only restarts if its class actually leaves.
    setLanded(Boolean(value) && !prev);
  }

  return (
    <div
      ref={ref}
      className={cn(
        "group/row -mx-2 rounded-sm border-b border-border px-2 py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0",
        landed && "intake-settle",
        // The correction's own marker. A left rule rather than a tint:
        // the field still holds a real answer until the replacement
        // lands, and washing it in a colour would say it had been
        // cleared when it has not.
        reopened && "-ml-3 rounded-l-none border-l-2 border-l-brand-accent pl-3"
      )}
    >
      <dt className={cn("special", (asking || reopened) && "text-brand-text")}>
        {label}
      </dt>
      <dd className="mt-0.5 flex min-h-[22px] items-start justify-between gap-2">
        <span className="min-w-0">
          {reopened ? (
            <>
              <span className="t-title flex items-center gap-2 text-brand-text">
                <span className="intake-pulse size-1.5 shrink-0 rounded-full bg-brand-accent" />
                Asking again
              </span>
              {previous && (
                <span className="mt-0.5 block break-words text-base text-ink-3 line-through">
                  {previous}
                </span>
              )}
            </>
          ) : value ? (
            <span className="t-title break-words text-ink">{value}</span>
          ) : asking ? (
            <span className="t-title flex items-center gap-2 text-brand-text">
              <span className="intake-pulse size-1.5 shrink-0 rounded-full bg-brand" />
              Asking now
            </span>
          ) : (
            /* A ruled line across the whole field, not a 56px stub. This
               is a record being filled in, and a blank line is what an
               unfilled record looks like. It also holds the field to the
               same height as a filled one, so the grid stops looking
               ragged. */
            <span
              aria-label="Not answered yet"
              className="mt-2.5 block h-0 w-full border-b border-dashed border-border-strong"
            />
          )}
        </span>
        {edit}
      </dd>
    </div>
  );
}

export function EditButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Edit your answer to: ${label}`}
      title={
        disabled
          ? "Say what it should be instead — the agent is listening"
          : "Edit this answer"
      }
      className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 opacity-0 transition-[color,background,opacity] duration-[var(--dur-tap)] hover:bg-surface-2 hover:text-ink focus-visible:opacity-100 group-hover/row:opacity-100 disabled:pointer-events-none disabled:opacity-40 max-lg:opacity-100"
    >
      <RotateCcw className="size-4" />
    </button>
  );
}
