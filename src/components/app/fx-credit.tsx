import { FX_ATTRIBUTION } from "@/lib/fx/attribution";

/**
 * The rates credit, wherever a converted fee is on screen.
 *
 * A component rather than a string at two call sites, because the
 * obligation is what it is: the licence on the open rates endpoint is
 * free for commercial conversion only while this link is shown, so the
 * credit has to be the easy thing to add beside a `≈ ₦…` figure. One
 * import is easier than remembering the wording and the URL.
 *
 * Rendered **only when a conversion actually appears**. A credit under a
 * fee still printed in the mission's own currency would be crediting a
 * provider for a figure it had no part in — and on the screens where the
 * rate is missing, that is exactly the figure on show.
 */
export function FxCredit({ className }: { className?: string }) {
  return (
    <a
      href={FX_ATTRIBUTION.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {FX_ATTRIBUTION.label}
    </a>
  );
}
