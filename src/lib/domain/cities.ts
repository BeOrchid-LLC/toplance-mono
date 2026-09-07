import { NATIONALITY_ISO } from "@/lib/domain/corridors";
import type { Locale } from "@/lib/i18n/locales";

/**
 * A residence chip, in every language the interface speaks.
 *
 * Structurally the same as `IntakeQuestion["chips"][number]` and
 * deliberately declared here rather than imported: `intake.ts` reads
 * this module to fill its residence question, and importing back the
 * other way would close the loop.
 */
type Chip = { value: string; label: Record<Locale, string> };

const c = (value: string, label: Record<Locale, string>): Chip => ({
  value,
  label,
});

/**
 * A short list of cities per country, offered as a shortcut on the
 * residence question.
 *
 * Keyed on the same lowercase ISO-3166 alpha-2 codes as
 * `CURRENCY_BY_COUNTRY`, and covering the countries the intake offers as
 * a residence — asserted in `cities.test.ts`, so a sixth country added
 * to that question without a list here is a red test rather than an
 * empty chip row on a traveller's screen.
 *
 * On the translations: a Ghanaian city has no Yoruba exonym, and
 * inventing one would be worse than leaving the name as its own. So the
 * Latin-script locales carry the endonym except where a real exonym
 * exists and is what a reader of that language would look for — Cape
 * Town is `Le Cap` in French and `Cidade do Cabo` in Portuguese. Arabic
 * is transliterated throughout, because the script leaves no choice.
 *
 * NEEDS NATIVE REVIEW before launch, on the same terms as the rest of
 * the non-English intake copy.
 */
export const CITIES_BY_COUNTRY: Record<string, Chip[]> = {
  ng: [
    c("Lagos", { en: "Lagos", ha: "Legas", yo: "Èkó", ig: "Lagos", fr: "Lagos", pt: "Lagos", sw: "Lagos", ar: "لاغوس" }),
    c("Abuja", { en: "Abuja", ha: "Abuja", yo: "Àbùjá", ig: "Abuja", fr: "Abuja", pt: "Abuja", sw: "Abuja", ar: "أبوجا" }),
    c("Port Harcourt", { en: "Port Harcourt", ha: "Fatakwal", yo: "Pọ́ọ̀tì Hákọ́tì", ig: "Pọtakọt", fr: "Port Harcourt", pt: "Port Harcourt", sw: "Port Harcourt", ar: "بورت هاركورت" }),
    c("Kano", { en: "Kano", ha: "Kano", yo: "Kánò", ig: "Kano", fr: "Kano", pt: "Kano", sw: "Kano", ar: "كانو" }),
    c("Ibadan", { en: "Ibadan", ha: "Ibadan", yo: "Ìbàdàn", ig: "Ibadan", fr: "Ibadan", pt: "Ibadan", sw: "Ibadan", ar: "إيبادان" }),
  ],
  gh: [
    c("Accra", { en: "Accra", ha: "Accra", yo: "Accra", ig: "Accra", fr: "Accra", pt: "Acra", sw: "Accra", ar: "أكرا" }),
    c("Kumasi", { en: "Kumasi", ha: "Kumasi", yo: "Kumasi", ig: "Kumasi", fr: "Kumasi", pt: "Kumasi", sw: "Kumasi", ar: "كوماسي" }),
    c("Takoradi", { en: "Takoradi", ha: "Takoradi", yo: "Takoradi", ig: "Takoradi", fr: "Takoradi", pt: "Takoradi", sw: "Takoradi", ar: "تاكورادي" }),
    c("Tamale", { en: "Tamale", ha: "Tamale", yo: "Tamale", ig: "Tamale", fr: "Tamale", pt: "Tamale", sw: "Tamale", ar: "تامالي" }),
    c("Cape Coast", { en: "Cape Coast", ha: "Cape Coast", yo: "Cape Coast", ig: "Cape Coast", fr: "Cape Coast", pt: "Cape Coast", sw: "Cape Coast", ar: "كيب كوست" }),
  ],
  ke: [
    c("Nairobi", { en: "Nairobi", ha: "Nairobi", yo: "Nairobi", ig: "Nairobi", fr: "Nairobi", pt: "Nairóbi", sw: "Nairobi", ar: "نيروبي" }),
    c("Mombasa", { en: "Mombasa", ha: "Mombasa", yo: "Mombasa", ig: "Mombasa", fr: "Mombasa", pt: "Mombaça", sw: "Mombasa", ar: "مومباسا" }),
    c("Kisumu", { en: "Kisumu", ha: "Kisumu", yo: "Kisumu", ig: "Kisumu", fr: "Kisumu", pt: "Kisumu", sw: "Kisumu", ar: "كيسومو" }),
    c("Nakuru", { en: "Nakuru", ha: "Nakuru", yo: "Nakuru", ig: "Nakuru", fr: "Nakuru", pt: "Nakuru", sw: "Nakuru", ar: "ناكورو" }),
    c("Eldoret", { en: "Eldoret", ha: "Eldoret", yo: "Eldoret", ig: "Eldoret", fr: "Eldoret", pt: "Eldoret", sw: "Eldoret", ar: "إلدوريت" }),
  ],
  za: [
    c("Johannesburg", { en: "Johannesburg", ha: "Johannesburg", yo: "Johannesburg", ig: "Johannesburg", fr: "Johannesbourg", pt: "Joanesburgo", sw: "Johannesburg", ar: "جوهانسبرغ" }),
    c("Cape Town", { en: "Cape Town", ha: "Cape Town", yo: "Cape Town", ig: "Cape Town", fr: "Le Cap", pt: "Cidade do Cabo", sw: "Cape Town", ar: "كيب تاون" }),
    c("Durban", { en: "Durban", ha: "Durban", yo: "Durban", ig: "Durban", fr: "Durban", pt: "Durban", sw: "Durban", ar: "ديربان" }),
    c("Pretoria", { en: "Pretoria", ha: "Pretoria", yo: "Pretoria", ig: "Pretoria", fr: "Pretoria", pt: "Pretória", sw: "Pretoria", ar: "بريتوريا" }),
    c("Gqeberha", { en: "Gqeberha", ha: "Gqeberha", yo: "Gqeberha", ig: "Gqeberha", fr: "Gqeberha", pt: "Gqeberha", sw: "Gqeberha", ar: "غيبيرها" }),
  ],
  cm: [
    c("Douala", { en: "Douala", ha: "Douala", yo: "Douala", ig: "Douala", fr: "Douala", pt: "Duala", sw: "Douala", ar: "دوالا" }),
    c("Yaoundé", { en: "Yaoundé", ha: "Yaoundé", yo: "Yaoundé", ig: "Yaoundé", fr: "Yaoundé", pt: "Iaundé", sw: "Yaoundé", ar: "ياوندي" }),
    c("Bafoussam", { en: "Bafoussam", ha: "Bafoussam", yo: "Bafoussam", ig: "Bafoussam", fr: "Bafoussam", pt: "Bafoussam", sw: "Bafoussam", ar: "بافوسام" }),
    c("Bamenda", { en: "Bamenda", ha: "Bamenda", yo: "Bamenda", ig: "Bamenda", fr: "Bamenda", pt: "Bamenda", sw: "Bamenda", ar: "باميندا" }),
    c("Garoua", { en: "Garoua", ha: "Garoua", yo: "Garoua", ig: "Garoua", fr: "Garoua", pt: "Garoua", sw: "Garoua", ar: "غاروا" }),
  ],
};

/**
 * The cities to offer someone living in this country, named the way the
 * intake records it — "Ghana", not "gh".
 *
 * Empty rather than a fallback list, for the same reason
 * `currencyForCountry` returns null rather than naira: a traveller
 * living in Dubai offered Lagos, Abuja and Kano has been asked a
 * question about somebody else. Every intake question takes free text,
 * so an empty chip row is a shortcut withheld, not an answer blocked.
 */
export function citiesForCountryName(
  name: string | null | undefined
): Chip[] {
  if (!name) return [];
  const iso = NATIONALITY_ISO[name];
  if (!iso) return [];
  return CITIES_BY_COUNTRY[iso] ?? [];
}
