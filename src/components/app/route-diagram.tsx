import { ChevronRight } from "lucide-react";

import type { ApplicationFacts } from "@/lib/domain/kpis";
import { routeOf, type RouteStage } from "@/lib/domain/route";
import { DASHBOARD } from "@/lib/i18n/dashboard";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Where the traveller is on their corridor, drawn as a route.
 *
 * The signature moment of the `(app)` surface, per the wayfinding spec
 * §3: "the route diagram is where the boldness is spent… a large plate
 * carrying a headline number would have been the default treatment, so
 * it is demoted to support." The headline number was `CompletionRing`,
 * and this replaces it at the top of the dashboard.
 *
 * **It carries no `--way`.** §4.1 allows exactly one `--way` object per
 * screen and that is the next-step plate below this. A route diagram
 * saying "here is everything" in the colour reserved for "do this next"
 * would be the second yellow thing the principle exists to forbid.
 *
 * Static by design. §5 wants the diagram to advance when a stage
 * completes and explicitly not on page load — and nothing on the
 * dashboard completes a stage, so there is no honest trigger here. The
 * advance belongs with the screens that cause it.
 */
export function RouteDiagram({
  facts,
  locale,
}: {
  facts: ApplicationFacts;
  locale: Locale;
}) {
  const stages = routeOf(facts);

  return (
    <section aria-label={DASHBOARD.routeLabel[locale]}>
      <p className="t-muted">{DASHBOARD.routeLabel[locale]}</p>
      {/* An ordered list because it is one: the stages have a sequence,
          and a screen reader should say so without the arrows, which are
          decoration to it. */}
      <ol className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-0">
        {stages.map((stage, i) => (
          <li
            key={stage.key}
            className="flex items-start gap-2 sm:flex-1"
            // "step" rather than "true": this is a position in a
            // sequence, not the current page.
            aria-current={isMarked(stage) ? "step" : undefined}
          >
            {i > 0 && (
              // Hidden below `sm`, where the stack already reads as a
              // sequence top to bottom and an arrow would have to point
              // a second way. `rtl:-scale-x-100` because the arrow
              // carries direction of travel (§4.2), so it has to mirror
              // — it is the one glyph here that cannot be static.
              <ChevronRight
                aria-hidden
                className="mt-2 hidden size-4 shrink-0 text-ink-3 rtl:-scale-x-100 sm:block"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className={cn("h-1.5 w-full rounded-[2px]", fillOf(stage))} />
              <p
                className={cn(
                  "mt-2 text-[15px]",
                  isMarked(stage) ? "font-semibold text-ink" : "text-ink-2"
                )}
              >
                {labelOf(stage, locale)}
              </p>
              {isMarked(stage) && (
                <p className="t-muted mt-0.5">
                  <span aria-hidden>▲ </span>
                  {stage.state === "returned"
                    ? DASHBOARD.backHere[locale]
                    : DASHBOARD.youAreHere[locale]}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const isMarked = (stage: RouteStage) =>
  stage.state === "current" || stage.state === "returned";

/**
 * A segment is filled for a stage that has been *reached*, which is not
 * the same as the one being stood on: a traveller collecting documents
 * is marked at Documents with that segment still unfilled, because the
 * documents are not complete. The marker says where you are; the fill
 * says what is done.
 *
 * The decision segment takes its colour from the outcome, because §4.1
 * is that colour classifies and an outcome is a classification. These
 * are `--success` and `--danger`, which carry the spec's `--clear` and
 * `--stop` values — the palette kept the existing identifiers.
 */
function fillOf(stage: RouteStage): string {
  const filled = stage.state === "reached" || stage.state === "returned";

  if (stage.outcome && filled) {
    return stage.outcome === "granted" ? "bg-success" : "bg-danger";
  }
  return filled ? "bg-brand" : "bg-border";
}

function labelOf(stage: RouteStage, locale: Locale): string {
  switch (stage.key) {
    case "started":
      return DASHBOARD.stageStarted[locale];
    case "intake":
      return DASHBOARD.stageIntake[locale];
    case "collected":
      return DASHBOARD.stageCollected[locale];
    case "submitted":
      return DASHBOARD.stageSubmitted[locale];
    default:
      // The decision names itself once it has landed and stays neutral
      // until then. Naming it "Granted" while it is still unlit would
      // promise an outcome nobody has given — the same dishonesty
      // guideline §7 forbids for an unearned figure.
      if (stage.outcome === "granted") return DASHBOARD.stageGranted[locale];
      if (stage.outcome === "refused") return DASHBOARD.stageRefused[locale];
      return DASHBOARD.stageDecision[locale];
  }
}
