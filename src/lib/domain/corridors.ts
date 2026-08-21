export type CorridorChip = { name: string; flag: string };

/**
 * The marketing surface's corridor lists. The requirements engine's
 * truth lives in the `corridors` table — this is the shop window, and
 * it is a promise applicants will hold the client to.
 */
export const CORRIDORS_LIVE: CorridorChip[] = [
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Türkiye", flag: "🇹🇷" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Netherlands", flag: "🇳🇱" },
];

export const CORRIDORS_SOON: CorridorChip[] = [
  { name: "Australia", flag: "🇦🇺" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "France", flag: "🇫🇷" },
  { name: "Portugal", flag: "🇵🇹" },
];

export const ORIGINS: CorridorChip[] = [
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Cameroon", flag: "🇨🇲" },
  { name: "South Africa", flag: "🇿🇦" },
];
