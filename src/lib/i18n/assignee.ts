import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The words of `AssigneeSelect`, the one assignee dropdown the demo
 * queue and the agency's cases share.
 *
 * `assignToMe` is the translation the enquiry queue's "Assign to me"
 * button carried (`OPS_ENQUIRIES.claimButton`, itself matched to the
 * support queue on 2026-09-11), moved here when the button became an
 * option in the dropdown — the client's review of 17 September. So the
 * same act reads the same on every screen.
 *
 * NEEDS NATIVE REVIEW before launch: translated in-house from the English.
 */
export const ASSIGNEE: { unassigned: L; assignToMe: L } = {
  unassigned: {
    en: "Unassigned",
    ha: "Ba a ba kowa ba",
    yo: "Kò sí ẹni tí ó gbà á",
    ig: "Enyebeghị onye ọ bụla",
    fr: "Non attribuée",
    pt: "Sem responsável",
    sw: "Haijakabidhiwa",
    ar: "غير مُسندة",
    tw: "Wɔmfaa mma obiara",
    zu: "Ayabelwe muntu",
  },
  assignToMe: {
    en: "Assign to me",
    ha: "Ba ni wannan",
    yo: "Yàn án fún mi",
    ig: "Kenye m ya",
    fr: "M'attribuer",
    pt: "Atribuir a mim",
    sw: "Nikabidhi mimi",
    ar: "إسناد إليّ",
    tw: "Fa ma me",
    zu: "Ngabele mina",
  },
};
