import { redirect } from "next/navigation";

import { AppBar, type NavItem } from "@/components/app/app-bar";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { getOrCreateApplication, getProfile } from "@/lib/data/applications";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  if (!profile) redirect("/sign-in?next=/app");

  const application = await getOrCreateApplication();
  const locked = !application?.intakeComplete;

  const nav: NavItem[] = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/requirements", label: "Requirements", locked },
    { href: "/app/documents", label: "Documents", locked },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <AppBar
        nav={nav}
        active=""
        name={profile.fullName}
        email={profile.email}
        showAgentButton
      />
      {children}
    </div>
  );
}
