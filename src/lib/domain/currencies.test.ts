import { describe, expect, it } from "vitest";

import {
  CURRENCY_BY_COUNTRY,
  currencyForCountry,
  currencyForCountryName,
  listedCountryCodes,
} from "@/lib/domain/currencies";

describe("the currency map", () => {
  it("covers every country this product lists", () => {
    // The point of the test. A destination added to `DESTINATION_ISO`
    // without a currency here would not break anything — it would
    // quietly stop showing the local equivalent for everyone living
    // there, which is the kind of gap nobody reports.
    const missing = listedCountryCodes().filter(
      (code) => !CURRENCY_BY_COUNTRY[code]
    );

    expect(missing).toEqual([]);
  });

  it("uses ISO 4217 codes", () => {
    for (const code of Object.values(CURRENCY_BY_COUNTRY)) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("keeps the two CFA francs apart", () => {
    // Pegged at the same rate, and not the same money: a note printed
    // for Douala is not legal tender in Dakar.
    expect(currencyForCountry("sn")).toBe("XOF");
    expect(currencyForCountry("cm")).toBe("XAF");
  });

  it("is null for a country this product does not list", () => {
    // Not a default. Showing a Kenyan an approximation in naira because
    // naira is our busiest currency is worse than showing nothing.
    expect(currencyForCountry("aq")).toBeNull();
    expect(currencyForCountry(null)).toBeNull();
    expect(currencyForCountryName("Atlantis")).toBeNull();
  });

  it("resolves the names the intake actually records", () => {
    // The answers rail stores the label, not the code.
    expect(currencyForCountryName("Nigeria")).toBe("NGN");
    expect(currencyForCountryName("United Kingdom")).toBe("GBP");
    expect(currencyForCountryName("South Africa")).toBe("ZAR");
  });
});
