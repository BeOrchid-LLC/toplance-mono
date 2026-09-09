import { CalendarClock, MapPin } from "lucide-react";

import { attendanceIsPast } from "@/lib/domain/attendance";
import type { AttendanceRequest } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/locales";
import { ATTENDANCE } from "@/lib/i18n/attendance";

/**
 * "Come to this office" — the standing notice on a traveller's
 * dashboard.
 *
 * Above everything else on the page and not dismissible. Every other
 * thing this screen says is about a document; this one asks the reader
 * to be somewhere on a day, and it is the only message here whose cost
 * of being missed is a missed appointment.
 *
 * Read from `attendance_requests` rather than from the notification the
 * same event sent, because a notification stops being a good source the
 * moment somebody marks it read — a banner that vanished when the
 * traveller opened their bell would be exactly wrong.
 *
 * Renders nothing once the day has passed. An appointment with no time
 * set never expires: there is nothing to have passed, and the address
 * is still the thing the traveller needs.
 */
export function AttendanceNotice({
  request,
  locale,
  now = new Date(),
}: {
  request: AttendanceRequest | null;
  locale: Locale;
  now?: Date;
}) {
  if (!request) return null;
  if (attendanceIsPast(request.scheduledFor, now)) return null;

  const heading =
    request.kind === "biometrics"
      ? ATTENDANCE.noticeBiometrics[locale]
      : ATTENDANCE.noticeInterview[locale];

  const when = request.scheduledFor
    ? new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(
        request.scheduledFor
      )
    : null;

  return (
    <section
      // A region rather than an alert: it is standing information the
      // traveller comes back to, not something that just happened, and
      // a live region would interrupt a screen reader on every visit.
      aria-labelledby="attendance-notice-heading"
      className="mb-6 rounded-lg border border-warning bg-[color-mix(in_srgb,var(--warning)_10%,var(--mix))] p-5 sm:p-6"
    >
      <h2 id="attendance-notice-heading" className="t-h3 text-ink">
        {heading}
      </h2>
      <dl className="mt-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-warning-ink" aria-hidden />
          <div className="min-w-0">
            <dt className="t-label">{ATTENDANCE.noticeWhen[locale]}</dt>
            <dd className="t-body text-ink">
              {when ?? ATTENDANCE.noticeTimeToCome[locale]}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-warning-ink" aria-hidden />
          <div className="min-w-0">
            <dt className="t-label">{ATTENDANCE.noticeWhere[locale]}</dt>
            <dd className="t-body whitespace-pre-wrap text-ink">{request.place}</dd>
          </div>
        </div>
      </dl>
      {request.note && (
        <p className="t-body mt-4 whitespace-pre-wrap text-ink-2">{request.note}</p>
      )}
    </section>
  );
}
