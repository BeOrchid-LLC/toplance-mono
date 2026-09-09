import { describe, expect, it } from "vitest";

import { HONEYPOT_FIELD, isAutofillMagnet, parseDemoRequest, zonedTimeToInstant } from "./demo-request";

/** A submission with nothing wrong with it, to vary one field at a time. */
const VALID = {
  fullName: "Bola Adeyemi",
  email: "bola@sunwaytravel.ng",
  companyName: "Sunway Travel",
  jobTitle: "Operations Lead",
  preferredLocal: "2026-09-15T14:00",
  preferredTz: "Africa/Lagos",
};

describe("zonedTimeToInstant", () => {
  it("reads a wall clock in the zone it was named in", () => {
    // Lagos is UTC+1 all year — WAT has no daylight saving.
    expect(zonedTimeToInstant("2026-09-15T14:00", "Africa/Lagos")).toEqual(
      new Date("2026-09-15T13:00:00Z")
    );
  });

  it("is the identity in UTC", () => {
    expect(zonedTimeToInstant("2026-09-15T14:00", "UTC")).toEqual(
      new Date("2026-09-15T14:00:00Z")
    );
  });

  /**
   * The case a naive fixed-offset implementation gets wrong. British
   * summer time starts on 29 March 2026, so the same wall clock is a
   * different instant on either side of that Sunday — an hour apart.
   */
  it("follows a daylight saving change rather than one fixed offset", () => {
    expect(zonedTimeToInstant("2026-03-28T12:00", "Europe/London")).toEqual(
      new Date("2026-03-28T12:00:00Z")
    );
    expect(zonedTimeToInstant("2026-03-30T12:00", "Europe/London")).toEqual(
      new Date("2026-03-30T11:00:00Z")
    );
  });

  it("handles a zone west of UTC, where the instant is later than the clock", () => {
    expect(zonedTimeToInstant("2026-09-15T09:00", "America/New_York")).toEqual(
      new Date("2026-09-15T13:00:00Z")
    );
  });

  it("crosses midnight without landing on the wrong day", () => {
    expect(zonedTimeToInstant("2026-09-15T00:30", "Africa/Lagos")).toEqual(
      new Date("2026-09-14T23:30:00Z")
    );
  });

  it("is null for a zone Intl does not know", () => {
    expect(zonedTimeToInstant("2026-09-15T14:00", "Mars/Olympus")).toBeNull();
  });

  it("is null for a local time that is not a local time", () => {
    expect(zonedTimeToInstant("next tuesday", "Africa/Lagos")).toBeNull();
  });
});

describe("parseDemoRequest", () => {
  it("accepts a complete submission", () => {
    const result = parseDemoRequest(VALID);
    expect(result).toEqual({
      value: {
        fullName: "Bola Adeyemi",
        email: "bola@sunwaytravel.ng",
        companyName: "Sunway Travel",
        jobTitle: "Operations Lead",
        preferredAt: new Date("2026-09-15T13:00:00Z"),
        preferredTz: "Africa/Lagos",
      },
    });
  });

  it("refuses each of the five fields when it is blank", () => {
    const blankable = [
      "fullName",
      "email",
      "companyName",
      "jobTitle",
      "preferredLocal",
    ] as const;

    for (const field of blankable) {
      const result = parseDemoRequest({ ...VALID, [field]: "   " });
      expect(result, `${field} should be required`).toHaveProperty("error");
    }
  });

  it("names the field it is refusing, so the form is not a guessing game", () => {
    const result = parseDemoRequest({ ...VALID, companyName: "" });
    expect("error" in result && result.error).toMatch(/company/i);
  });

  it("trims the fields it keeps", () => {
    const result = parseDemoRequest({
      ...VALID,
      fullName: "  Bola Adeyemi  ",
      companyName: "\tSunway Travel\n",
    });
    expect("value" in result && result.value.fullName).toBe("Bola Adeyemi");
    expect("value" in result && result.value.companyName).toBe("Sunway Travel");
  });

  it("lowercases the address, so one person is one lead", () => {
    const result = parseDemoRequest({ ...VALID, email: "Bola@SunwayTravel.NG" });
    expect("value" in result && result.value.email).toBe(
      "bola@sunwaytravel.ng"
    );
  });

  it("refuses an address that is not one", () => {
    for (const email of ["bola", "bola@", "@sunwaytravel.ng", "bola@ng"]) {
      const result = parseDemoRequest({ ...VALID, email });
      expect(result, `${email} should be refused`).toHaveProperty("error");
    }
  });

  /**
   * The label says "work email", but a one-person agency in Lagos really
   * does run on Gmail. The address is a lead, not an account — the
   * licence check at `/employer/sign-up` is where `isWorkEmail` belongs.
   */
  it("accepts a consumer mailbox, unlike organisation sign-up", () => {
    const result = parseDemoRequest({ ...VALID, email: "bola@gmail.com" });
    expect(result).toHaveProperty("value");
  });

  it("refuses a timezone Intl does not know", () => {
    const result = parseDemoRequest({ ...VALID, preferredTz: "Mars/Olympus" });
    expect(result).toHaveProperty("error");
  });

  it("refuses a blank timezone rather than quietly assuming UTC", () => {
    const result = parseDemoRequest({ ...VALID, preferredTz: "" });
    expect(result).toHaveProperty("error");
  });
});

/**
 * The regression this file exists to prevent, from 2026-09-09.
 *
 * The honeypot was named `website`. Chrome autofilled it with a real
 * visitor's email address, the action read a filled honeypot as a bot,
 * and the lead was silently discarded while the visitor was shown a
 * confirmation. Renaming it back would reintroduce that exactly, and
 * nothing else in the codebase would notice — the whole failure is
 * invisible by design, because a honeypot that announces itself is not
 * a honeypot.
 */
describe("the honeypot field name", () => {
  it("is not a name browsers autofill", () => {
    expect(isAutofillMagnet(HONEYPOT_FIELD)).toBe(false);
  });

  it("recognises the name that caused the bug", () => {
    expect(isAutofillMagnet("website")).toBe(true);
  });

  it("recognises the form's real fields, which are meant to be filled", () => {
    for (const real of ["full_name", "email", "company_name", "job_title"]) {
      expect(isAutofillMagnet(real)).toBe(true);
    }
  });

  it("matches on a token anywhere in the name, the way the heuristics do", () => {
    expect(isAutofillMagnet("your_company_here")).toBe(true);
    expect(isAutofillMagnet("HOMEPAGE")).toBe(true);
  });

  it("leaves a genuinely meaningless name alone", () => {
    expect(isAutofillMagnet("tpl_hp")).toBe(false);
    expect(isAutofillMagnet("xq7")).toBe(false);
  });
});
