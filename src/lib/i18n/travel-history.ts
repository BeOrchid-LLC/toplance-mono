import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The traveller's editable past-trips list on the profile page. The trip
 * data itself — country, purpose, dates — is what the traveller typed,
 * and stays exactly as typed; everything here is the form's fixed copy
 * around it.
 *
 * English values are the copy the form already had; every other locale
 * was translated in-house from that English, the same way `HERO` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const TRAVEL_HISTORY: {
  tripAdded: L;
  removedToast: L;
  empty: L;
  removeAria: L;
  countryLabel: L;
  countryPlaceholder: L;
  purposeLabel: L;
  purposePlaceholder: L;
  fromLabel: L;
  toLabel: L;
  saving: L;
  saveTrip: L;
  cancel: L;
  addTrip: L;
} = {
  tripAdded: {
    en: "Trip added to your history",
    ha: "An ƙara tafiya a tarihinka",
    yo: "A ti fi ìrìn àjò kún ìtàn rẹ",
    ig: "Agbakwunyere njem na akụkọ ihe mere eme gị",
    fr: "Voyage ajouté à votre historique",
    pt: "Viagem adicionada ao seu histórico",
    sw: "Safari imeongezwa kwenye historia yako",
    ar: "تمت إضافة الرحلة إلى سجلك",
    tw: "Wɔde akwantuo no aka wo abakɔsɛm ho",
    zu: "Uhambo lwengezwe emlandweni wakho",
  },
  removedToast: {
    en: "{country} removed",
    ha: "An cire {country}",
    yo: "A ti yọ {country} kúrò",
    ig: "Ewepụla {country}",
    fr: "{country} supprimé",
    pt: "{country} removido",
    sw: "{country} imeondolewa",
    ar: "تمت إزالة {country}",
    tw: "Woayi {country} afiri hɔ",
    zu: "I-{country} isusiwe",
  },
  empty: {
    en: "No past trips recorded. Visa forms ask about them — adding yours here saves digging through old passports at the desk.",
    ha: "Babu tafiye-tafiyen da a rubuce. Fom ɗin biza yakan tambaya game da su — ƙara naka a nan yana ceto binciken tsofaffin fasfo a ofis.",
    yo: "Kò sí ìrìn àjò tí a ti ṣàkọsílẹ̀ rí. Fọ́mù fisa máa ń béèrè nípa wọn — fífi tìrẹ kún ibí yìí á fi ọ́ pamọ́ fún wíwá inú fáàsípọ́tù àtijọ́ ní tábìlì.",
    ig: "Ọ dịghị njem gara aga edekọrọ. Fọm visa na-ajụ maka ha — itinye nke gị ebe a na-azọpụta ịchọ n'ime ochie paspọtụ na tebụl.",
    fr: "Aucun voyage passé enregistré. Les formulaires de visa les demandent — ajouter les vôtres ici évite de fouiller dans d'anciens passeports au guichet.",
    pt: "Nenhuma viagem passada registada. Os formulários de visto perguntam sobre elas — adicionar as suas aqui evita procurar em passaportes antigos no balcão.",
    sw: "Hakuna safari za zamani zilizorekodiwa. Fomu za viza huuliza kuhusu hizo — kuongeza zako hapa hukuepusha kupekua pasipoti za zamani dawatini.",
    ar: "لا توجد رحلات سابقة مسجّلة. تسأل نماذج التأشيرة عنها — إضافة رحلاتك هنا يوفّر عليك البحث في جوازات سفر قديمة عند الشباك.",
    tw: "Wɔnkyerɛw akwantuo dedaw biara. Visa nkrataa bisa wɔn ho asɛm — sɛ wode wo deɛ ka ho wɔ ha a, ɛbɛboa wo na woanhwehwɛ tete pasport mu wɔ pon ano.",
    zu: "Awekho uhambo lwakudala olubhaliwe. Amafomu e-visa ayabuza ngalo — ukungeza olwakho lapha kugwema ukudinga kumapasipoti amadala ehhovisi.",
  },
  removeAria: {
    en: "Remove the trip to {country}",
    ha: "Cire tafiyar zuwa {country}",
    yo: "Yọ ìrìn àjò sí {country} kúrò",
    ig: "Wepụ njem gaa {country}",
    fr: "Supprimer le voyage vers {country}",
    pt: "Remover a viagem para {country}",
    sw: "Ondoa safari kwenda {country}",
    ar: "إزالة الرحلة إلى {country}",
    tw: "Yi akwantuo a wɔkɔɔ {country} no firi hɔ",
    zu: "Susa uhambo oluya e-{country}",
  },
  countryLabel: {
    en: "Country you traveled to",
    ha: "Ƙasar da ka tafi",
    yo: "Orílẹ̀-èdè tí o rìn lọ",
    ig: "Obodo ị gara",
    fr: "Pays visité",
    pt: "País para onde viajou",
    sw: "Nchi uliyosafiri",
    ar: "الدولة التي سافرت إليها",
    tw: "Ɔman a wokɔeɛ",
    zu: "Izwe olihambele",
  },
  countryPlaceholder: {
    en: "Ghana",
    ha: "Ghana",
    yo: "Ghana",
    ig: "Ghana",
    fr: "Ghana",
    pt: "Gana",
    sw: "Ghana",
    ar: "غانا",
    tw: "Ghana",
    zu: "iGhana",
  },
  purposeLabel: {
    en: "What the trip was for",
    ha: "Dalilin tafiyar",
    yo: "Ohun tí ìrìn àjò náà jẹ́ fún",
    ig: "Ihe njem ahụ bụụrụ",
    fr: "Objet du voyage",
    pt: "Motivo da viagem",
    sw: "Sababu ya safari",
    ar: "الغرض من الرحلة",
    tw: "Deɛ akwantuo no yɛɛ ho adwuma",
    zu: "Injongo yohambo",
  },
  purposePlaceholder: {
    en: "Family visit, work, study…",
    ha: "Ziyarar iyali, aiki, karatu…",
    yo: "Ìbẹ̀wò ẹbí, iṣẹ́, ẹ̀kọ́…",
    ig: "Nleta ezinụlọ, ọrụ, ọmụmụ ihe…",
    fr: "Visite familiale, travail, études…",
    pt: "Visita à família, trabalho, estudos…",
    sw: "Ziara ya familia, kazi, masomo…",
    ar: "زيارة عائلية، عمل، دراسة…",
    tw: "Abusua nsra, adwuma, adesua…",
    zu: "Ukuvakashela umndeni, umsebenzi, ukufunda…",
  },
  fromLabel: {
    en: "From",
    ha: "Daga",
    yo: "Láti",
    ig: "Site na",
    fr: "Du",
    pt: "De",
    sw: "Kuanzia",
    ar: "من",
    tw: "Firi",
    zu: "Kusukela",
  },
  toLabel: {
    en: "To",
    ha: "Zuwa",
    yo: "Títí di",
    ig: "Ruo",
    fr: "Au",
    pt: "Até",
    sw: "Hadi",
    ar: "إلى",
    tw: "Kɔsi",
    zu: "Kuze kube",
  },
  saving: {
    en: "Saving…",
    ha: "Ana ajiyewa…",
    yo: "Ń fi pamọ́…",
    ig: "Na-echekwa…",
    fr: "Enregistrement…",
    pt: "A guardar…",
    sw: "Inahifadhi…",
    ar: "جارٍ الحفظ…",
    tw: "Ɛrekora…",
    zu: "Iyalondoloza…",
  },
  saveTrip: {
    en: "Save trip",
    ha: "Ajiye tafiya",
    yo: "Fi ìrìn àjò pamọ́",
    ig: "Chekwaa njem",
    fr: "Enregistrer le voyage",
    pt: "Guardar viagem",
    sw: "Hifadhi safari",
    ar: "حفظ الرحلة",
    tw: "Kora akwantuo no",
    zu: "Londoloza uhambo",
  },
  cancel: {
    en: "Cancel",
    ha: "Soke",
    yo: "Fagilé",
    ig: "Kagbuo",
    fr: "Annuler",
    pt: "Cancelar",
    sw: "Ghairi",
    ar: "إلغاء",
    tw: "Twa mu",
    zu: "Khansela",
  },
  addTrip: {
    en: "Add a past trip",
    ha: "Ƙara tafiyar da ta gabata",
    yo: "Fi ìrìn àjò tí ó ti kọjá kún un",
    ig: "Tinye njem gara aga",
    fr: "Ajouter un voyage passé",
    pt: "Adicionar uma viagem passada",
    sw: "Ongeza safari ya zamani",
    ar: "إضافة رحلة سابقة",
    tw: "Fa akwantuo dedaw bi ka ho",
    zu: "Engeza uhambo lwakudala",
  },
};
