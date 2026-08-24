import { redirect } from "next/navigation";

import { AppBar, type NavItem } from "@/components/app/app-bar";
import { CorridorHeader } from "@/components/app/corridor-header";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Shell } from "@/components/shared/shell";
import { hasDatabaseEnv } from "@/lib/db/client";
import {
  getCorridorFor,
  getOrCreateApplication,
  getProfile,
} from "@/lib/data/applications";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  if (!profile) redirect("/sign-in?next=/app");

  const application = await getOrCreateApplication();
  const locked = !application?.intakeComplete;

  /**
   * The corridor is only fetched once intake has resolved one. Before
   * that there is nothing to head the screen with, and `/app/agent` —
   * the route that does the resolving — is better off without a card
   * announcing that the corridor is unknown directly above the
   * conversation whose job is to find it out.
   */
  const corridor =
    application && !locked ? await getCorridorFor(application.id) : null;

  const nav: NavItem[] = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/requirements", label: "Requirements", locked },
    { href: "/app/documents", label: "Documents", locked },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={nav}
        name={profile.fullName}
        email={profile.email}
        showAgentButton
      />

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
    </div>
  );
}
