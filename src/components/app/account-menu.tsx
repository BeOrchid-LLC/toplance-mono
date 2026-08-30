"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LocaleMenu } from "@/components/shared/locale-menu";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { useClerk } from "@clerk/nextjs";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Language and appearance live in the app bar on desktop. On mobile,
 * where the bar has no room for them, they move in here so neither is
 * ever unreachable.
 */
export function AccountMenu({
  name,
  email,
  subtitle,
  avatarUrl,
  profileHref,
}: {
  name: string;
  email: string;
  subtitle?: string;
  /** A short-lived signed link to the profile photo, when one exists. */
  avatarUrl?: string | null;
  /**
   * Only the traveller surface has a profile page, so the item exists
   * only where a caller can name one — the employer and ops consoles
   * share this menu and must not link into `/app`.
   */
  profileHref?: string;
}) {
  const { signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="rounded-full">
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[280px]">
        <div className="border-b border-border px-3 pb-3 pt-2">
          <p className="t-title">{name || "Guest"}</p>
          <p className="t-muted truncate text-[16px]">{subtitle || email}</p>
        </div>

        <div className="border-b border-border py-2 md:hidden">
          <p className="special-caps px-3 py-2">Language</p>
          <div className="px-3 pb-2">
            <LocaleMenu className="w-full justify-between" />
          </div>
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-base text-ink-2">Appearance</span>
            <ThemeSwitch />
          </div>
        </div>

        <DropdownMenuSeparator className="md:hidden" />

        {profileHref && (
          <DropdownMenuItem asChild>
            <Link href={profileHref}>
              <UserRound /> Profile
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full"
          >
            <LogOut /> Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
