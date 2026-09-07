import { describe, expect, it } from "vitest";

import { CITIES_BY_COUNTRY, citiesForCountryName } from "@/lib/domain/cities";
import { INTAKE_QUESTIONS } from "@/lib/domain/intake";
import { LOCALES } from "@/lib/i18n/locales";

const residenceCountry = INTAKE_QUESTIONS.find(
  (q) => q.key === "residence_country"
)!;

describe("the city map", () => {
  /**
   * The point of the test. The residence question offers no chips of
   * its own any more — they come from here, keyed on the country
   * answered one question earlier. A sixth country added to the
   * `residence_country` chips without a city list would not break
   * anything: it would quietly show that traveller an empty chip row,
   * which looks like a question we forgot to finish.
   */
  it("covers every country the intake offers as a residence", () => {
    const missing = residenceCountry.chips
      .map((chip) => chip.value)
      .filter((name) => citiesForCountryName(name).length === 0);

    expect(missing).toEqual([]);
  });

  it("names cities in every language the interface speaks", () => {
    for (const chips of Object.values(CITIES_BY_COUNTRY)) {
      for (const chip of chips) {
        for (const locale of LOCALES) {
          expect(chip.label[locale.code]).toBeTruthy();
        }
      }
    }
  });

  it("resolves the names the intake actually records", () => {
    // The answers rail stores the label the traveller tapped, not a
    // code, so this is the lookup `resolveChips` actually needs.
    expect(citiesForCountryName("Ghana").map((c) => c.value)).toContain(
      "Accra"
    );
    expect(citiesForCountryName("Kenya").map((c) => c.value)).toContain(
      "Nairobi"
    );
    expect(
      citiesForCountryName("South Africa").map((c) => c.value)
    ).toContain("Johannesburg");
  });

  /**
   * Empty rather than a default, for the same reason `currencyForCountry`
   * returns null rather than naira: a traveller living in Dubai offered
   * Lagos, Abuja and Kano has been asked a question about somebody else.
   * The text box still answers it.
   */
  it("offers nothing for a country it does not list", () => {
    expect(citiesForCountryName("United Arab Emirates")).toEqual([]);
    expect(citiesForCountryName("Atlantis")).toEqual([]);
    expect(citiesForCountryName(null)).toEqual([]);
    expect(citiesForCountryName(undefined)).toEqual([]);
  });
});
