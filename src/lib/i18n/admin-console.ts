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
  skipToContent: L;
  collapseMenu: L;
  expandMenu: L;
  openMenu: L;
  menuTitle: L;
  ordinalHeading: L;
  noMatch: L;
  clearFilters: L;
  pagesLabel: L;
  rowsPerPage: L;
  previousPage: L;
  nextPage: L;
  rangeTemplate: L;
  sortLabel: L;
  sortAsc: L;
  sortDesc: L;
  sortNewest: L;
  sortOldest: L;
  sortHigh: L;
  sortLow: L;
  sortFirst: L;
} = {
  /**
   * The skip link's own label. It belongs here rather than in either
   * console's dictionary for the same reason the rail's controls do:
   * `SkipLink` renders on every surface in the product, and a copy per
   * console is the drift this file exists to prevent.
   */
  skipToContent: {
    en: "Skip to content",
    ha: "Tsallake zuwa abun ciki",
    yo: "Fò sí àkóónú",
    ig: "Wụga na ọdịnaya",
    fr: "Aller au contenu",
    pt: "Ir para o conteúdo",
    sw: "Rukia hadi maudhui",
    ar: "تخطَّ إلى المحتوى",
    tw: "Tra kɔ emu nsɛm no so",
    zu: "Yeqela kokuqukethwe",
  },
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
    en: "Workspace menu",
    ha: "Menu na wurin aiki",
    yo: "Àkójọ àṣàyàn ibi-iṣẹ́",
    ig: "Menu ebe ọrụ",
    fr: "Menu de l'espace de travail",
    pt: "Menu do espaço de trabalho",
    sw: "Menyu ya eneo la kazi",
    ar: "قائمة مساحة العمل",
    tw: "Adwumayɛbea menu",
    zu: "Imenyu yendawo yokusebenzela",
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
  /**
   * The pager's range, Gmail's way: "26–50 of 104". `{start}`, `{end}`
   * and `{total}` are literal markers the call site replaces; see
   * `pageRange`. It is also the button that opens the rows-per-page menu.
   */
  rangeTemplate: {
    en: "{start}–{end} of {total}",
    ha: "{start}–{end} daga {total}",
    yo: "{start}–{end} nínú {total}",
    ig: "{start}–{end} n'ime {total}",
    fr: "{start}–{end} sur {total}",
    pt: "{start}–{end} de {total}",
    sw: "{start}–{end} kati ya {total}",
    ar: "{start}–{end} من {total}",
    tw: "{start}–{end} wɔ {total} mu",
    zu: "{start}–{end} kwangu-{total}",
  },
  /**
   * The accessible name of a table's sort control. Never shown: the
   * control shows the order it is set to, and an icon says what it is.
   */
  sortLabel: {
    en: "Sort",
    ha: "Tsara",
    yo: "Ṣètò",
    ig: "Hazie",
    fr: "Trier",
    pt: "Ordenar",
    sw: "Panga",
    ar: "ترتيب",
    tw: "Hyehyɛ",
    zu: "Hlela",
  },
  /**
   * The sort control's options, one pair per kind of column. `{label}`
   * is the column's own heading, so the option names the column the
   * reader can see. A–Z and Z–A for text; newest and oldest for dates;
   * high-to-low and low-to-high for counts. See `buildSortOptions`.
   */
  sortAsc: {
    en: "{label}: A–Z",
    ha: "{label}: A–Z",
    yo: "{label}: A–Z",
    ig: "{label}: A–Z",
    fr: "{label}: A–Z",
    pt: "{label}: A–Z",
    sw: "{label}: A–Z",
    ar: "{label}: أ–ي",
    tw: "{label}: A–Z",
    zu: "{label}: A–Z",
  },
  /** See `sortAsc`. */
  sortDesc: {
    en: "{label}: Z–A",
    ha: "{label}: Z–A",
    yo: "{label}: Z–A",
    ig: "{label}: Z–A",
    fr: "{label}: Z–A",
    pt: "{label}: Z–A",
    sw: "{label}: Z–A",
    ar: "{label}: ي–أ",
    tw: "{label}: Z–A",
    zu: "{label}: Z–A",
  },
  /** See `sortAsc`. */
  sortNewest: {
    en: "{label}: newest first",
    ha: "{label}: sabuwa da farko",
    yo: "{label}: tuntun ní àkọ́kọ́",
    ig: "{label}: nke ọhụrụ na mbụ",
    fr: "{label} : plus récent d'abord",
    pt: "{label}: mais recente primeiro",
    sw: "{label}: mpya kwanza",
    ar: "{label}: الأحدث أولاً",
    tw: "{label}: foforo di kan",
    zu: "{label}: okusha kuqala",
  },
  /** See `sortAsc`. */
  sortOldest: {
    en: "{label}: oldest first",
    ha: "{label}: tsohuwa da farko",
    yo: "{label}: àtijọ́ ní àkọ́kọ́",
    ig: "{label}: nke ochie na mbụ",
    fr: "{label} : plus ancien d'abord",
    pt: "{label}: mais antigo primeiro",
    sw: "{label}: ya zamani kwanza",
    ar: "{label}: الأقدم أولاً",
    tw: "{label}: dada di kan",
    zu: "{label}: okudala kuqala",
  },
  /** See `sortAsc`. */
  sortHigh: {
    en: "{label}: high to low",
    ha: "{label}: daga babba zuwa ƙarami",
    yo: "{label}: láti gíga sí kékeré",
    ig: "{label}: site n'elu ruo n'ala",
    fr: "{label} : décroissant",
    pt: "{label}: do maior para o menor",
    sw: "{label}: kubwa hadi ndogo",
    ar: "{label}: من الأعلى إلى الأدنى",
    tw: "{label}: kɛse kɔ ketewa",
    zu: "{label}: kusuka phezulu kuya phansi",
  },
  /** See `sortAsc`. */
  sortLow: {
    en: "{label}: low to high",
    ha: "{label}: daga ƙarami zuwa babba",
    yo: "{label}: láti kékeré sí gíga",
    ig: "{label}: site n'ala ruo n'elu",
    fr: "{label} : croissant",
    pt: "{label}: do menor para o maior",
    sw: "{label}: ndogo hadi kubwa",
    ar: "{label}: من الأدنى إلى الأعلى",
    tw: "{label}: ketewa kɔ kɛse",
    zu: "{label}: kusuka phansi kuya phezulu",
  },
  /**
   * An option for a column ordered by rank rather than by its words —
   * a status whose order is "ready, then in review, then…". `{value}`
   * is the status that leads, in the cell's own words.
   */
  sortFirst: {
    en: "{value} first",
    ha: "{value} da farko",
    yo: "{value} ní àkọ́kọ́",
    ig: "{value} na mbụ",
    fr: "{value} d'abord",
    pt: "{value} primeiro",
    sw: "{value} kwanza",
    ar: "{value} أولاً",
    tw: "{value} di kan",
    zu: "{value} kuqala",
  },
};
