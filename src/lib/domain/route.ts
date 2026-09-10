import { FUNNEL_STAGES, type ApplicationFacts } from "@/lib/domain/kpis";
import type { ApplicationStatus } from "@/lib/domain/status";

/**
 * Where one traveller is on their corridor, for the route diagram.
 *
 * `funnelOf` answers the same question for a room full of applications
 * and gets counts back. This answers it for one and gets a position.
 * Both read `FUNNEL_STAGES`, so the journey is defined once: add a stage
 * there and the agency funnel and the traveller's diagram both grow one.
 *
 * Returns stage **keys and states, never labels** — the labels are
 * per-locale and the traveller's differ from the console's ("Documents"
 * against "Documents complete"), so they are looked up by the component
 * and this stays free of i18n.
 */
export type RouteStageState = "reached" | "current" | "returned" | "ahead";

export type RouteStage = {
  /** A `FUNNEL_STAGES` key. */
  key: string;
  state: RouteStageState;
  /** Set on `decided` alone, and only once a decision has landed. */
  outcome?: "granted" | "refused";
};

/**
 * The stage a traveller is working on, by status.
 *
 * `draft` sits on `collected` rather than earlier because by the time a
 * status is being read here intake has resolved — the `intakeComplete`
 * rule in `routeOf` claims every case before that, and it is checked
 * first precisely because a draft application also has
 * `intakeComplete: false` and both rules would otherwise apply.
 *
 * `additional_documents` sits on `collected` too, and that is the whole
 * point of the returned state: the traveller is back among the documents
 * having already been past them.
 */
const MARKER_BY_STATUS: Record<ApplicationStatus, string> = {
  draft: "collected",
  collecting_documents: "collected",
  additional_documents: "collected",
  submitted: "submitted",
  under_review: "submitted",
  processing: "submitted",
  approved: "decided",
  rejected: "decided",
};

export function routeOf(facts: ApplicationFacts): RouteStage[] {
  const markerKey = facts.intakeComplete ? MARKER_BY_STATUS[facts.status] : "intake";
  const markerIndex = FUNNEL_STAGES.findIndex((stage) => stage.key === markerKey);

  /**
   * Lit if this stage or any later one has been reached — the same rule
   * `funnelOf` uses, and for the same reason. The stage predicates are
   * independent, so a case decided before `checklist_complete_at`
   * existed would otherwise light Sent with Documents dark, and a route
   * with a hole in it is unreadable.
   *
   * Because the stage timestamps are never cleared anywhere in this
   * codebase, this is already a high-water mark: it records where a
   * traveller has been, not where they are.
   */
  const lit = FUNNEL_STAGES.map((_, i) =>
    FUNNEL_STAGES.slice(i).some((stage) => stage.reached(facts))
  );
  const highWater = lit.lastIndexOf(true);

  return FUNNEL_STAGES.map((stage, i) => {
    const state: RouteStageState =
      i === markerIndex
        ? // Behind the high-water mark means the case came back — sent
          // back for more documents after being submitted. Computed, so
          // it needs no column of its own.
          markerIndex < highWater
          ? "returned"
          : "current"
        : lit[i]
          ? "reached"
          : "ahead";

    const outcome =
      stage.key === "decided" && facts.status === "approved"
        ? ("granted" as const)
        : stage.key === "decided" && facts.status === "rejected"
          ? ("refused" as const)
          : undefined;

    return outcome ? { key: stage.key, state, outcome } : { key: stage.key, state };
  });
}
