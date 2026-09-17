import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "@/lib/format/date";
import { LOCALES } from "@/lib/i18n/locales";

const AT = new Date("2026-09-10T10:28:00Z");

describe("formatDate", () => {
  it("writes day, short month, year in English", () => {
    expect(formatDate(AT, "en")).toBe("10\u00a0Sep\u00a02026");
  });

  it("reads in UTC by default, so a midnight-UTC date does not slip", () => {
    expect(formatDate("2026-09-10T00:00:00Z", "en")).toBe("10\u00a0Sep\u00a02026");
    expect(formatDate("2026-09-10T23:59:00Z", "en")).toBe("10\u00a0Sep\u00a02026");
  });

  it("keeps day-month-year order and Latin digits in Arabic", () => {
    const out = formatDate(AT, "ar");
    expect(out).toMatch(/^10\u00a0\S+\u00a02026$/);
    expect(out).not.toMatch(/[٠-٩]/);
  });

  it("renders every product locale without throwing", () => {
    for (const { code } of LOCALES) {
      expect(formatDate(AT, code)).toMatch(/^10\u00a0.+\u00a02026$/);
    }
  });

  it("falls back rather than throwing on a locale Intl rejects", () => {
    expect(formatDate(AT, "not a locale!")).toBe("10\u00a0Sep\u00a02026");
  });

  it("never breaks inside a date, only after the comma", () => {
    expect(formatDate(AT, "en")).not.toMatch(/ /);
    expect(formatDateTime(AT, "en", "Asia/Dubai").split(" ")).toHaveLength(2);
  });

  it("returns an empty string for an unreadable date", () => {
    expect(formatDate("nope", "en")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("writes a 24-hour time and a GMT offset", () => {
    expect(formatDateTime(AT, "en", "Asia/Dubai")).toBe("10\u00a0Sep\u00a02026, 14:28\u00a0GMT+4");
  });

  it("says plain GMT for UTC, the default", () => {
    expect(formatDateTime(AT, "en")).toBe("10\u00a0Sep\u00a02026, 10:28\u00a0GMT");
  });

  it("follows daylight saving across the boundary", () => {
    // British Summer Time ends 25 October 2026.
    expect(formatDateTime("2026-10-24T12:00:00Z", "en", "Europe/London")).toBe(
      "24\u00a0Oct\u00a02026, 13:00\u00a0GMT+1"
    );
    expect(formatDateTime("2026-10-26T12:00:00Z", "en", "Europe/London")).toBe(
      "26\u00a0Oct\u00a02026, 12:00\u00a0GMT"
    );
  });

  it("writes a half-hour offset", () => {
    expect(formatDateTime(AT, "en", "Asia/Kolkata")).toBe("10\u00a0Sep\u00a02026, 15:58\u00a0GMT+5:30");
  });

  it("writes west of Greenwich as a minus", () => {
    expect(formatDateTime(AT, "en", "America/Sao_Paulo")).toBe("10\u00a0Sep\u00a02026, 07:28\u00a0GMT-3");
  });

  it("keeps the GMT label unlocalised", () => {
    expect(formatDateTime(AT, "fr", "Asia/Dubai")).toMatch(/ 14:28\u00a0GMT\+4$/);
    expect(formatDateTime(AT, "ar", "Asia/Dubai")).toMatch(/ 14:28\u00a0GMT\+4$/);
    expect(formatDateTime(AT, "tw", "Asia/Dubai")).toBe("10\u00a0Sep\u00a02026, 14:28\u00a0GMT+4");
  });

  it("falls back to UTC on a zone the runtime does not know", () => {
    expect(formatDateTime(AT, "en", "Mars/Olympus")).toBe("10\u00a0Sep\u00a02026, 10:28\u00a0GMT");
  });
});
