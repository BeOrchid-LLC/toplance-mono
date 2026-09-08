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
  removeConfirmTitle: L;
  removeConfirmBody: L;
  removeConfirmCta: L;
  cancel: L;
  openFailed: L;
  seeExample: L;
  hideExample: L;
  exampleCaption: L;
  commonlySentBack: L;
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
  /**
   * The button says "Replace", but nothing is replaced until a new file
   * is chosen: the row goes back to empty and the stored file is gone.
   * This is the one place a traveller can undo a reviewer's verdict on
   * their own document by accident, so it asks. `{name}` is the
   * requirement's own title, which stays in English per the brief.
   */
  removeConfirmTitle: {
    en: "Remove {name}?",
    ha: "A cire {name}?",
    yo: "Yọ {name} kúrò?",
    ig: "Wepụ {name}?",
    fr: "Supprimer {name} ?",
    pt: "Remover {name}?",
    sw: "Ondoa {name}?",
    ar: "إزالة {name}؟",
    tw: "Yi {name} firi hɔ?",
    zu: "Susa i-{name}?",
  },
  removeConfirmBody: {
    en: "The file you sent is deleted and the checklist row goes back to empty. Nothing replaces it until you upload again, and a document that was already checked has to be checked afresh.",
    ha: "Za a share fayil ɗin da ka aika kuma layin jerin zai koma babu komai. Babu abin da zai maye gurbinsa sai ka sake aikawa, kuma takardar da aka riga aka duba dole a sake duba ta.",
    yo: "A ó pa fáìlì tí o rán níṣẹ́ rẹ́, ọ̀wọ́ àkọsílẹ̀ náà yóò sì padà di òfìfo. Kò sí ohun tí yóò rọ́pò rẹ̀ àyàfi tí o bá tún gbé e sókè, ìwé tí a ti yẹ̀wò tẹ́lẹ̀ yóò sì nílò àyẹ̀wò tuntun.",
    ig: "A ga-ehichapụ faịlụ ị zitere, ahịrị ndepụta ahụ ga-alaghachikwa n'efu. Ọ dịghị ihe ga-anọchi ya ruo mgbe ị bugotere ọzọ, a ga-enyochakwa akwụkwọ e nyochaworo ọhụrụ.",
    fr: "Le fichier que vous avez envoyé est supprimé et la ligne de la liste redevient vide. Rien ne le remplace tant que vous n'en envoyez pas un autre, et un document déjà vérifié devra l'être à nouveau.",
    pt: "O ficheiro que enviou é eliminado e a linha da lista volta a ficar vazia. Nada o substitui até enviar outro, e um documento já verificado terá de ser verificado de novo.",
    sw: "Faili ulilotuma linafutwa na safu ya orodha inarudi tupu. Hakuna kinachochukua nafasi yake hadi upakie tena, na hati iliyokwisha kaguliwa itabidi ikaguliwe upya.",
    ar: "يُحذف الملف الذي أرسلته وتعود صفوف القائمة فارغة. لا شيء يحل محله حتى ترفع ملفًا آخر، والمستند الذي جرى التحقق منه سيلزم التحقق منه من جديد.",
    tw: "Wɔbɛpepa fael a wode kɔeɛ no, na nkyerɛwee no bɛsan ayɛ hunu. Biribiara rensi ananmu kɔsi sɛ wobɛsan de bi akɔ, na krataa a wɔahwɛ mu dada no, ɛsɛ sɛ wɔsan hwɛ mu foforɔ.",
    zu: "Ifayela olithumele liyasuswa futhi umugqa wohlu ubuyela ube ngaphandle kwalutho. Akukho okuthatha indawo yalo uze ulayishe futhi, futhi idokhumenti esivele ihloliwe kuzodingeka ihlolwe kabusha.",
  },
  removeConfirmCta: {
    en: "Remove it",
    ha: "Cire shi",
    yo: "Yọ ọ́ kúrò",
    ig: "Wepụ ya",
    fr: "Le supprimer",
    pt: "Remover",
    sw: "Iondoe",
    ar: "إزالته",
    tw: "Yi firi hɔ",
    zu: "Yisuse",
  },
  cancel: {
    en: "Keep it",
    ha: "Bar shi",
    yo: "Fi í sílẹ̀",
    ig: "Hapụ ya",
    fr: "Le garder",
    pt: "Manter",
    sw: "Iache",
    ar: "الإبقاء عليه",
    tw: "Gyaa no hɔ",
    zu: "Yigcine",
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
  seeExample: {
    en: "What does an acceptable one look like?",
    ha: "Yaya wanda ya dace yake kama?",
    yo: "Kí ni ìrísí èyí tí ó bá tọ́?",
    ig: "Gịnị ka nke a nabatara na-adị ka ya?",
    fr: "À quoi ressemble un document acceptable ?",
    pt: "Qual é o aspeto de um documento aceitável?",
    sw: "Inayokubalika inaonekanaje?",
    ar: "كيف يبدو المستند المقبول؟",
    tw: "Deɛ wɔgye tom no te sɛn?",
    zu: "Elamukelekayo libukeka kanjani?",
  },
  hideExample: {
    en: "Hide the example",
    ha: "Ɓoye misalin",
    yo: "Fi àpẹẹrẹ pamọ́",
    ig: "Zoo ihe atụ ahụ",
    fr: "Masquer l'exemple",
    pt: "Ocultar o exemplo",
    sw: "Ficha mfano",
    ar: "إخفاء المثال",
    tw: "Fa nhwɛsoɔ no sie",
    zu: "Fihla isibonelo",
  },
  exampleCaption: {
    en: "A drawing, not a real document. Yours will look different — these are the parts that have to be readable.",
    ha: "Zane ne, ba takarda ta gaske ba. Taka za ta bambanta — waɗannan su ne sassan da dole a iya karantawa.",
    yo: "Àwòrán ni, kì í ṣe ìwé gidi. Tirẹ yóò yàtọ̀ — àwọn wọ̀nyí ni apá tí ó gbọ́dọ̀ ṣeé kà.",
    ig: "Ọ bụ eserese, ọ bụghị ezigbo akwụkwọ. Nke gị ga-adị iche — ndị a bụ akụkụ ndị a ga-agụ agụ.",
    fr: "Un schéma, pas un vrai document. Le vôtre sera différent — voici les parties qui doivent être lisibles.",
    pt: "Um desenho, não um documento real. O seu será diferente — estas são as partes que têm de estar legíveis.",
    sw: "Ni mchoro, si hati halisi. Yako itaonekana tofauti — haya ndiyo maeneo yanayopaswa kusomeka.",
    ar: "هذا رسم توضيحي وليس مستنداً حقيقياً. سيبدو مستندك مختلفاً — هذه هي الأجزاء التي يجب أن تكون واضحة.",
    tw: "Ɛyɛ mfonini, ɛnyɛ krataa ankasa. Wo deɛ no bɛsono — yeinom ne afaafa a ɛsɛ sɛ wɔtumi kenkan.",
    zu: "Umdwebo, hhayi idokhumenti langempela. Elakho lizobukeka lihlukile — lezi yizingxenye okumele zifundeke.",
  },
  commonlySentBack: {
    en: "Most often sent back because:",
    ha: "Mafi yawan dalilin da ake mayarwa:",
    yo: "Ìdí tí a fi ń dá a padà jùlọ:",
    ig: "Ihe kacha eme ka e weghachi ya:",
    fr: "Le plus souvent renvoyé parce que :",
    pt: "Mais frequentemente devolvido porque:",
    sw: "Mara nyingi hurudishwa kwa sababu:",
    ar: "غالباً ما يُعاد لهذا السبب:",
    tw: "Deɛ enti a wɔsan de ba mpɛn pii:",
    zu: "Ivamise ukubuyiswa ngoba:",
  },
};
