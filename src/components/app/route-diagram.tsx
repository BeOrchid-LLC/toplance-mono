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
 * **One rail, stations on it.** The first cut drew five detached bars,
 * each taking a fifth of the page. A bar's length is the one thing a bar
 * says, and here it said nothing — five equal blocks with gaps between
 * them read as a meter that has come apart, and the wider the screen the
 * less it looked like a journey. A continuous line punctuated by
 * stations reads as a corridor at any width, which is also why this can
 * span the content column without being asked to fill it.
 *
 * **It carries no `--way`.** §4.1 allows exactly one `--way` object per
 * screen and that is the next-step plate below this. A route diagram
 * saying "here is everything" in the colour reserved for "do this next"
 * would be the second yellow thing the principle exists to forbid.
 *
 * **No chevrons.** They used to sit between every pair of bars: four
 * glyphs saying the same thing four times, and the thing they said —
 * that this is a sequence — is already carried by the rail's fill
 * running out at the station you are standing on. Direction survives
 * where it is information; it does not need repeating.
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
  const last = stages.length - 1;

  return (
    <section aria-label={DASHBOARD.routeLabel[locale]}>
      <p className="special">{DASHBOARD.routeLabel[locale]}</p>
      {/* An ordered list because it is one: the stages have a sequence,
          and a screen reader should say so. `pt-7` reserves the band the
          marker hangs in on wide screens, where it sits above its own
          station rather than under it. */}
      <ol className="mt-2 flex flex-col sm:flex-row sm:pt-7">
        {stages.map((stage, i) => (
          <li
            key={stage.key}
            className="relative flex gap-3 sm:flex-1 sm:flex-col sm:gap-0"
            // "step" rather than "true": this is a position in a
            // sequence, not the current page.
            aria-current={isMarked(stage) ? "step" : undefined}
          >
            {/* The rail. Below `sm` it runs down the start edge with the
                names beside it, which is the same line turned on its
                side rather than a second design. Logical properties
                throughout, so `ar` mirrors without a second rule.

                The end stations have no piece before and after them, so
                the first sits hard against the start of the content
                column and the last against its end. An earlier cut kept
                those pieces and merely hid them, which centred every
                station in its own fifth and left the whole diagram
                floating half a column inside the edge the plates below
                it line up on. */}
            <div className="flex w-4 flex-col items-center sm:h-3.5 sm:w-full sm:flex-row">
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    // The negative margin tucks the line under the
                    // node's box, which is wider than the small dots so
                    // that every station keeps one footprint. Without
                    // it each dot sits in a 3px hole in its own rail.
                    "h-1.5 -mb-1 w-0.5 sm:mb-0 sm:h-0.5 sm:w-auto sm:flex-1 sm:-me-1",
                    railOf(stages[i - 1], stage)
                  )}
                />
              ) : (
                // Stacked, the 2px above the node is what lines the
                // first station up with the four below it; on a wide
                // screen there is nothing before the first station at
                // all, and the rail starts at it.
                <span aria-hidden className="invisible h-1.5 -mb-1 w-0.5 sm:hidden" />
              )}
              {/* Every station takes the same 14px however big its own
                  dot is, so a small dot and the ringed one you are
                  standing on sit on the same line as their names when
                  the rail is stacked. */}
              <span className="relative flex size-3.5 shrink-0 items-center justify-center">
                <span aria-hidden className={cn("rounded-full", nodeOf(stage))} />
                {isMarked(stage) && (
                  // The pointer, aimed at the node. It hangs off the
                  // node rather than off the words above it, so it lands
                  // on the station whichever end of the rail that is.
                  <span
                    aria-hidden
                    className="absolute bottom-full start-1/2 mb-1.5 hidden size-2 bg-ink [clip-path:polygon(50%_100%,0_0,100%_0)] ltr:-translate-x-1/2 rtl:translate-x-1/2 sm:block"
                  />
                )}
              </span>
              {i < last && (
                <span
                  aria-hidden
                  className={cn(
                    "w-0.5 flex-1 -mt-1 sm:mt-0 sm:h-0.5 sm:w-auto sm:-ms-1",
                    railOf(stage, stages[i + 1])
                  )}
                />
              )}
            </div>

            {/* Start-, centre- or end-aligned to match its own station,
                which is what keeps the two end names inside the content
                column instead of hanging off it. */}
            <div className={cn("min-w-0 pb-4 sm:pb-0", alignOf(i, last))}>
              <p
                className={cn(
                  "special",
                  isMarked(stage) ? "text-ink" : "text-ink-3"
                )}
              >
                {labelOf(stage, locale)}
              </p>
              {isMarked(stage) && (
                <p
                  className={cn(
                    "special mt-0.5 text-ink",
                    // On a wide screen the marker leaves the flow and
                    // hangs over its own station, pointer down. That is
                    // where a "you are here" mark belongs on a map, and
                    // it buys back the line of text the old inline
                    // triangle cost the stage it marked.
                    "sm:absolute sm:bottom-full sm:mt-0 sm:mb-4 sm:w-max",
                    markerOf(i, last)
                  )}
                >
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

/**
 * A station's name sits over its own node, which at the two ends means
 * against the edge of the content column rather than centred on a node
 * that is no longer in the middle of anything.
 */
const alignOf = (i: number, last: number) =>
  i === 0 ? "sm:text-start" : i === last ? "sm:text-end" : "sm:text-center";

/** The marker, on the same three alignments as the name beneath it. */
const markerOf = (i: number, last: number) =>
  i === 0
    ? "sm:start-0"
    : i === last
      ? "sm:end-0"
      : "sm:start-1/2 sm:ltr:-translate-x-1/2 sm:rtl:translate-x-1/2";

const isMarked = (stage: RouteStage) =>
  stage.state === "current" || stage.state === "returned";

const isDone = (stage: RouteStage) =>
  stage.state === "reached" || stage.state === "returned";

/**
 * The line between two stations, which is lit only once the station
 * behind it is *done*. That keeps the old rule the segments encoded — a
 * traveller collecting documents stands at Documents with the line out
 * of it still dark, because the documents are not finished. The marker
 * says where you are; the rail says what is behind you.
 *
 * The last leg takes the decision's colour, because §4.1 is that colour
 * classifies and an outcome is a classification. `--success` and
 * `--danger` carry the spec's `--clear` and `--stop`; the palette kept
 * the existing identifiers.
 */
function railOf(from: RouteStage, to: RouteStage): string {
  if (!isDone(from)) return "bg-border-strong";
  if (to.outcome) return to.outcome === "granted" ? "bg-success" : "bg-danger";
  return "bg-brand";
}

/**
 * Three states a station can be in, and they are told apart by weight
 * rather than by colour alone: done is a small solid dot, the one you
 * are standing on is larger with the ground showing around it, and one
 * still ahead is an open ring. A colour-blind reader gets the position
 * from the sizes.
 *
 * The road ahead is drawn in `--border-strong` rather than `--border`.
 * A hairline is specified to clear 1.4:1 and that is the right floor for
 * a rule between rows, but this line is telling the traveller how much
 * of the journey is left — structure, which §7 holds to 3:1. At the
 * hairline value it had all but vanished on the light ground.
 */
function nodeOf(stage: RouteStage): string {
  if (stage.outcome) {
    const fill = stage.outcome === "granted" ? "bg-success" : "bg-danger";
    return cn("size-3.5 ring-4 ring-bg", fill);
  }
  if (isMarked(stage)) return "size-3.5 bg-brand ring-4 ring-bg";
  if (isDone(stage)) return "size-2 bg-brand";
  return "size-2 border-2 border-border-strong bg-bg";
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
