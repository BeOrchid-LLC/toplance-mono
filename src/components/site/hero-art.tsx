/**
 * Flight arcs, drawn inline so the page ships with no image request.
 * Anchored right so it sits behind the checklist card and never crowds
 * the headline; hidden below the lg breakpoint where the hero stacks.
 */
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 720 520"
      fill="none"
      aria-hidden
      focusable="false"
      className="pointer-events-none absolute right-0 top-1/2 hidden w-[min(58%,760px)] -translate-y-1/2 opacity-60 lg:block"
    >
      <defs>
        <linearGradient id="toplance-arc" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g stroke="url(#toplance-arc)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M40 500 Q 300 300 690 330" />
        <path d="M40 500 Q 380 340 700 120" strokeDasharray="5 8" />
        <path d="M40 500 Q 220 420 660 470" strokeDasharray="2 9" />
      </g>
      <g fill="#fff">
        <circle cx="690" cy="330" r="3.5" fillOpacity="0.8" />
        <circle cx="700" cy="120" r="3.5" fillOpacity="0.65" />
        <circle cx="660" cy="470" r="3.5" fillOpacity="0.5" />
      </g>
    </svg>
  );
}
