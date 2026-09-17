import { cn } from "@/lib/utils";

/**
 * The count beside a console nav row, drawn as a bubble.
 *
 * One component for the three places a row's count appears — the open
 * rail, the collapsed rail (where it sits on the icon) and the mobile
 * menu — because until 2026-09-17 they were three class strings, and
 * only the collapsed one was a bubble. The open rail printed a plain
 * grey number, which is the version the client looked at and asked,
 * a second time, for the bubbles agreed on the call.
 *
 * The count is ordinary text inside the link, so the row is announced
 * as "KYB 3". Each placement hides the other with CSS (`display: none`),
 * so a screen reader never hears the figure twice.
 *
 * `min-w` equal to the height is what keeps "3" a circle and "44" a
 * short pill of the same height, rather than one bubble per digit
 * count. Zero is not drawn — see the caller.
 */
export function NavCount({
  count,
  size = "md",
  className,
}: {
  count: number;
  /** `sm` is the collapsed rail's, perched on an 18px icon. */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "num shrink-0 rounded-full bg-brand text-center font-semibold text-on-brand",
        size === "md"
          ? "min-w-5 px-1.5 text-[12px] leading-5"
          : "min-w-4 px-1 text-[11px] leading-4",
        className
      )}
    >
      {count}
    </span>
  );
}
