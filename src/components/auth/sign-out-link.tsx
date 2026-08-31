"use client";

import { useClerk } from "@clerk/nextjs";

/**
 * Sign out from a surface that has no account menu.
 *
 * `/go` needs it: a session whose profile row was never written has no
 * name, no email and no console to hang a menu off, and the one useful
 * thing that visitor can do is leave and come back as someone else.
 *
 * `redirectUrl` exists for the accept page, where "somewhere else" is
 * the wrong answer. A visitor signed in as the wrong account is standing
 * on an invitation that is still live for somebody — landing them back
 * on it signed out turns this from an exit into the first half of
 * accepting it properly.
 */
export function SignOutLink({
  children,
  redirectUrl = "/",
}: {
  children: React.ReactNode;
  redirectUrl?: string;
}) {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl })}
      className="mt-6 inline-block font-semibold text-brand-text hover:underline"
    >
      {children}
    </button>
  );
}
