import type { Locale } from "@/lib/i18n/locales";

/**
 * The one way a table writes a date: `10 Sep 2026`, and with a time,
 * `10 Sep 2026, 14:28 GMT+4`.
 *
 * The client's review of 17 September found the KYB table writing
 * `2026-09-10`, the demo requests `Sep 10, 2026`, and the staff screen
 * `10 September 2026`, and asked for one format — "whichever takes up
 * the least space on the table while staying intuitive" — with zones
 * written as a GMT offset "since that's more universal". ISO is a
 * character shorter but reads as a machine's; day, short month, year
 * cannot be misread as month-first by anybody.
 *
 * Built from parts rather than handed to `Intl` whole, for three reasons:
 *
 * - **The order is ours, not the locale's.** `en` alone would say
 *   `Sep 10, 2026`, `en-GB` says `10 Sept 2026`, `pt` says
 *   `10 de set. de 2026`. Only the month's *name* is localised — every
 *   column of dates lines up the same way in every language.
 * - **The digits are Latin everywhere**, Arabic included, as every other
 *   number in this product is: a date is data in a table the operator
 *   compares down a column, not prose.
 * - **The zone is always `GMT±h[:mm]`.** `shortOffset` names the right
 *   offset, DST-correct for the instant, but its *label* is localised —
 *   French writes `UTC+4`, Yoruba `WAT+4`, Arabic `غرينتش+4`. So the
 *   offset is worked out from the zone's wall clock at that instant and
 *   written as the client asked.
 *
 * Neither function throws. A locale `Intl` has no data for (Twi has
 * none) resolves to the runtime default, and one it rejects outright
 * falls back to English — a date in the wrong language beats a table
 * that fails to render.
 *
 * Machine formats are not this module's business: `<time dateTime>`,
 * URLs and CSV exports stay ISO.
 */

type DateInput = Date | string | number;

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `new Intl.DateTimeFormat`, but one that cannot throw on the locale.
 * English month names come from `en-US` because `en-GB` abbreviates
 * September to "Sept".
 */
function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const tag = locale === "en" ? "en-US" : locale;
  try {
    return new Intl.DateTimeFormat(tag, { ...options, numberingSystem: "latn" });
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...options, numberingSystem: "latn" });
  }
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((p) => p.type === type)?.value ?? "";
}

function datePart(date: Date, locale: string, timeZone: string): string {
  const parts = formatter(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).formatToParts(date);
  // Non-breaking spaces: a narrow date column wrapped `17 Sep 2026` into
  // `17 Sep` over `2026`. The one allowed break is after the comma.
  return `${part(parts, "day")}\u00a0${part(parts, "month")}\u00a0${part(parts, "year")}`;
}

/**
 * The zone's offset at this instant, as `GMT+4`, `GMT+5:30`, `GMT-3` or
 * plain `GMT`.
 *
 * Worked out from the wall clock rather than read off `shortOffset`'s
 * label: that label is localised, and even in English runtimes disagree
 * on UTC itself (`GMT` in one, `GMT+0` in another) — which, in a cell
 * the server renders and the browser hydrates, is a mismatch.
 */
function offsetPart(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(date);
  const n = (type: Intl.DateTimeFormatPartTypes) => Number(part(parts, type));
  const wall = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  const instant = Math.floor(date.getTime() / 60_000) * 60_000;
  const minutes = Math.round((wall - instant) / 60_000);

  if (minutes === 0) return "GMT";
  const sign = minutes > 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;
  return `GMT${sign}${hours}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
}

/**
 * `10 Sep 2026`.
 *
 * `timeZone` defaults to UTC, which is what the ISO slices this replaced
 * read — so a date stored at midnight UTC does not slip a day for a
 * reader, or a server, east or west of Greenwich, and the server's
 * render agrees with the browser's on hydration.
 */
export function formatDate(
  value: DateInput,
  locale: Locale | string,
  timeZone = "UTC"
): string {
  const date = toDate(value);
  return date ? datePart(date, locale, timeZone) : "";
}

/**
 * `10 Sep 2026, 14:28 GMT+4` — a 24-hour clock, and the offset in force
 * at that instant in `timeZone` (UTC unless given).
 */
export function formatDateTime(
  value: DateInput,
  locale: Locale | string,
  timeZone = "UTC"
): string {
  const date = toDate(value);
  if (!date) return "";

  let zone = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    // An IANA name this runtime does not know — say so in UTC rather
    // than throw.
    zone = "UTC";
  }

  const time = formatter("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
  }).formatToParts(date);

  return `${datePart(date, locale, zone)}, ${part(time, "hour")}:${part(time, "minute")}\u00a0${offsetPart(date, zone)}`;
}
