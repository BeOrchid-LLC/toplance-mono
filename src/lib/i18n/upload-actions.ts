import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * What `uploadDocument` says when it refuses a file.
 *
 * These were string literals inside the server action. So the one place
 * the product speaks to a traveller at the moment something has gone
 * wrong — mid-upload, usually on a phone, often on a bad connection —
 * spoke only English, in an interface offering ten languages to an
 * audience chosen partly because nobody else serves them in their own.
 *
 * `{size}` in `tooLarge` is filled from `MAX_UPLOAD_LABEL` at the call
 * site, so the limit is stated in one place and cannot drift from the
 * one the check actually enforces.
 *
 * English is the copy the action already had, give or take
 * `unsupportedType`, which is new because the check behind it is new.
 * Every other locale was translated in-house from that English, the same
 * way `DOCUMENTS` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const UPLOAD_ACTIONS: {
  empty: L;
  unsupportedType: L;
  tooLarge: L;
  notOnChecklist: L;
  uploadFailed: L;
} = {
  empty: {
    en: "Choose a file or take a photo first.",
    ha: "Ka zaɓi fayil ko ka ɗauki hoto tukuna.",
    yo: "Yan fáìlì kan tàbí ya àwòrán kí o tó tẹ̀síwájú.",
    ig: "Họrọ faịlụ ma ọ bụ see foto tupu ị gaa n'ihu.",
    fr: "Choisissez d'abord un fichier ou prenez une photo.",
    pt: "Escolha primeiro um ficheiro ou tire uma fotografia.",
    sw: "Chagua faili au piga picha kwanza.",
    ar: "اختر ملفاً أو التقط صورة أولاً.",
    tw: "Di kan paw faele bi anaa twa mfonini bi.",
    zu: "Khetha ifayela noma uthathe isithombe kuqala.",
  },

  unsupportedType: {
    en: "That file is not an image or a PDF. Photograph the document, or upload the PDF you were given.",
    ha: "Wannan fayil ba hoto ba ne ko PDF. Ka ɗauki hoton takardar, ko ka ɗora PDF ɗin da aka ba ka.",
    yo: "Fáìlì yẹn kì í ṣe àwòrán tàbí PDF. Ya àwòrán ìwé náà, tàbí gbé PDF tí wọ́n fún ọ sókè.",
    ig: "Faịlụ ahụ abụghị foto ma ọ bụ PDF. See foto akwụkwọ ahụ, ma ọ bụ bulite PDF e nyere gị.",
    fr: "Ce fichier n'est ni une image ni un PDF. Photographiez le document, ou téléversez le PDF qui vous a été remis.",
    pt: "Esse ficheiro não é uma imagem nem um PDF. Fotografe o documento, ou carregue o PDF que lhe foi entregue.",
    sw: "Faili hilo si picha wala PDF. Piga picha ya hati, au pakia PDF uliyopewa.",
    ar: "هذا الملف ليس صورة ولا ملف PDF. صوّر المستند، أو ارفع ملف PDF الذي استلمته.",
    tw: "Saa faele no nyɛ mfonini anaa PDF. Twa krataa no mfonini, anaa fa PDF a wɔde maa wo no bra.",
    zu: "Lelo fayela akulona isithombe noma i-PDF. Thatha isithombe sedokhumenti, noma ulayishe i-PDF oyinikeziwe.",
  },

  tooLarge: {
    en: "That file is over {size}. Photograph it again at a lower size.",
    ha: "Wannan fayil ya wuce {size}. Ka sake ɗaukar hoto a ƙaramin girma.",
    yo: "Fáìlì yẹn ju {size} lọ. Ya àwòrán rẹ̀ lẹ́ẹ̀kan sí i ní ìwọ̀n kékeré.",
    ig: "Faịlụ ahụ karịrị {size}. See ya ọzọ na obere nha.",
    fr: "Ce fichier dépasse {size}. Photographiez-le de nouveau dans une taille inférieure.",
    pt: "Esse ficheiro ultrapassa {size}. Fotografe-o novamente num tamanho menor.",
    sw: "Faili hilo linazidi {size}. Lipige picha tena kwa ukubwa mdogo zaidi.",
    ar: "حجم هذا الملف يتجاوز {size}. صوّره مرة أخرى بحجم أصغر.",
    tw: "Saa faele no boro {size}. San twa ne mfonini wɔ kɛseɛ ketewa mu.",
    zu: "Lelo fayela lingaphezu kuka-{size}. Liphinde ulithathe ngosayizi omncane.",
  },

  notOnChecklist: {
    en: "That document is not on your checklist.",
    ha: "Wannan takarda ba ta cikin jerin abubuwanka ba.",
    yo: "Ìwé yẹn kò sí nínú àkọsílẹ̀ rẹ.",
    ig: "Akwụkwọ ahụ adịghị na ndepụta gị.",
    fr: "Ce document ne figure pas sur votre liste.",
    pt: "Esse documento não consta da sua lista.",
    sw: "Hati hiyo haipo kwenye orodha yako.",
    ar: "هذا المستند ليس ضمن قائمتك.",
    tw: "Saa krataa no nni wo krataa nhyehyɛeɛ no mu.",
    zu: "Lelo dokhumenti alikho ohlwini lwakho.",
  },

  uploadFailed: {
    en: "That upload did not complete. Your place is saved — try again when you have signal.",
    ha: "Ɗorawar ba ta kammala ba. An adana matsayinka — ka sake gwadawa idan ka sami sigina.",
    yo: "Ìgbésókè náà kò parí. A ti fi ipò rẹ pamọ́ — gbìyànjú lẹ́ẹ̀kan sí i nígbà tí o bá ní àmì-nẹ́tíwọ́kì.",
    ig: "Nbulite ahụ emechaghị. E chekwara ọnọdụ gị — nwaa ọzọ mgbe ị nwetara netwọk.",
    fr: "Le téléversement ne s'est pas terminé. Votre progression est enregistrée — réessayez quand vous aurez du réseau.",
    pt: "O carregamento não foi concluído. O seu progresso está guardado — tente de novo quando tiver rede.",
    sw: "Upakiaji haukukamilika. Maendeleo yako yamehifadhiwa — jaribu tena utakapokuwa na mtandao.",
    ar: "لم يكتمل الرفع. تم حفظ تقدّمك — أعد المحاولة عند توفّر الشبكة.",
    tw: "Faele no amma awieɛ. Yɛakora deɛ woayɛ so — sɔ hwɛ bio sɛ wonya nsɛnkyerɛnneɛ a.",
    zu: "Ukulayisha akuqedanga. Inqubekela phambili yakho ilondoloziwe — zama futhi lapho unesignali.",
  },
};
