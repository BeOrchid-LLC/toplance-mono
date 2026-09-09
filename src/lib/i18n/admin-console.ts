import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The chrome both operator consoles share: the rail's own controls, and
 * the words a filtered table needs when it is showing less than it
 * holds.
 *
 * Separate from `OPS_COMMON` and `AGENCY` because it belongs to neither
 * console — `AdminRail`, `AdminMobileNav` and `TableToolbar` render on
 * both, and a copy in each dictionary is the drift `ops-nav.ts` was
 * written to prevent. Anything naming a corridor, a case or a client
 * belongs in that console's own dictionary instead.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `ops-common.ts` were.
 */
export const ADMIN_CONSOLE: {
  collapseMenu: L;
  expandMenu: L;
  openMenu: L;
  menuTitle: L;
  showingTemplate: L;
  rowsWord: L;
  ordinalHeading: L;
  noMatch: L;
  clearFilters: L;
  pagesLabel: L;
  rowsPerPage: L;
  pageOfTemplate: L;
  previousPage: L;
  nextPage: L;
} = {
  collapseMenu: {
    en: "Collapse the menu",
    ha: "Rufe menu",
    yo: "Ṣé àkójọ àṣàyàn",
    ig: "Mechie menu",
    fr: "Réduire le menu",
    pt: "Recolher o menu",
    sw: "Kunja menyu",
    ar: "طيّ القائمة",
    tw: "Bum menu no",
    zu: "Goqa imenyu",
  },
  expandMenu: {
    en: "Expand the menu",
    ha: "Buɗe menu",
    yo: "Ṣí àkójọ àṣàyàn",
    ig: "Gbasaa menu",
    fr: "Développer le menu",
    pt: "Expandir o menu",
    sw: "Panua menyu",
    ar: "توسيع القائمة",
    tw: "Trɛ menu no mu",
    zu: "Nweba imenyu",
  },
  openMenu: {
    en: "Open the menu",
    ha: "Buɗe menu",
    yo: "Ṣí àkójọ àṣàyàn",
    ig: "Mepee menu",
    fr: "Ouvrir le menu",
    pt: "Abrir o menu",
    sw: "Fungua menyu",
    ar: "افتح القائمة",
    tw: "Bue menu no",
    zu: "Vula imenyu",
  },
  menuTitle: {
    en: "Console menu",
    ha: "Menu na na'ura",
    yo: "Àkójọ àṣàyàn kọ́ńsọ̀",
    ig: "Menu console",
    fr: "Menu de la console",
    pt: "Menu da consola",
    sw: "Menyu ya kiweko",
    ar: "قائمة وحدة التحكم",
    tw: "Console menu",
    zu: "Imenyu yekhonsoli",
  },
  /** `{shown}` and `{total}` are literal markers the call site replaces. */
  showingTemplate: {
    en: "Showing {shown} of {total}",
    ha: "Ana nuna {shown} daga {total}",
    yo: "Ń fi {shown} nínú {total} hàn",
    ig: "Na-egosi {shown} n'ime {total}",
    fr: "Affichage de {shown} sur {total}",
    pt: "A mostrar {shown} de {total}",
    sw: "Inaonyesha {shown} kati ya {total}",
    ar: "عرض {shown} من {total}",
    tw: "Ɛreda {shown} wɔ {total} mu adi",
    zu: "Kukhonjiswa {shown} kwangu-{total}",
  },
  /**
   * The ordinal column's heading.
   *
   * A bare "#" in every locale. It is a symbol rather than a word, and
   * the column beneath it is digits — translating the heading would
   * make it strange without making it clearer.
   */
  ordinalHeading: {
    en: "#",
    ha: "#",
    yo: "#",
    ig: "#",
    fr: "#",
    pt: "#",
    sw: "#",
    ar: "#",
    tw: "#",
    zu: "#",
  },
  rowsWord: {
    en: "rows",
    ha: "layuka",
    yo: "ìlà",
    ig: "ahịrị",
    fr: "lignes",
    pt: "linhas",
    sw: "safu",
    ar: "صفوف",
    tw: "nsɔre",
    zu: "imigqa",
  },
  noMatch: {
    en: "Nothing here matches this search.",
    ha: "Babu abin da ya yi daidai da wannan binciken.",
    yo: "Kò sí ohunkóhun níbí tí ó bá àwárí yìí mu.",
    ig: "Ọ dịghị ihe ebe a dabara na nchọta a.",
    fr: "Rien ici ne correspond à cette recherche.",
    pt: "Nada aqui corresponde a esta pesquisa.",
    sw: "Hakuna kinacholingana na utafutaji huu.",
    ar: "لا شيء هنا يطابق هذا البحث.",
    tw: "Biribiara nni ha a ɛne saa hwehwɛ yi hyia.",
    zu: "Akukho lutha olufana nalolu sesho.",
  },
  clearFilters: {
    en: "Clear the filters",
    ha: "Share matattara",
    yo: "Pa àwọn àsẹ́ rẹ́",
    ig: "Hichapụ ihe nzacha",
    fr: "Effacer les filtres",
    pt: "Limpar os filtros",
    sw: "Futa vichujio",
    ar: "امسح عوامل التصفية",
    tw: "Yi nsɛnhwɛso no fi hɔ",
    zu: "Sula izihlungi",
  },
  rowsPerPage: {
    en: "Rows per page",
    ha: "Layuka kowane shafi",
    yo: "Ìlà fún ojú ìwé kọ̀ọ̀kan",
    ig: "Ahịrị kwa peeji",
    fr: "Lignes par page",
    pt: "Linhas por página",
    sw: "Safu kwa kila ukurasa",
    ar: "صفوف لكل صفحة",
    tw: "Nsɔre wɔ krataafa biara so",
    zu: "Imigqa ekhasini ngalinye",
  },
  /** Names the pager as a landmark; never shown, read aloud. */
  pagesLabel: {
    en: "Pages",
    ha: "Shafuka",
    yo: "Àwọn ojú ìwé",
    ig: "Peeji",
    fr: "Pages",
    pt: "Páginas",
    sw: "Kurasa",
    ar: "الصفحات",
    tw: "Nkrataafa",
    zu: "Amakhasi",
  },
  /** `{page}` and `{pages}` are literal markers the call site replaces. */
  pageOfTemplate: {
    en: "Page {page} of {pages}",
    ha: "Shafi {page} na {pages}",
    yo: "Ojú ìwé {page} nínú {pages}",
    ig: "Peeji {page} n'ime {pages}",
    fr: "Page {page} sur {pages}",
    pt: "Página {page} de {pages}",
    sw: "Ukurasa {page} kati ya {pages}",
    ar: "صفحة {page} من {pages}",
    tw: "Krataafa {page} wɔ {pages} mu",
    zu: "Ikhasi {page} kwangu-{pages}",
  },
  previousPage: {
    en: "Previous page",
    ha: "Shafin da ya gabata",
    yo: "Ojú ìwé tí ó ṣáájú",
    ig: "Peeji gara aga",
    fr: "Page précédente",
    pt: "Página anterior",
    sw: "Ukurasa uliopita",
    ar: "الصفحة السابقة",
    tw: "Krataafa a edi kan",
    zu: "Ikhasi elidlule",
  },
  nextPage: {
    en: "Next page",
    ha: "Shafi na gaba",
    yo: "Ojú ìwé tí ó tẹ̀lé",
    ig: "Peeji na-esote",
    fr: "Page suivante",
    pt: "Página seguinte",
    sw: "Ukurasa unaofuata",
    ar: "الصفحة التالية",
    tw: "Krataafa a edi so",
    zu: "Ikhasi elilandelayo",
  },
};
