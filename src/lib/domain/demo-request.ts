/**
 * What a visitor typed into the landing page's "Book a demo" dialog,
 * turned into something worth storing.
 *
 * Pure on purpose: no database, no `server-only`, no Next. The form's
 * server action is a thin shell around this, which is what lets the
 * awkward part — a wall clock in one timezone becoming an instant —
 * be tested without a Postgres connection.
 */

/** Exactly what the five inputs hand over, before anything is checked. */
export type DemoRequestInput = {
  fullName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  /** The `datetime-local` value: `YYYY-MM-DDTHH:mm`, no zone attached. */
  preferredLocal: string;
  /** The IANA zone the visitor picked, e.g. `Africa/Lagos`. */
  preferredTz: string;
};

/** The same submission, checked, trimmed and resolved to an instant. */
export type DemoRequest = {
  fullName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  preferredAt: Date;
  preferredTz: string;
};

/**
 * Deliberately loose. It rules out the three things that are certainly
 * not addresses — no `@`, nothing before it, no dot in the domain — and
 * leaves the rest to the fact that a demo request nobody can reply to
 * costs only the reply. A stricter pattern rejects real addresses, and
 * this form has no confirmation step to fall back on.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** `YYYY-MM-DDTHH:mm`, with the seconds some browsers add. */
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/**
 * What the given instant's wall clock reads in `timeZone`, as the
 * milliseconds it would be if that reading were UTC. The difference
 * between this and the instant itself is the zone's offset *at that
 * instant* — which is the whole point, since an offset is not a
 * property of a zone but of a moment in one.
 */
function wallClockUtcMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const at = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  return Date.UTC(
    at("year"),
    at("month") - 1,
    at("day"),
    at("hour"),
    at("minute"),
    at("second")
  );
}

/**
 * A wall clock plus the zone it was read in, as the instant it names.
 *
 * There is no built-in for this — `new Date(string)` can only read UTC
 * or the *server's* zone, and the server's zone is not the visitor's.
 * So: guess that the clock is UTC, ask what offset the zone had at that
 * guess, and subtract it. The guess can be up to a day out, which
 * matters only when it lands on the far side of a daylight saving
 * change, so the answer is fed back in once — after which the offset
 * used is the offset in force at the instant actually returned.
 *
 * `null` rather than a throw or an Invalid Date: every caller here has
 * to tell the visitor something either way, and a null is harder to
 * carry into the database by accident.
 */
export function zonedTimeToInstant(
  local: string,
  timeZone: string
): Date | null {
  if (!LOCAL_DATETIME.test(local)) return null;

  const asIfUtc = Date.parse(`${local.length === 16 ? `${local}:00` : local}Z`);
  if (Number.isNaN(asIfUtc)) return null;

  try {
    const firstPass = asIfUtc - (wallClockUtcMs(new Date(asIfUtc), timeZone) - asIfUtc);
    const settled =
      asIfUtc - (wallClockUtcMs(new Date(firstPass), timeZone) - firstPass);
    return new Date(settled);
  } catch {
    // `Intl` throws RangeError on a zone it does not know.
    return null;
  }
}

/** Which field was wrong, in the words the visitor will read. */
const REQUIRED: Array<[keyof DemoRequestInput, string]> = [
  ["fullName", "Enter your full name."],
  ["email", "Enter your work email."],
  ["companyName", "Enter your agency or company name."],
  ["jobTitle", "Enter your job title or role."],
  ["preferredLocal", "Choose a preferred demo date and time."],
];

/**
 * Every rule the form has, in one place, returning either the row to
 * write or the one sentence to show.
 *
 * Note what is *not* here: `isWorkEmail`. The field is labelled "work
 * email" and organisation sign-up does refuse consumer mailboxes
 * (`@/lib/domain/work-email`), but this is a sales lead rather than an
 * account. A one-person agency that runs on Gmail is a customer; the
 * licence check at sign-up is where that address stops being good
 * enough, and refusing it at the demo door only loses the conversation
 * that would have explained why.
 */
export function parseDemoRequest(
  input: DemoRequestInput
): { value: DemoRequest } | { error: string } {
  for (const [field, message] of REQUIRED) {
    if (!input[field]?.trim()) return { error: message };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return { error: "That email address does not look right." };
  }

  const preferredTz = input.preferredTz.trim();
  if (!preferredTz) {
    return { error: "Choose the timezone your preferred time is in." };
  }

  const preferredAt = zonedTimeToInstant(input.preferredLocal.trim(), preferredTz);
  if (!preferredAt) {
    return { error: "That date, time and timezone could not be read." };
  }

  return {
    value: {
      fullName: input.fullName.trim(),
      email,
      companyName: input.companyName.trim(),
      jobTitle: input.jobTitle.trim(),
      preferredAt,
      preferredTz,
    },
  };
}
