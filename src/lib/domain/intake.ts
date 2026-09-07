import type { Locale } from "@/lib/i18n/locales";

export type IntakeQuestion = {
  key: string;
  prompt: Record<Locale, string>;
  /**
   * A chip may carry `{fullName}` in its value and its labels, which
   * `resolveChips` fills in from the profile before either agent renders
   * it. Only the passport question needs it, and it needs it in the
   * value as well as the label: the scripted flow stores `chip.value`
   * verbatim, so a literal token would become the answer of record.
   */
  chips: { value: string; label: Record<Locale, string> }[];
  /** Free text is allowed on every question; chips are only a shortcut. */
  allowsFreeText?: boolean;
};

/** The one placeholder a chip may carry. See `resolveChips`. */
const FULL_NAME_TOKEN = "{fullName}";

/**
 * One chip, with its label in every language the interface speaks.
 *
 * A record rather than the positional arguments this took when there
 * were four languages: eight strings in a row is a list nobody can
 * proofread, and a transposed pair would put Yoruba under `ig` with
 * nothing to catch it. `Record<Locale, string>` still means a new
 * language is a compile error here rather than a silent English chip.
 *
 * NEEDS NATIVE REVIEW before launch. The `tw` and `zu` strings added on
 * 2026-09-05 were translated in-house from the English, the same way the
 * rest of this file's non-English strings were.
 */
const c = (
  value: string,
  label: Record<Locale, string>
): IntakeQuestion["chips"][number] => ({ value, label });

/**
 * The five countries that answer both "which passport do you hold" and
 * "where are you living now". Written once and shared: two copies of a
 * translation table drift, and the drift shows as this screen calling
 * Cameroon `Kamerúùnù` and the next one calling it something else.
 */
const NATIONS = {
  nigeria: c("Nigeria", { en: "Nigeria", ha: "Najeriya", yo: "Nàìjíríà", ig: "Naịjirịa", fr: "Nigeria", pt: "Nigéria", sw: "Nigeria", ar: "نيجيريا", tw: "Naegeria", zu: "iNigeria" }),
  ghana: c("Ghana", { en: "Ghana", ha: "Gana", yo: "Gánà", ig: "Ghana", fr: "Ghana", pt: "Gana", sw: "Ghana", ar: "غانا", tw: "Gaana", zu: "iGhana" }),
  kenya: c("Kenya", { en: "Kenya", ha: "Kenya", yo: "Kẹ́nyà", ig: "Kenya", fr: "Kenya", pt: "Quénia", sw: "Kenya", ar: "كينيا", tw: "Kenya", zu: "iKenya" }),
  southAfrica: c("South Africa", { en: "South Africa", ha: "Afirka ta Kudu", yo: "Gúúsù Áfríkà", ig: "South Africa", fr: "Afrique du Sud", pt: "África do Sul", sw: "Afrika Kusini", ar: "جنوب أفريقيا", tw: "Afrika Anafo", zu: "iNingizimu Afrika" }),
  cameroon: c("Cameroon", { en: "Cameroon", ha: "Kamaru", yo: "Kamerúùnù", ig: "Cameroon", fr: "Cameroun", pt: "Camarões", sw: "Kameruni", ar: "الكاميرون", tw: "Kamerun", zu: "iKamerun" }),
};


/**
 * A city name that is the same in every Latin-script locale, with room
 * for the forms that genuinely differ.
 *
 * Most place names do not translate — Accra is Accra in nine of the ten
 * languages here. Writing them out ten times each would be 250 strings
 * nobody can proofread, and the transposition risk `c` was built to
 * avoid. Arabic is not Latin script so it always needs its own form, and
 * a handful of Nigerian cities have real Hausa, Yoruba or Igbo names
 * that a traveller would recognise.
 */
const city = (
  value: string,
  ar: string,
  overrides: Partial<Record<Locale, string>> = {}
): IntakeQuestion["chips"][number] => ({
  value,
  label: {
    en: value, ha: value, yo: value, ig: value, fr: value,
    pt: value, sw: value, tw: value, zu: value,
    ar,
    ...overrides,
  },
});

/**
 * The cities offered for each country the intake serves.
 *
 * The country question is asked immediately before the city one, and
 * exists to narrow it: a traveller who has just said Ghana was still
 * being offered Lagos, Abuja and Port Harcourt. A country with no list
 * here offers no chips at all rather than a guess — free text answers
 * the question, and the answer decides which mission they apply at, so
 * putting a city in their mouth is not a small error.
 */
const CITIES: Record<string, IntakeQuestion["chips"]> = {
  Nigeria: [
    city("Lagos", "لاغوس", { ha: "Legas", yo: "Èkó", zu: "iLagos" }),
    city("Abuja", "أبوجا", { yo: "Àbùjá", zu: "i-Abuja" }),
    city("Port Harcourt", "بورت هاركورت", { ha: "Fatakwal", yo: "Pọ́ọ̀tì Hákọ́tì", ig: "Pọtakọt" }),
    city("Kano", "كانو", { yo: "Kánò" }),
    city("Ibadan", "إيبادان", { yo: "Ìbàdàn", zu: "i-Ibadan" }),
  ],
  Ghana: [
    city("Accra", "أكرا", { zu: "i-Accra" }),
    city("Kumasi", "كوماسي"),
    city("Takoradi", "تاكورادي"),
    city("Tamale", "تامالي"),
    city("Cape Coast", "كيب كوست"),
  ],
  Kenya: [
    city("Nairobi", "نيروبي", { zu: "iNairobi" }),
    city("Mombasa", "مومباسا"),
    city("Kisumu", "كيسومو"),
    city("Nakuru", "ناكورو"),
    city("Eldoret", "إلدوريت"),
  ],
  "South Africa": [
    city("Johannesburg", "جوهانسبرغ", { zu: "iGoli" }),
    city("Cape Town", "كيب تاون", { zu: "iKapa", fr: "Le Cap", pt: "Cidade do Cabo" }),
    city("Durban", "ديربان", { zu: "iThekwini" }),
    city("Pretoria", "بريتوريا", { zu: "iPitoli" }),
    city("Gqeberha", "غقبيرها"),
  ],
  Cameroon: [
    city("Douala", "دوالا"),
    city("Yaoundé", "ياوندي"),
    city("Bamenda", "باميندا"),
    city("Bafoussam", "بافوسام"),
    city("Garoua", "غاروا"),
  ],
};

/**
 * One budget figure, in the forms the ten languages need it.
 *
 * `short` is the abbreviated amount six of them use unchanged; English,
 * Portuguese and Arabic spell the unit out and each spell it their own
 * way. Same economy as `city` above — the amount is written four times,
 * not ten.
 */
type Amount = { en: string; short: string; pt: string; ar: string };

/** The four money bands, in the phrasing each language wraps them in. */
const budgetBands = (
  under: Amount,
  low: Amount,
  high: Amount,
  over: Amount
): Record<string, Record<Locale, string>> => {
  const range = (a: Amount): Record<Locale, string> => ({
    en: a.en, ha: a.short, yo: a.short, ig: a.short, fr: a.short,
    pt: a.pt, sw: a.short, ar: a.ar, tw: a.short, zu: a.short,
  });

  return {
    "Under US$1,250": {
      en: `Under ${under.en}`,
      ha: `Ƙasa da ${under.short}`,
      yo: `Kéré sí ${under.short}`,
      ig: `N'okpuru ${under.short}`,
      fr: `Moins de ${under.short}`,
      pt: `Menos de ${under.pt}`,
      sw: `Chini ya ${under.short}`,
      ar: `أقل من ${under.ar}`,
      tw: `Ase ${under.short}`,
      zu: `Ngaphansi kuka-${under.short}`,
    },
    "US$1,250–2,500": range(low),
    "US$2,500–5,000": range(high),
    "Over US$5,000": {
      en: `Over ${over.en}`,
      ha: `Sama da ${over.short}`,
      yo: `Ju ${over.short} lọ`,
      ig: `Karịa ${over.short}`,
      fr: `Plus de ${over.short}`,
      pt: `Mais de ${over.pt}`,
      sw: `Zaidi ya ${over.short}`,
      ar: `أكثر من ${over.ar}`,
      tw: `Boro ${over.short}`,
      zu: `Ngaphezu kuka-${over.short}`,
    },
  };
};

/** The dollar wording, shown to anyone whose country has no entry below. */
const BUDGET_USD = budgetBands(
  { en: "US$1,250", short: "US$1,250", pt: "US$1250", ar: "US$1,250" },
  { en: "US$1,250–2,500", short: "US$1,250–2,500", pt: "US$1250–2500", ar: "US$1,250–2,500" },
  { en: "US$2,500–5,000", short: "US$2,500–5,000", pt: "US$2500–5000", ar: "US$2,500–5,000" },
  { en: "US$5,000", short: "US$5,000", pt: "US$5000", ar: "US$5,000" }
);

/**
 * What the four bands are worth where the traveller lives, keyed on the
 * country name the intake records — the same keys as `CITIES`.
 *
 * Rounded to what a person would say out loud, not converted: these are
 * the walls of a band, and a chip reading "Under ₵15,000" answers
 * "roughly how much have you got", it does not quote a rate. A country
 * absent here falls back to `BUDGET_USD`, which is the honest outcome
 * for somewhere this product does not yet price.
 */
const BUDGET_LABELS_BY_COUNTRY: Record<
  string,
  Record<string, Record<Locale, string>>
> = {
  Nigeria: budgetBands(
    { en: "₦2 million", short: "₦2m", pt: "₦2 milhões", ar: "₦2 مليون" },
    { en: "₦2–4 million", short: "₦2–4m", pt: "₦2–4 milhões", ar: "₦2–4 مليون" },
    { en: "₦4–8 million", short: "₦4–8m", pt: "₦4–8 milhões", ar: "₦4–8 مليون" },
    { en: "₦8 million", short: "₦8m", pt: "₦8 milhões", ar: "₦8 مليون" }
  ),
  Ghana: budgetBands(
    { en: "₵15,000", short: "₵15,000", pt: "₵15 000", ar: "₵15,000" },
    { en: "₵15,000–30,000", short: "₵15,000–30,000", pt: "₵15 000–30 000", ar: "₵15,000–30,000" },
    { en: "₵30,000–60,000", short: "₵30,000–60,000", pt: "₵30 000–60 000", ar: "₵30,000–60,000" },
    { en: "₵60,000", short: "₵60,000", pt: "₵60 000", ar: "₵60,000" }
  ),
  Kenya: budgetBands(
    { en: "KSh 160,000", short: "KSh 160,000", pt: "KSh 160 000", ar: "KSh 160,000" },
    { en: "KSh 160,000–320,000", short: "KSh 160,000–320,000", pt: "KSh 160 000–320 000", ar: "KSh 160,000–320,000" },
    { en: "KSh 320,000–650,000", short: "KSh 320,000–650,000", pt: "KSh 320 000–650 000", ar: "KSh 320,000–650,000" },
    { en: "KSh 650,000", short: "KSh 650,000", pt: "KSh 650 000", ar: "KSh 650,000" }
  ),
  "South Africa": budgetBands(
    { en: "R22,000", short: "R22,000", pt: "R22 000", ar: "R22,000" },
    { en: "R22,000–45,000", short: "R22,000–45,000", pt: "R22 000–45 000", ar: "R22,000–45,000" },
    { en: "R45,000–90,000", short: "R45,000–90,000", pt: "R45 000–90 000", ar: "R45,000–90,000" },
    { en: "R90,000", short: "R90,000", pt: "R90 000", ar: "R90,000" }
  ),
  Cameroon: budgetBands(
    { en: "750,000 CFA", short: "750,000 CFA", pt: "750 000 CFA", ar: "750,000 CFA" },
    { en: "750,000–1.5m CFA", short: "750,000–1.5m CFA", pt: "750 000–1,5M CFA", ar: "750,000–1.5m CFA" },
    { en: "1.5m–3m CFA", short: "1.5m–3m CFA", pt: "1,5M–3M CFA", ar: "1.5m–3m CFA" },
    { en: "3m CFA", short: "3m CFA", pt: "3M CFA", ar: "3m CFA" }
  ),
};

/**
 * Eleven topics, asked one at a time. Every answer stays editable:
 * reopening one truncates the conversation at that point, clears what
 * followed, and rebuilds the checklist — so a mis-tapped chip never
 * flows silently into the requirements.
 */
export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    /**
     * Sign-up already captured a name, so this asks the only question
     * that name cannot answer: is it the one the passport carries? A
     * visa is issued to the passport's spelling, and the two diverging
     * is a refusal nobody sees coming — which is why the answer is
     * stored beside the account name rather than merged into it.
     */
    key: "passport_name",
    prompt: {
      en: "First — what is your full name, exactly as it appears on your passport?",
      ha: "Da farko — mene ne cikakken sunanka, kamar yadda yake a fasfo ɗinka?",
      yo: "Àkọ́kọ́ — kí ni orúkọ rẹ ní kíkún, gẹ́gẹ́ bí ó ṣe wà nínú ìwé ìrìnnà rẹ?",
      ig: "Nke mbụ — gịnị bụ aha gị zuru ezu, dịka o si dị na paspọtụ gị?",
      fr: "Pour commencer — quel est votre nom complet, exactement tel qu'il figure sur votre passeport ?",
      pt: "Para começar — qual é o seu nome completo, exatamente como aparece no seu passaporte?",
      sw: "Kwanza — jina lako kamili ni lipi, kama lilivyo kwenye pasipoti yako?",
      ar: "أولاً — ما اسمك الكامل كما هو مكتوب في جواز سفرك؟",
      tw: "Nea edi kan — wo din a edi mu nyinaa yɛ dɛn, sɛnea ɛte wɔ wo pasport so ara pɛ?",
      zu: "Okokuqala — ubani igama lakho eliphelele, ngokunembile njengoba livela kuphasipoti yakho?",
    },
    chips: [
      c(FULL_NAME_TOKEN, {
        en: `Yes — ${FULL_NAME_TOKEN}`,
        ha: `Eh — ${FULL_NAME_TOKEN}`,
        yo: `Bẹ́ẹ̀ ni — ${FULL_NAME_TOKEN}`,
        ig: `Ee — ${FULL_NAME_TOKEN}`,
        fr: `Oui — ${FULL_NAME_TOKEN}`,
        pt: `Sim — ${FULL_NAME_TOKEN}`,
        sw: `Ndiyo — ${FULL_NAME_TOKEN}`,
        ar: `نعم — ${FULL_NAME_TOKEN}`,
        tw: `Aane — ${FULL_NAME_TOKEN}`,
        zu: `Yebo — ${FULL_NAME_TOKEN}`,
      }),
    ],
  },
  {
    key: "nationality",
    prompt: {
      en: "Which country's passport do you hold?",
      ha: "Fasfo na wace ƙasa kake da shi?",
      yo: "Ìwé ìrìnnà orílẹ̀-èdè wo ni o ní?",
      ig: "Paspọtụ obodo ole ka i ji?",
      fr: "De quel pays détenez-vous le passeport ?",
      pt: "De que país é o seu passaporte?",
      sw: "Una pasipoti ya nchi gani?",
      ar: "ما الدولة التي تحمل جواز سفرها؟",
      tw: "Ɔman bɛn pasport na wokura?",
      zu: "Uphethe iphasipoti yaziphi izwe?",
    },
    chips: [NATIONS.nigeria, NATIONS.ghana, NATIONS.kenya, NATIONS.southAfrica, NATIONS.cameroon],
  },
  {
    /**
     * The country, asked before the city. Nationality is not a
     * substitute: a mission's jurisdiction follows where the traveller
     * applies *from*, and a Nigerian passport holder living in Accra
     * applies in Ghana. Recorded and displayed today; the corridor
     * still resolves on nationality, destination and purpose alone.
     */
    key: "residence_country",
    prompt: {
      en: "And which country are you living in right now?",
      ha: "Kuma a wace ƙasa kake zaune yanzu?",
      yo: "Orílẹ̀-èdè wo ni o ń gbé báyìí?",
      ig: "Kedu mba ị bi ugbu a?",
      fr: "Et dans quel pays vivez-vous actuellement ?",
      pt: "E em que país está a viver neste momento?",
      sw: "Na unaishi katika nchi gani kwa sasa?",
      ar: "وفي أي دولة تقيم حالياً؟",
      tw: "Na ɔman bɛn mu na wote seesei?",
      zu: "Futhi uhlala kuliphi izwe njengamanje?",
    },
    chips: [NATIONS.nigeria, NATIONS.ghana, NATIONS.kenya, NATIONS.southAfrica, NATIONS.cameroon],
  },
  {
    key: "residence",
    prompt: {
      en: "And which city or town are you in?",
      ha: "Kuma a ina kake zaune yanzu?",
      yo: "Ibo ni o ń gbé báyìí?",
      ig: "Ebee ka ị bi ugbu a?",
      fr: "Et dans quelle ville êtes-vous ?",
      pt: "E em que cidade está?",
      sw: "Na uko katika mji gani?",
      ar: "وفي أي مدينة تقيم؟",
      tw: "Na kurow bɛn mu na wowɔ seesei?",
      zu: "Futhi ukuliphi idolobha noma idolobhana?",
    },
    /**
     * Empty here, and filled by `resolveChips` from the country answered
     * immediately before. A static list offered Lagos and Port Harcourt
     * to a traveller who had just said Ghana.
     */
    chips: [],
  },
  {
    key: "destination",
    prompt: {
      en: "Where are you hoping to travel?",
      ha: "Ina kake son tafiya?",
      yo: "Ibo ni o fẹ́ rìn lọ?",
      ig: "Ebee ka ị chọrọ ịga?",
      fr: "Où espérez-vous voyager ?",
      pt: "Para onde espera viajar?",
      sw: "Unatarajia kusafiri wapi?",
      ar: "إلى أين تأمل السفر؟",
      tw: "Ɛhe na wo werɛ hyɛ sɛ wobɛtu kwan akɔ?",
      zu: "Uthemba ukuya kuphi?",
    },
    chips: [
      c("United Kingdom", { en: "United Kingdom", ha: "Birtaniya", yo: "Ilẹ̀ Gẹ̀ẹ́sì", ig: "United Kingdom", fr: "Royaume-Uni", pt: "Reino Unido", sw: "Uingereza", ar: "المملكة المتحدة", tw: "Bretaaɲ", zu: "iBrithani" }),
      c("Canada", { en: "Canada", ha: "Kanada", yo: "Kánádà", ig: "Canada", fr: "Canada", pt: "Canadá", sw: "Kanada", ar: "كندا", tw: "Kanada", zu: "iKhanada" }),
      c("United Arab Emirates", { en: "UAE", ha: "Hadaddiyar Daular Larabawa", yo: "UAE", ig: "UAE", fr: "Émirats arabes unis", pt: "Emirados Árabes Unidos", sw: "Falme za Kiarabu", ar: "الإمارات العربية المتحدة", tw: "Emireti Arab Nkabom", zu: "Ama-Arabhu Ahlangene" }),
      c("Germany", { en: "Germany", ha: "Jamus", yo: "Jámánì", ig: "Germany", fr: "Allemagne", pt: "Alemanha", sw: "Ujerumani", ar: "ألمانيا", tw: "Jaaman", zu: "iJalimane" }),
      c("United States", { en: "United States", ha: "Amurka", yo: "Amẹ́ríkà", ig: "United States", fr: "États-Unis", pt: "Estados Unidos", sw: "Marekani", ar: "الولايات المتحدة", tw: "Amerika", zu: "iMelika" }),
    ],
  },
  {
    key: "purpose",
    prompt: {
      en: "What is taking you there — tourism, work, study, medical treatment, or are you relocating?",
      ha: "Me zai kai ka can — yawon buɗe ido, aiki, karatu, magani, ko ƙaura?",
      yo: "Kí ni ń mú ọ lọ síbẹ̀ — ìrìn-àjò, iṣẹ́, ẹ̀kọ́, ìtọ́jú, tàbí ìṣílọ?",
      ig: "Gịnị na-akpọga gị ebe ahụ — njem nlegharị anya, ọrụ, agụmakwụkwọ, ọgwụgwọ, ka ọ bụ ịkwaga?",
      fr: "Qu'est-ce qui vous y emmène — tourisme, travail, études, soins médicaux, ou une installation ?",
      pt: "O que o leva até lá — turismo, trabalho, estudos, tratamento médico, ou vai mudar-se?",
      sw: "Ni nini kinachokupeleka huko — utalii, kazi, masomo, matibabu, au unahamia?",
      ar: "ما الذي يأخذك إلى هناك — سياحة أم عمل أم دراسة أم علاج أم انتقال للإقامة؟",
      tw: "Dɛn na ɛrekɔ hɔ — akwantuo, adwuma, adesua, ayaresa, anaasɛ worekɔtena hɔ?",
      zu: "Yini ekuyisa lapho — ukuvakasha, umsebenzi, ukufunda, ukwelashwa, noma uyathuthela?",
    },
    chips: [
      c("Work", { en: "Work", ha: "Aiki", yo: "Iṣẹ́", ig: "Ọrụ", fr: "Travail", pt: "Trabalho", sw: "Kazi", ar: "عمل", tw: "Adwuma", zu: "Umsebenzi" }),
      c("Study", { en: "Study", ha: "Karatu", yo: "Ẹ̀kọ́", ig: "Agụmakwụkwọ", fr: "Études", pt: "Estudos", sw: "Masomo", ar: "دراسة", tw: "Adesua", zu: "Ukufunda" }),
      c("Tourism", { en: "Tourism", ha: "Yawon buɗe ido", yo: "Ìrìn-àjò", ig: "Njem nlegharị anya", fr: "Tourisme", pt: "Turismo", sw: "Utalii", ar: "سياحة", tw: "Akwantuo", zu: "Ukuvakasha" }),
      c("Medical", { en: "Medical treatment", ha: "Magani", yo: "Ìtọ́jú", ig: "Ọgwụgwọ", fr: "Soins médicaux", pt: "Tratamento médico", sw: "Matibabu", ar: "علاج طبي", tw: "Ayaresa", zu: "Ukwelashwa kwezempilo" }),
      c("Relocation", { en: "Relocating", ha: "Ƙaura", yo: "Ìṣílọ", ig: "Ịkwaga", fr: "Installation", pt: "Mudança definitiva", sw: "Kuhamia", ar: "الانتقال للإقامة", tw: "Atutena", zu: "Ukuthuthela" }),
    ],
  },
  {
    key: "dates",
    prompt: {
      en: "Roughly when do you plan to travel?",
      ha: "Kusan yaushe kake shirin tafiya?",
      yo: "Nígbà wo ni o gbèrò láti rìn?",
      ig: "Kedu mgbe ị na-eme atụmatụ ịga?",
      fr: "À peu près quand comptez-vous partir ?",
      pt: "Mais ou menos quando planeia viajar?",
      sw: "Unapanga kusafiri lini takribani?",
      ar: "متى تخطط للسفر تقريباً؟",
      tw: "Bere bɛn na wobɛtu kwan, sɛnea wonim seesei?",
      zu: "Uhlela ukuhamba nini cishe?",
    },
    chips: [
      c("Within a month", { en: "Within a month", ha: "Cikin wata ɗaya", yo: "Láàrin oṣù kan", ig: "N'ime otu ọnwa", fr: "D'ici un mois", pt: "Dentro de um mês", sw: "Ndani ya mwezi mmoja", ar: "خلال شهر", tw: "Bosome baako mu", zu: "Ngaphakathi kwenyanga eyodwa" }),
      c("In 2–3 months", { en: "In 2–3 months", ha: "Cikin wata 2–3", yo: "Ní oṣù 2–3", ig: "N'ime ọnwa 2–3", fr: "Dans 2–3 mois", pt: "Em 2–3 meses", sw: "Katika miezi 2–3", ar: "خلال 2–3 أشهر", tw: "Abosome 2–3 mu", zu: "Ezinyangeni ezi-2–3" }),
      c("In 4–6 months", { en: "In 4–6 months", ha: "Cikin wata 4–6", yo: "Ní oṣù 4–6", ig: "N'ime ọnwa 4–6", fr: "Dans 4–6 mois", pt: "Em 4–6 meses", sw: "Katika miezi 4–6", ar: "خلال 4–6 أشهر", tw: "Abosome 4–6 mu", zu: "Ezinyangeni ezi-4–6" }),
      c("Not decided yet", { en: "Not decided yet", ha: "Ban yanke shawara ba", yo: "Kò tíì pinnu", ig: "Ekpebibeghị", fr: "Pas encore décidé", pt: "Ainda não decidi", sw: "Bado sijaamua", ar: "لم أقرر بعد", tw: "Minsii gyinaeɛ biara", zu: "Angikanqumi okwamanje" }),
    ],
  },
  {
    key: "budget",
    prompt: {
      en: "What budget are you working with for the move itself — flights, fees, the first month?",
      ha: "Wane kuɗi kake da shi don ƙaurar — tikitin jirgi, kuɗaɗe, watan farko?",
      yo: "Ìnáwó wo ni o ní fún ìṣílọ náà — ọkọ̀ òfúrufú, owó, oṣù àkọ́kọ́?",
      ig: "Ego ole ka i nwere maka mbugharị ahụ — ụgbọelu, ụgwọ, ọnwa mbụ?",
      fr: "De quel budget disposez-vous pour le départ lui-même — billets, frais, le premier mois ?",
      pt: "Com que orçamento conta para a mudança em si — voos, taxas, o primeiro mês?",
      sw: "Una bajeti gani kwa safari yenyewe — tiketi, ada, mwezi wa kwanza?",
      ar: "ما الميزانية المتاحة للانتقال نفسه — تذاكر الطيران والرسوم والشهر الأول؟",
      tw: "Sika dodow bɛn na wode bɛyɛ atutena no ho ade — wimhyɛn akwantuo, sika a wobɛtua, bosome a edi kan?",
      zu: "Yimalini oyisebenzisayo yokufuduka uqobo — izindiza, izimali okumele zikhokhwe, inyanga yokuqala?",
    },
    /**
     * The values are US dollars and identical for every traveller; the
     * money they actually read is swapped in by `resolveChips` from
     * `BUDGET_LABELS_BY_COUNTRY`, the way the city list is narrowed by
     * `CITIES`.
     *
     * Value and label are split here because `applies_when` is a
     * membership test on the stored value and the rule editor in `/ops`
     * will build a rule on any topic. Were the value itself local, a
     * rule written as `budget in ["₦2–4 million"]` would match Nigerians
     * and fall to the outside-the-vocabulary hedge for everybody else —
     * a document shown with "we are not certain" for a question we did
     * have the answer to. `allChipsFor` returns these canonical values,
     * so the editor offers one vocabulary rather than five.
     *
     * The ladder is 1,250 / 2,500 / 5,000 rather than a rounder
     * 1,000 / 2,500 / 5,000 so the naira bands come out as the
     * ₦2m / ₦4m / ₦8m this question has always shown; no existing copy
     * changes meaning. Each country's wording is a rounded equivalent,
     * not a conversion, and none of it is a quote.
     */
    chips: [
      c("Under US$1,250", BUDGET_USD["Under US$1,250"]),
      c("US$1,250–2,500", BUDGET_USD["US$1,250–2,500"]),
      c("US$2,500–5,000", BUDGET_USD["US$2,500–5,000"]),
      c("Over US$5,000", BUDGET_USD["Over US$5,000"]),
      c("Not sure yet", { en: "Not sure yet", ha: "Ban tabbata ba", yo: "Kò dá mi lójú", ig: "Amabeghị m", fr: "Je ne sais pas encore", pt: "Ainda não sei", sw: "Sijui bado", ar: "لست متأكداً بعد", tw: "Minsii gyinaeɛ biara", zu: "Angikaqiniseki" }),
    ],
  },
  {
    key: "accommodation",
    prompt: {
      en: "Where will you stay when you arrive?",
      ha: "Ina za ka sauka idan ka isa?",
      yo: "Ibo ni wàá gbé nígbà tí o bá dé?",
      ig: "Ebee ka ị ga-ebi mgbe ị rutere?",
      fr: "Où logerez-vous à votre arrivée ?",
      pt: "Onde vai ficar quando chegar?",
      sw: "Utakaa wapi utakapowasili?",
      ar: "أين ستقيم عند وصولك؟",
      tw: "Ɛhe na wobɛtena wɔ bere a woduru?",
      zu: "Uzohlala kuphi lapho ufika?",
    },
    chips: [
      c("Long-term rental", { en: "Long-term rental", ha: "Haya na dogon lokaci", yo: "Ìyàlégbé gígùn", ig: "Mgbazinye ogologo oge", fr: "Location longue durée", pt: "Arrendamento de longa duração", sw: "Kupanga kwa muda mrefu", ar: "إيجار طويل الأجل", tw: "Efie a wɔabɔ kaa nkyɛ", zu: "Ukuqasha isikhathi eside" }),
      c("With family or friends", { en: "With family or friends", ha: "Da dangi ko abokai", yo: "Pẹ̀lú ẹbí tàbí ọ̀rẹ́", ig: "Ya na ezinụlọ ma ọ bụ ndị enyi", fr: "Chez la famille ou des amis", pt: "Com família ou amigos", sw: "Kwa familia au marafiki", ar: "لدى الأهل أو الأصدقاء", tw: "Wɔ abusuafo anaa nnamfo nkyɛn", zu: "Nomndeni noma abangani" }),
      c("Employer housing", { en: "Employer housing", ha: "Gidan ma'aikata", yo: "Ilé agbanisíṣẹ́", ig: "Ụlọ onye ọrụ", fr: "Logement de l'employeur", pt: "Alojamento do empregador", sw: "Makazi ya mwajiri", ar: "سكن جهة العمل", tw: "Efie a osomfoɔ de ma", zu: "Indawo yokuhlala yomqashi" }),
      c("Hotel at first", { en: "Hotel at first", ha: "Otal da farko", yo: "Hotẹ́ẹ̀lì lákọ̀ọ́kọ́", ig: "Họtel na mbụ", fr: "À l'hôtel au début", pt: "Hotel no início", sw: "Hoteli mwanzoni", ar: "فندق في البداية", tw: "Ahɔhogyebea kan", zu: "Ihhotela ekuqaleni" }),
      c("Student housing", { en: "Student housing", ha: "Gidan ɗalibai", yo: "Ilé akẹ́kọ̀ọ́", ig: "Ụlọ ụmụ akwụkwọ", fr: "Résidence étudiante", pt: "Residência de estudantes", sw: "Makazi ya wanafunzi", ar: "سكن الطلاب", tw: "Asuafoɔ efie", zu: "Indawo yokuhlala yabafundi" }),
    ],
  },
  {
    key: "companions",
    prompt: {
      en: "Who is coming with you?",
      ha: "Wa zai zo tare da kai?",
      yo: "Ta ni yóò bá ọ lọ?",
      ig: "Onye na-eso gị?",
      fr: "Qui vous accompagne ?",
      pt: "Quem vai consigo?",
      sw: "Nani anasafiri nawe?",
      ar: "من سيرافقك؟",
      tw: "Hena na ɔne wo rebɛba?",
      zu: "Ubani ozohamba nawe?",
    },
    chips: [
      c("Just me", { en: "Just me", ha: "Ni kaɗai", yo: "Èmi nìkan", ig: "Naanị m", fr: "Moi seulement", pt: "Só eu", sw: "Mimi peke yangu", ar: "أنا فقط", tw: "Me nko ara", zu: "Yimina kuphela" }),
      c("Partner", { en: "My partner", ha: "Abokin zama", yo: "Alábàáṣepọ̀ mi", ig: "Onye ibe m", fr: "Mon conjoint", pt: "O meu companheiro", sw: "Mwenzi wangu", ar: "شريكي", tw: "Me kunu/yere", zu: "Umlingani wami" }),
      c("Partner and children", { en: "Partner and children", ha: "Abokin zama da yara", yo: "Alábàáṣepọ̀ àti ọmọ", ig: "Onye ibe m na ụmụ", fr: "Mon conjoint et mes enfants", pt: "Companheiro e filhos", sw: "Mwenzi na watoto", ar: "شريكي وأطفالي", tw: "Me kunu/yere ne mma", zu: "Umlingani nezingane" }),
      c("Children", { en: "My children", ha: "Yara", yo: "Àwọn ọmọ mi", ig: "Ụmụ m", fr: "Mes enfants", pt: "Os meus filhos", sw: "Watoto wangu", ar: "أطفالي", tw: "Me mma", zu: "Izingane zami" }),
    ],
  },
  {
    key: "needs",
    prompt: {
      en: "Anything we should plan around — food, health, or getting around?",
      ha: "Akwai wani abu da ya kamata mu tsara — abinci, lafiya, ko zirga-zirga?",
      yo: "Ǹjẹ́ ohunkóhun wà tí a gbọ́dọ̀ gbèrò fún — oúnjẹ, ìlera, tàbí ìrìnkèrindò?",
      ig: "Enwere ihe anyị kwesịrị ịtụ atụmatụ maka ya — nri, ahụike, ma ọ bụ njem?",
      fr: "Y a-t-il quelque chose à prévoir — alimentation, santé, ou déplacements ?",
      pt: "Há algo que devamos ter em conta — alimentação, saúde, ou deslocações?",
      sw: "Kuna jambo tunalopaswa kupanga — chakula, afya, au usafiri?",
      ar: "هل هناك ما ينبغي مراعاته — الطعام أو الصحة أو التنقل؟",
      tw: "Biribi wɔ hɔ a ɛsɛ sɛ yɛhyehyɛ ho — aduane, akwahosan, anaa akwantu mu?",
      zu: "Ikhona yini okudingeka sikuhlele — ukudla, impilo, noma ukuhamba?",
    },
    chips: [
      c("Halal food", { en: "Halal food", ha: "Abinci halal", yo: "Oúnjẹ halal", ig: "Nri halal", fr: "Nourriture halal", pt: "Comida halal", sw: "Chakula halali", ar: "طعام حلال", tw: "Halal aduane", zu: "Ukudla kwe-Halal" }),
      c("Prayer facilities", { en: "Prayer facilities", ha: "Wurin sallah", yo: "Ibi àdúrà", ig: "Ebe ekpere", fr: "Lieu de prière", pt: "Local de oração", sw: "Mahali pa kusali", ar: "مكان للصلاة", tw: "Mpaebɔ beaeɛ", zu: "Izindawo zokukhuleka" }),
      c("A medical condition", { en: "A medical condition", ha: "Yanayin lafiya", yo: "Ipò ìlera", ig: "Ọnọdụ ahụike", fr: "Un problème de santé", pt: "Uma condição de saúde", sw: "Hali ya kiafya", ar: "حالة صحية", tw: "Akwahosan haw bi", zu: "Isimo sezempilo" }),
      c("Step-free access", { en: "Step-free access", ha: "Hanya mara matakala", yo: "Ọ̀nà aláìní àtẹ̀gùn", ig: "Ụzọ enweghị steepụ", fr: "Accès sans marches", pt: "Acesso sem degraus", sw: "Njia isiyo na ngazi", ar: "مدخل بلا درجات", tw: "Kwan a atrapoe nni mu", zu: "Ukungena ngaphandle kwezitebhisi" }),
      c("Nothing in particular", { en: "Nothing in particular", ha: "Babu wani abu", yo: "Kò sí nǹkan pàtàkì", ig: "Ọ dịghị ihe pụrụ iche", fr: "Rien de particulier", pt: "Nada em especial", sw: "Hakuna kitu maalum", ar: "لا شيء بعينه", tw: "Biribiara nni ho", zu: "Akukho okuthile" }),
    ],
  },
  {
    key: "history",
    prompt: {
      en: "Last one — have you been refused a visa for anywhere before?",
      ha: "Na ƙarshe — an taɓa hana ka biza a wani wuri?",
      yo: "Ìkẹyìn — ṣé wọ́n kọ fisa fún ọ rí níbìkíbi?",
      ig: "Nke ikpeazụ — ajụla gị visa ebe ọ bụla mbụ?",
      fr: "Dernière question — vous a-t-on déjà refusé un visa, où que ce soit ?",
      pt: "Última pergunta — já lhe recusaram um visto em algum lado?",
      sw: "Swali la mwisho — umewahi kukataliwa viza mahali popote?",
      ar: "السؤال الأخير — هل سبق أن رُفض طلب تأشيرة لك في أي بلد؟",
      tw: "Deɛ etwa toɔ — wɔapo wo visa da wɔ baabiara pɛn?",
      zu: "Okokugcina — wake wenqatshwa i-visa ndawo ethile ngaphambili?",
    },
    chips: [
      c("No", { en: "No, never", ha: "A'a, bai taɓa faruwa ba", yo: "Rárá, kò rí bẹ́ẹ̀ rí", ig: "Mba, ọ dịtụbeghị", fr: "Non, jamais", pt: "Não, nunca", sw: "Hapana, kamwe", ar: "لا، أبداً", tw: "Daabi, ɛmpo da", zu: "Cha, angikaze" }),
      c("Yes — I was refused once", { en: "Yes, once", ha: "Eh, sau ɗaya", yo: "Bẹ́ẹ̀ ni, ẹ̀ẹ̀kan", ig: "Ee, otu ugboro", fr: "Oui, une fois", pt: "Sim, uma vez", sw: "Ndiyo, mara moja", ar: "نعم، مرة واحدة", tw: "Aane, prɛko", zu: "Yebo, kanye" }),
      c("Yes — more than once", { en: "Yes, more than once", ha: "Eh, fiye da sau ɗaya", yo: "Bẹ́ẹ̀ ni, ju ẹ̀ẹ̀kan lọ", ig: "Ee, karịa otu ugboro", fr: "Oui, plus d'une fois", pt: "Sim, mais de uma vez", sw: "Ndiyo, zaidi ya mara moja", ar: "نعم، أكثر من مرة", tw: "Aane, mprenu anaa ɛboro saa", zu: "Yebo, ngaphezu kwesikhathi esisodwa" }),
      c("I would rather explain", { en: "I would rather explain", ha: "Zan fi son bayyanawa", yo: "Mo fẹ́ ṣàlàyé", ig: "Ọ ka mma ka m kọwaa", fr: "Je préfère expliquer", pt: "Prefiro explicar", sw: "Ningependa kueleza", ar: "أفضّل أن أشرح", tw: "Mepɛ sɛ mekyerɛkyerɛ mu", zu: "Ngingathanda ukuchaza" }),
    ],
    allowsFreeText: true,
  },
];

/**
 * A refusal is never hidden and never held against the applicant here —
 * declaring it is what keeps the eventual application truthful.
 */
export const HISTORY_NOTE =
  "A previous refusal must be declared. Hiding one is the single fastest way to lose the next application.";

/**
 * A question's chips with the traveller's own name filled in.
 *
 * Only the passport question carries a placeholder, and it carries it in
 * the value as well as the labels because the two agents read different
 * halves of a chip: the scripted flow stores `chip.value` as the answer
 * of record, while the model-driven one sends the translated label as
 * though the traveller had typed it. A literal `{fullName}` reaching
 * either is a name nobody has.
 *
 * A blank name yields no chip at all rather than one reading "Yes — ",
 * which confirms nothing. Free text answers the question in that case,
 * as it does for every question here.
 */
export function resolveChips(
  question: IntakeQuestion,
  {
    fullName,
    answers = {},
  }: { fullName: string; answers?: Record<string, string | undefined> }
): IntakeQuestion["chips"] {
  const name = fullName.trim();

  const country = answers.residence_country ?? "";
  const bands = BUDGET_LABELS_BY_COUNTRY[country];

  // The city question is narrowed by the country asked immediately
  // before it. A country with no list offers no chips rather than a
  // guess: free text answers the question either way, and this answer
  // decides which mission the traveller applies at, so putting a city in
  // their mouth is not a small error.
  //
  // The budget question follows the same answer by a different route.
  // Narrowing would be wrong there — every traveller is offered all four
  // bands — so only the label changes, and the value each band stores
  // stays the canonical dollar one. A country with no wording of its own
  // keeps the dollar labels rather than being shown naira.
  const chips =
    question.key === "residence"
      ? (CITIES[country] ?? [])
      : question.key === "budget" && bands
        ? question.chips.map((chip) =>
            bands[chip.value] ? { ...chip, label: bands[chip.value] } : chip
          )
        : question.chips;

  return chips.flatMap((chip) => {
    if (!chip.value.includes(FULL_NAME_TOKEN)) return [chip];
    if (!name) return [];

    return [
      {
        value: chip.value.replaceAll(FULL_NAME_TOKEN, name),
        label: Object.fromEntries(
          Object.entries(chip.label).map(([locale, text]) => [
            locale,
            text.replaceAll(FULL_NAME_TOKEN, name),
          ])
        ) as Record<Locale, string>,
      },
    ];
  });
}

/**
 * Every chip a question could ever offer, ignoring context.
 *
 * `resolveChips` narrows the city list to the country a traveller
 * answered, which is right for asking them. Two callers cannot narrow:
 * `normaliseAnswer` is handed one answer and no context, and the rule
 * editor in `/ops` is choosing values for a rule that will be applied to
 * everybody. Both need the full set, and getting it from here means the
 * three cannot drift apart.
 */
export function allChipsFor(questionKey: string): IntakeQuestion["chips"] {
  if (questionKey === "residence") return Object.values(CITIES).flat();

  const chips = INTAKE_QUESTIONS.find((q) => q.key === questionKey)?.chips ?? [];
  if (questionKey !== "budget") return chips;

  // The same four bands again, once per country, carrying that country's
  // wording. The value never varies, so the duplicates are harmless and
  // `normaliseAnswer` needs them: a Ghanaian taps "₵15,000" and the
  // model-driven flow submits that label as though they had typed it.
  // Without this it matches no chip, resolves to no code, and a rule
  // keyed on a band becomes unevaluable for everybody outside the
  // dollar labels — the hedge, for a question we did have an answer to.
  return [
    ...chips,
    ...Object.values(BUDGET_LABELS_BY_COUNTRY).flatMap((bands) =>
      chips.flatMap((chip) =>
        bands[chip.value] ? [{ value: chip.value, label: bands[chip.value] }] : []
      )
    ),
  ];
}

/**
 * Everything the intake knows up to, but not including, one topic — the
 * shadow of what `recordIntakeAnswer` does in the database when an
 * earlier question is answered again.
 *
 * Shared rather than kept beside one screen because three callers need
 * the same shadow: the scripted transcript, the model-driven rail, and
 * the voice hook, which has to know what is still unanswered before it
 * can tell the model what to ask next. A second copy of this rule is a
 * rail that disagrees with the checklist.
 */
export function truncateAnswersAt(
  answers: Record<string, string>,
  key: string
): Record<string, string> {
  const index = INTAKE_QUESTIONS.findIndex((q) => q.key === key);
  // A key the intake does not ask is what `recordIntakeAnswer` refuses
  // outright, so the shadow of it is nothing happening. Spelled out
  // because `slice(0, -1)` would otherwise quietly drop the last answer.
  if (index === -1) return { ...answers };

  const next: Record<string, string> = {};
  INTAKE_QUESTIONS.slice(0, index).forEach((q) => {
    if (answers[q.key]) next[q.key] = answers[q.key];
  });
  return next;
}

/**
 * Where the conversation is: the position of the first unanswered topic,
 * or `INTAKE_QUESTIONS.length` once every one is answered.
 *
 * The first *gap*, never a tally of what is filled. Truncation only ever
 * clears answers *after* the one being written — it does not fill in the
 * ones before it — so a topic recorded out of order leaves a hole, and
 * the answers are no longer a prefix of the question order. Both agents
 * ask at the gap. A screen that counted instead would sit one question
 * past it for every hole, asking about residence under a question about
 * nationality; the scripted flow would then file the reply under the
 * wrong key outright.
 *
 * So it is defined once, here, and everything that needs to know which
 * question is live reads it from this function.
 */
export function intakeFrontier(answers: Record<string, string>): number {
  const index = INTAKE_QUESTIONS.findIndex((q) => !answers[q.key]);
  return index === -1 ? INTAKE_QUESTIONS.length : index;
}

/** The question the intake should ask next — the one at the frontier. */
export function nextIntakeQuestion(
  answers: Record<string, string>
): IntakeQuestion | undefined {
  return INTAKE_QUESTIONS[intakeFrontier(answers)];
}

/** One answer being recorded — by whichever agent was listening. */
export type IntakeWrite = { key: string; value: string };

/**
 * A spoken answer, and where in the typed conversation it happened.
 *
 * `afterWrites` is how many typed answers had been recorded when this
 * one was spoken, which is the only thing that puts the two streams back
 * in order later — see `orderIntakeWrites`.
 */
export type SpokenIntakeWrite = IntakeWrite & { afterWrites: number };

/**
 * Put the typed and the spoken answers back into the order they were
 * actually recorded in.
 *
 * The screen has two writers. Typed answers can be read back off the
 * chat transcript in order; a spoken one leaves no message behind, so it
 * is kept separately — and simply replaying the separate list last is
 * wrong in a way that loses data. Speak five answers, stop, type the
 * sixth, and a spoken replay tacked onto the end truncates back to
 * answer one and re-applies one to five, silently dropping the sixth:
 * the rail walks backwards, the agent re-asks a question already
 * answered, and an intake the database considers finished never reports
 * itself finished on screen.
 *
 * So each spoken answer remembers how much typing preceded it, and this
 * splices the two streams by that marker. Both are replayed in true
 * order, and the later answer wins because it is genuinely later.
 */
export function orderIntakeWrites(
  typed: IntakeWrite[],
  spoken: SpokenIntakeWrite[]
): IntakeWrite[] {
  const ordered: IntakeWrite[] = [];
  let next = 0;

  for (let i = 0; i < typed.length; i++) {
    while (next < spoken.length && spoken[next].afterWrites <= i) {
      ordered.push(spoken[next++]);
    }
    ordered.push(typed[i]);
  }

  while (next < spoken.length) ordered.push(spoken[next++]);

  return ordered;
}

/**
 * Replay a run of answers over what was already known, truncating at
 * each one the way the database does.
 *
 * Idempotent over an answer that is already in `base` at the same value,
 * which is what lets the rail survive a refresh: once the server sends
 * back a record that already contains a spoken answer, replaying that
 * answer again lands on exactly the same rail.
 */
export function applyIntakeWrites(
  base: Record<string, string>,
  writes: IntakeWrite[]
): Record<string, string> {
  let answers = { ...base };

  for (const write of writes) {
    answers = truncateAnswersAt(answers, write.key);
    answers[write.key] = write.value;
  }

  return answers;
}
