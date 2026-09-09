import { describe, expect, it } from "vitest";

import { attendanceIsPast, attendanceSummary, readAttendanceKind } from "./attendance";

describe("attendanceSummary", () => {
  it("names what, where and when", () => {
    const text = attendanceSummary({
      kind: "biometrics",
      when: "Tuesday 15 September, 09:30",
      place: "Sahara Travel, 4 Awolowo Road, Lagos",
    });
    expect(text).toContain("biometrics");
    expect(text).toContain("Tuesday 15 September, 09:30");
    expect(text).toContain("Awolowo Road");
  });

  it("says the time is coming rather than leaving a gap", () => {
    const text = attendanceSummary({
      kind: "interview",
      when: null,
      place: "Sahara Travel, Lagos",
    });
    expect(text).not.toContain("null");
    expect(text).not.toContain("undefined");
    expect(text.toLowerCase()).toContain("confirm");
    expect(text).toContain("Sahara Travel, Lagos");
  });

  it("tells the two appointments apart", () => {
    const bio = attendanceSummary({ kind: "biometrics", when: null, place: "X" });
    const interview = attendanceSummary({ kind: "interview", when: null, place: "X" });
    expect(bio).not.toEqual(interview);
  });
});

describe("readAttendanceKind", () => {
  it("accepts the two the enum has", () => {
    expect(readAttendanceKind("biometrics")).toBe("biometrics");
    expect(readAttendanceKind("interview")).toBe("interview");
  });

  it("refuses anything else rather than guessing", () => {
    expect(readAttendanceKind("banana")).toBeNull();
    expect(readAttendanceKind("")).toBeNull();
    expect(readAttendanceKind(undefined)).toBeNull();
  });
});

describe("attendanceIsPast", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");

  it("is not past when no time has been set", () => {
    expect(attendanceIsPast(null, now)).toBe(false);
  });

  it("is not past on the day itself", () => {
    expect(attendanceIsPast(new Date("2026-09-15T09:30:00.000Z"), now)).toBe(false);
  });

  it("is past once the day is over", () => {
    expect(attendanceIsPast(new Date("2026-09-14T09:30:00.000Z"), now)).toBe(true);
  });
});
