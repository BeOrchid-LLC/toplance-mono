import { redirect } from "next/navigation";

import { AppBar, type NavItem } from "@/components/app/app-bar";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getOrCreateApplication, getProfile } from "@/lib/data/applications";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!hasSupabaseEnv) return <SetupNotice />;

  const profile = await getProfile();
  if (!profile) redirect("/sign-in?next=/app");

  const application = await getOrCreateApplication();
  const locked = !application?.intake_complete;

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
        name={profile.full_name}
        email={profile.email}
        showAgentButton
      />
      {children}
    </div>
  );
}
