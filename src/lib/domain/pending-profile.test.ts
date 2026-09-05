import { describe, expect, it } from "vitest";

import {
  EMPTY_PENDING_PROFILE,
  profileColumnsFrom,
  readPendingProfile,
} from "./pending-profile";

describe("readPendingProfile", () => {
  it("reads the four fields a sign-up carries across", () => {
    expect(
      readPendingProfile({
        phone: "802 123 4567",
        countryIso: "ng",
        locale: "ha",
        orgName: "Sunway Travel",
      })
    ).toEqual({
      phone: "+2348021234567",
      countryIso: "ng",
      locale: "ha",
      orgName: "Sunway Travel",
    });
  });

  it("is empty for anything that is not an object", () => {
    for (const value of [undefined, null, "", 7, "orgName=x"]) {
      expect(readPendingProfile(value)).toEqual(EMPTY_PENDING_PROFILE);
    }
  });

  it("drops a locale this product does not ship", () => {
    // The whole point of carrying it is opening the intake in the right
    // language; a code with no translations behind it is worse than the
    // English default, which at least renders.
    //
    // `de` stands in for "some language we do not speak". It was `fr`
    // until French shipped on 2026-09-05 — if this line ever fails
    // again, the honest fix is to pick another unsupported code, not to
    // loosen the check.
    expect(readPendingProfile({ locale: "de" }).locale).toBeNull();
    expect(readPendingProfile({ locale: "yo" }).locale).toBe("yo");
    expect(readPendingProfile({ locale: "fr" }).locale).toBe("fr");
  });

  it("drops a country this product does not list", () => {
    // `countryBy` falls back to the first country rather than throwing,
    // so an unchecked read would silently write Nigeria for everyone.
    expect(readPendingProfile({ countryIso: "zz" }).countryIso).toBeNull();
  });

  it("lowercases a country code before matching it", () => {
    expect(readPendingProfile({ countryIso: "GH" }).countryIso).toBe("gh");
  });

  it("drops the phone when the country it needs is unusable", () => {
    // A number with no dial code cannot be made E.164, and a country we
    // cannot render has no business sitting beside one.
    expect(
      readPendingProfile({ phone: "802 123 4567", countryIso: "zz" })
    ).toMatchObject({ phone: null, countryIso: null });
  });

  it("drops a phone that carries no digits", () => {
    expect(readPendingProfile({ phone: "---", countryIso: "ng" }).phone).toBeNull();
  });

  it("trims, and treats whitespace as absence", () => {
    expect(readPendingProfile({ orgName: "  Sunway  " }).orgName).toBe("Sunway");
    expect(readPendingProfile({ orgName: "   " }).orgName).toBeNull();
  });

  it("ignores fields it was not asked to carry", () => {
    // Metadata is client-written, so a role smuggled into it must not
    // reach a profile row. `getActor` reads roles from Postgres only.
    const pending = readPendingProfile({ role: "staff", staffRole: "owner" });
    expect(pending).toEqual(EMPTY_PENDING_PROFILE);
    expect(Object.keys(profileColumnsFrom(pending))).toEqual([]);
  });
});

describe("profileColumnsFrom", () => {
  it("omits every null, so an insert cannot blank a column", () => {
    expect(profileColumnsFrom(EMPTY_PENDING_PROFILE)).toEqual({});
  });

  it("passes through only the profile columns, never the org name", () => {
    const columns = profileColumnsFrom({
      phone: "+2348021234567",
      countryIso: "ng",
      locale: "ig",
      orgName: "Sunway Travel",
    });
    expect(columns).toEqual({
      phone: "+2348021234567",
      countryIso: "ng",
      locale: "ig",
    });
  });
});
