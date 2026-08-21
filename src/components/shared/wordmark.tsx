import Link from "next/link";
import { Send } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Placeholder mark. The client is supplying the real logo — swap the
 * icon here and nothing else needs to change.
 */
export function Wordmark({
  href = "/",
  className,
  onBrand = false,
}: {
  href?: string;
  className?: string;
  onBrand?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Toplance home"
      className={cn("inline-flex shrink-0 items-center gap-3", className)}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-sm",
          onBrand ? "bg-white/20 text-white" : "bg-brand text-on-brand"
        )}
      >
        <Send className="size-5" />
      </span>
      <span className="wordmark-label t-title">Toplance</span>
    </Link>
  );
}
