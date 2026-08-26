import { cn } from "@/lib/utils";

/**
 * The one page measure, from guideline §6. Every surface sits inside it,
 * so a heading on `/ops` starts on the same vertical as a heading on the
 * landing page — which is most of what makes two screens feel like one
 * product, before a single colour is involved.
 */
export function Shell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-[1240px] px-6", className)}>{children}</div>
  );
}
