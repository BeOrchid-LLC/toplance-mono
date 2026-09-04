import { Badge } from "@/components/ui/badge";

/**
 * Whether a checklist row is one the traveller must produce, or one that
 * applies only to some people.
 *
 * Marked on every row, both ways round. Optional used to be the only
 * half that said anything and required was signalled by absence, which
 * reads as "not labelled yet" rather than "you must bring this" — and
 * made the completion ring impossible to reconcile with the list under
 * it, because the ring counts required documents only and says so
 * nowhere.
 *
 * `neutral` and `outline` are deliberately the two variants carrying no
 * semantic colour: this pill sits beside a `DocStateBadge`, and a
 * requirement is not a state. Those same two variants do encode "In
 * progress" and "Not started" on a status pill, so the state badge is
 * rendered first and both labels here are written out in full — colour
 * distinguishes nothing on its own, the rule `badge.tsx` and the
 * `DocumentRow` comment both cite.
 */
export function RequirementBadge({ required }: { required: boolean }) {
  return required ? (
    <Badge variant="neutral">Required</Badge>
  ) : (
    <Badge variant="outline">Optional</Badge>
  );
}
