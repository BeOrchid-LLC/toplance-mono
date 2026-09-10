import { CorridorHeader } from "@/components/app/corridor-header";
import { Shell } from "@/components/shared/shell";
import {
  getCorridorFor,
  getApplication,
} from "@/lib/data/applications";

/**
 * The application-journey screens — dashboard, requirements, documents —
 * open with the corridor header. Pages outside this route group are
 * excluded by construction: `/app/agent`, because the card kept
 * appearing above the conversation the moment the final answer resolved
 * a corridor, crowning the intake chat with a summary of itself; and
 * `/app/profile`, which is about the person, not the case.
 */
export default async function CorridorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const application = await getApplication();

  // Only fetched once intake has resolved one — before that there is
  // nothing to head the screen with, and these pages redirect to the
  // agent anyway.
  const corridor = application?.intakeComplete
    ? await getCorridorFor(application.id)
    : null;

  return (
    <>
      {application && corridor && (
        <div className="relative isolate">
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
