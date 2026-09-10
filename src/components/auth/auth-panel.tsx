import { cn } from "@/lib/utils";

/**
 * The one plate on an auth screen.
 *
 * A sign-up form is the first page of the record a traveller is about to
 * build, so it earns a surface of its own in a way a settings screen
 * would not. The guideline caps signature moments at one per screen, at
 * the top, and this is that one.
 *
 * There is deliberately no MRZ band. The mark carries a corridor, and at
 * sign-up no corridor has been chosen — the landing page keeps that
 * choice out of the URL and out of storage on purpose. Printing one here
 * would mean inventing a destination for someone who has not picked one.
 *
 * The eyebrow says which door this is. Four routes share one form, and
 * "Sign in" alone does not tell an operations user they are on the staff
 * entrance rather than the traveller one.
 */
export function AuthPanel({
  eyebrow,
  className,
  children,
}: {
  eyebrow: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-surface", className)}>
      <div className="relative z-[1] p-6 sm:p-8">
        <p className="tag">{eyebrow}</p>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
