import { CorridorHeader } from "@/components/app/corridor-header";
import { Shell } from "@/components/shared/shell";
import {
  getCorridorFor,
  getOrCreateApplication,
} from "@/lib/data/applications";

/**
 * The application-journey screens — dashboard, requirements, documents —
 * open with the corridor laminate. Pages outside this route group are
 * excluded by construction: `/app/agent`, because the card kept
 * appearing above the conversation the moment the final answer resolved
 * a corridor, crowning the intake chat with a summary of itself; and
 * `/app/profile`, which is about the person, not the case.
 */
export default async function CorridorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const application = await getOrCreateApplication();

  // Only fetched once intake has resolved one — before that there is
  // nothing to head the screen with, and these pages redirect to the
  // agent anyway.
  const corridor = application?.intakeComplete
    ? await getCorridorFor(application.id)
    : null;

  return (
    <>
      {application && corridor && (
        /* The ruled ground exists so the laminate has something to
           refract. Over flat `--bg` a backdrop-filter is an expensive
           way to draw nothing — the material only reads as material
           when there is a pattern bending underneath it. The utility's
           own mask fades it out, so the band ends without a seam. */
        <div className="relative isolate">
          <div
            aria-hidden
            className="security-paper pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px]"
          />
          <Shell className="pt-8">
            <CorridorHeader
              caseRef={application.caseRef}
              status={application.status}
              corridor={corridor}
            />
          </Shell>
        </div>
      )}

      {children}
    </>
  );
}
