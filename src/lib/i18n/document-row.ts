import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * One checklist row's chrome — the document's own name and state come
 * from the database and stay in English, per the brief's rule against
 * translating requirement text; everything here is the row's fixed
 * furniture around it.
 *
 * English values are the copy the row already had; every other locale
 * was translated in-house from that English, the same way `HERO` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const DOCUMENT_ROW: {
  viewAria: L;
  replaceAria: L;
  takePhotoAria: L;
  uploadAria: L;
  view: L;
  replace: L;
  takePhoto: L;
  uploading: L;
  replaceFile: L;
  upload: L;
  removedToast: L;
  openFailed: L;
} = {
  viewAria: {
    en: "View {name}",
    ha: "Duba {name}",
    yo: "Wo {name}",
    ig: "Lee {name}",
    fr: "Voir {name}",
    pt: "Ver {name}",
    sw: "Ona {name}",
    ar: "عرض {name}",
    tw: "Hwɛ {name}",
    zu: "Buka {name}",
  },
  replaceAria: {
    en: "Replace {name}",
    ha: "Maye gurbin {name}",
    yo: "Rọ́pò {name}",
    ig: "Dochie {name}",
    fr: "Remplacer {name}",
    pt: "Substituir {name}",
    sw: "Badilisha {name}",
    ar: "استبدال {name}",
    tw: "Sesa {name}",
    zu: "Shintsha {name}",
  },
  takePhotoAria: {
    en: "Take a photo of {name}",
    ha: "Ɗauki hoto na {name}",
    yo: "Ya fọ́tò ti {name}",
    ig: "Se foto nke {name}",
    fr: "Prendre une photo de {name}",
    pt: "Tirar uma fotografia de {name}",
    sw: "Piga picha ya {name}",
    ar: "التقاط صورة لـ {name}",
    tw: "Fa mfoni a ɛfa {name} ho",
    zu: "Thatha isithombe se-{name}",
  },
  uploadAria: {
    en: "Upload {name}",
    ha: "Loda {name}",
    yo: "Gbé {name} sórí ayélujára",
    ig: "Bugo {name}",
    fr: "Téléverser {name}",
    pt: "Carregar {name}",
    sw: "Pakia {name}",
    ar: "رفع {name}",
    tw: "To {name} soro",
    zu: "Layisha {name}",
  },
  view: {
    en: "View",
    ha: "Duba",
    yo: "Wò",
    ig: "Lee",
    fr: "Voir",
    pt: "Ver",
    sw: "Ona",
    ar: "عرض",
    tw: "Hwɛ",
    zu: "Buka",
  },
  replace: {
    en: "Replace",
    ha: "Maye gurbi",
    yo: "Rọ́pò",
    ig: "Dochie",
    fr: "Remplacer",
    pt: "Substituir",
    sw: "Badilisha",
    ar: "استبدال",
    tw: "Sesa",
    zu: "Shintsha",
  },
  takePhoto: {
    en: "Take a photo",
    ha: "Ɗauki hoto",
    yo: "Ya fọ́tò kan",
    ig: "Se foto",
    fr: "Prendre une photo",
    pt: "Tirar uma fotografia",
    sw: "Piga picha",
    ar: "التقاط صورة",
    tw: "Fa mfoni bi",
    zu: "Thatha isithombe",
  },
  uploading: {
    en: "Uploading…",
    ha: "Ana lodawa…",
    yo: "Ń gbé sórí ayélujára…",
    ig: "Na-ebugo…",
    fr: "Téléversement…",
    pt: "A carregar…",
    sw: "Inapakia…",
    ar: "جارٍ الرفع…",
    tw: "Ɛreto soro…",
    zu: "Iyalayisha…",
  },
  replaceFile: {
    en: "Replace file",
    ha: "Maye gurbin fayil",
    yo: "Rọ́pò fáìlì",
    ig: "Dochie faịlụ",
    fr: "Remplacer le fichier",
    pt: "Substituir ficheiro",
    sw: "Badilisha faili",
    ar: "استبدال الملف",
    tw: "Sesa faele no",
    zu: "Shintsha ifayela",
  },
  upload: {
    en: "Upload",
    ha: "Loda",
    yo: "Gbé sórí ayélujára",
    ig: "Bugo",
    fr: "Téléverser",
    pt: "Carregar",
    sw: "Pakia",
    ar: "رفع",
    tw: "To soro",
    zu: "Layisha",
  },
  removedToast: {
    en: "{name} removed",
    ha: "An cire {name}",
    yo: "A ti yọ {name} kúrò",
    ig: "Ewepụla {name}",
    fr: "{name} supprimé",
    pt: "{name} removido",
    sw: "{name} imeondolewa",
    ar: "تمت إزالة {name}",
    tw: "Woayi {name} afiri hɔ",
    zu: "{name} isusiwe",
  },
  openFailed: {
    en: "That file could not be opened.",
    ha: "Ba a iya buɗe wannan fayil ɗin ba.",
    yo: "A kò lè ṣí fáìlì yẹn.",
    ig: "Enweghị ike imepe faịlụ ahụ.",
    fr: "Ce fichier n'a pas pu être ouvert.",
    pt: "Não foi possível abrir esse ficheiro.",
    sw: "Faili hilo halikuweza kufunguliwa.",
    ar: "تعذّر فتح هذا الملف.",
    tw: "Wɔantumi ammue saa faele no.",
    zu: "Leli fayela alikwazanga ukuvulwa.",
  },
};
