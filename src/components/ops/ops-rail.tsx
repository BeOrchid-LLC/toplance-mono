import { Wordmark } from "@/components/shared/wordmark";

/**
 * The name at the head of the platform console's rail, and the mark that
 * now stands in for it.
 *
 * There is no `/ops` layout — every page builds its own `AdminShell` —
 * so `railTitle="Toplance"` was typed out eight times and the wordmark
 * would have been too. One answer here, for the reason `ops-nav.ts`
 * gives about the nav it replaced: a value pasted eight times is a value
 * eventually only correct in seven.
 *
 * The consoles lost the logo on 2026-09-07, when the client's review
 * moved them off `AppBar` — which renders `Wordmark` — and onto
 * `AdminShell`, whose rail head has only ever printed text. This puts it
 * back, at the client's request on 2026-09-08.
 *
 * Scaled down from the bar's size: the rail head is 64px and carries the
 * rank subtitle under this, where the app bar had the full height to
 * itself. A collapsed rail shows neither — `AdminSidebar` swaps the whole
 * block for the initial letter of `railTitle`, which is why that prop is
 * still required beside this one.
 */
export const OPS_RAIL_TITLE = "Toplance";

export function OpsWordmark() {
  return (
    <Wordmark
      href="/ops"
      className="[&>svg:first-child]:h-7 [&_.wordmark-label]:h-[15px]"
    />
  );
}
