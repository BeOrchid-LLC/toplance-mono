/**
 * Dial codes and national formats, with the corridors Toplance actually
 * serves pinned to the top of the picker. `mask` uses `.` for a digit.
 */
export type Country = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  mask: string;
  preferred?: boolean;
};

export const COUNTRIES: Country[] = [
  { iso: "ng", name: "Nigeria", dial: "+234", flag: "🇳🇬", mask: "... ... ....", preferred: true },
  { iso: "gh", name: "Ghana", dial: "+233", flag: "🇬🇭", mask: ".. ... ....", preferred: true },
  { iso: "ke", name: "Kenya", dial: "+254", flag: "🇰🇪", mask: "... ......", preferred: true },
  { iso: "za", name: "South Africa", dial: "+27", flag: "🇿🇦", mask: ".. ... ....", preferred: true },
  { iso: "cm", name: "Cameroon", dial: "+237", flag: "🇨🇲", mask: ". .. .. .. ..", preferred: true },
  { iso: "gb", name: "United Kingdom", dial: "+44", flag: "🇬🇧", mask: ".... ......" },
  { iso: "ca", name: "Canada", dial: "+1", flag: "🇨🇦", mask: "(...) ...-...." },
  { iso: "us", name: "United States", dial: "+1", flag: "🇺🇸", mask: "(...) ...-...." },
  { iso: "de", name: "Germany", dial: "+49", flag: "🇩🇪", mask: "... ......." },
  { iso: "ae", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪", mask: ".. ... ...." },
  { iso: "tr", name: "Türkiye", dial: "+90", flag: "🇹🇷", mask: "... ... .. .." },
  { iso: "ie", name: "Ireland", dial: "+353", flag: "🇮🇪", mask: ".. ... ...." },
  { iso: "nl", name: "Netherlands", dial: "+31", flag: "🇳🇱", mask: ".. ........" },
];

export function countryBy(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];
}

export function applyMask(digits: string, mask: string): string {
  let out = "";
  let d = 0;
  for (let i = 0; i < mask.length && d < digits.length; i++) {
    out += mask[i] === "." ? digits[d++] : mask[i];
  }
  if (d < digits.length) out += digits.slice(d);
  return out;
}

/** What the user sees in the field: dial code, then the national format. */
export function formatPhone(iso: string, digits: string): string {
  const country = countryBy(iso);
  const clean = digits.replace(/\D/g, "");
  return clean ? `${country.dial} ${applyMask(clean, country.mask)}` : country.dial;
}

/** What we store and send: E.164. */
export function toE164(iso: string, digits: string): string {
  return `${countryBy(iso).dial}${digits.replace(/\D/g, "")}`;
}

export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.iso.includes(q)
  );
}
