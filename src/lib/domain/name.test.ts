import { describe, expect, it } from "vitest";

import { splitFullName } from "@/lib/domain/name";

/**
 * The sign-up form asks for one passport-style full name; Clerk stores
 * two fields. Clerk renders them back as `firstName + " " + lastName`,
 * so the split must round-trip: first word to firstName, everything
 * else — however many words — to lastName.
 */
describe("splitFullName", () => {
  it("splits a two-word name", () => {
    expect(splitFullName("Zohid Toshpulatov")).toEqual({
      firstName: "Zohid",
      lastName: "Toshpulatov",
    });
  });

  it("keeps a multi-part surname together", () => {
    expect(splitFullName("Ana Maria da Silva")).toEqual({
      firstName: "Ana",
      lastName: "Maria da Silva",
    });
  });

  it("puts a single word in firstName alone", () => {
    expect(splitFullName("Madonna")).toEqual({
      firstName: "Madonna",
      lastName: undefined,
    });
  });

  it("ignores stray whitespace", () => {
    expect(splitFullName("  Zohid   Toshpulatov ")).toEqual({
      firstName: "Zohid",
      lastName: "Toshpulatov",
    });
  });

  it("returns nothing for an empty or blank name", () => {
    expect(splitFullName("")).toEqual({
      firstName: undefined,
      lastName: undefined,
    });
    expect(splitFullName("   ")).toEqual({
      firstName: undefined,
      lastName: undefined,
    });
  });
});
