import { describe, expect, it } from "vitest";

import { nationalDigits, phoneProblem } from "@/lib/domain/phone";

describe("nationalDigits", () => {
  it("keeps a plain national number", () => {
    expect(nationalDigits("ng", "8031234567")).toBe("8031234567");
  });

  it("drops the trunk zero people actually type", () => {
    // A Nigerian writes their own number "0803 123 4567". Kept, it makes
    // +2340803123456 — a number that does not exist.
    expect(nationalDigits("ng", "08031234567")).toBe("8031234567");
  });

  it("drops a dial code typed in front of the national number", () => {
    expect(nationalDigits("ng", "2348031234567")).toBe("8031234567");
  });

  it("drops a dial code and a trunk zero together", () => {
    expect(nationalDigits("ng", "23408031234567")).toBe("8031234567");
  });

  it("strips everything that is not a digit", () => {
    expect(nationalDigits("ng", "+234 (0)803-123 4567")).toBe("8031234567");
  });

  it("does not mistake a leading 2 for the start of a dial code", () => {
    // Ghana's dial code is 233; "2331234" is a plausible national number
    // in a country whose numbers can start with 2, so only strip when
    // what remains is still long enough to be a number.
    expect(nationalDigits("gh", "233123456")).toBe("233123456");
  });

  it("returns empty for nothing", () => {
    expect(nationalDigits("ng", "")).toBe("");
    expect(nationalDigits("ng", "   ")).toBe("");
  });
});

describe("phoneProblem", () => {
  it("accepts a well-formed number", () => {
    expect(phoneProblem("ng", "8031234567")).toBeNull();
  });

  it("accepts one typed with a trunk zero", () => {
    expect(phoneProblem("ng", "08031234567")).toBeNull();
  });

  it("lets an empty field pass where the number is optional", () => {
    // Sign-up sends the phone only when there is one, so an empty field
    // must not be a fault — see the note in `phoneProblem`.
    expect(phoneProblem("ng", "")).toBeNull();
  });

  it("asks for a number when the field is required", () => {
    expect(phoneProblem("ng", "", { required: true })).toEqual({
      kind: "required",
    });
  });

  it("refuses a half-typed number even where the field is optional", () => {
    expect(phoneProblem("ng", "803")).toEqual({
      kind: "length",
      country: "Nigeria",
      expected: 10,
      actual: 3,
    });
  });

  it("refuses a number that is too long", () => {
    expect(phoneProblem("ng", "80312345678901")).toEqual({
      kind: "length",
      country: "Nigeria",
      expected: 10,
      actual: 14,
    });
  });

  it("counts the expected length from the country, not from Nigeria", () => {
    // Ghana is 9, so a 10-digit number is wrong there and right next door.
    expect(phoneProblem("gh", "241234567")).toBeNull();
    expect(phoneProblem("gh", "2412345678")).toEqual({
      kind: "length",
      country: "Ghana",
      expected: 9,
      actual: 10,
    });
  });

  it("falls back to the first country for an iso it does not know", () => {
    // `countryBy` answers Nigeria for anything unrecognised, so this
    // pins that behaviour rather than pretending the lookup can fail:
    // an unknown iso is judged by Nigeria's rules, not waved through.
    expect(phoneProblem("zz", "8031234567")).toBeNull();
    expect(phoneProblem("zz", "803")).toEqual({
      kind: "length",
      country: "Nigeria",
      expected: 10,
      actual: 3,
    });
  });

  it("names the country so the sentence can be built in any locale", () => {
    // The domain module returns facts, never English — `PhoneField`
    // owns the sentence because the sentence has ten translations.
    const problem = phoneProblem("gh", "24");
    expect(problem).not.toBeNull();
    expect(typeof problem).toBe("object");
    expect(JSON.stringify(problem)).not.toMatch(/digits/i);
  });
});
