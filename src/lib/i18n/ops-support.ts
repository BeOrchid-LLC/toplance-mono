import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The support queue, on both sides of it.
 *
 * One dictionary rather than two, because the agency's form and the
 * operator's queue name the same three states and would otherwise drift
 * into describing one thing with two vocabularies — the drift
 * `ops-nav.ts` was written to prevent.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, as `ops-common.ts` and `hero.ts` were.
 */
export const OPS_SUPPORT: {
  heading: L;
  intro: L;
  panel: L;
  empty: L;
  requestsWord: L;
  searchPlaceholder: L;
  anyState: L;
  stateOpen: L;
  stateClaimed: L;
  stateResolved: L;
  tableHead: { agency: L; subject: L; raised: L; state: L; assignee: L; actions: L };
  claim: L;
  release: L;
  resolve: L;
  unassigned: L;
  notFound: L;
} = {
  heading: {
    en: "Support",
    ha: "Tallafi",
    yo: "Ìrànlọ́wọ́",
    ig: "Nkwado",
    fr: "Assistance",
    pt: "Apoio",
    sw: "Msaada",
    ar: "الدعم",
    tw: "Mmoa",
    zu: "Usekelo",
  },
  intro: {
    en: "Agencies that have asked for help, and who is answering them.",
    ha: "Hukumomin da suka nemi taimako, da wanda ke amsa musu.",
    yo: "Àwọn ilé-iṣẹ́ tí wọ́n béèrè ìrànlọ́wọ́, àti ẹni tí ó ń dáhùn.",
    ig: "Ụlọ ọrụ rịọrọ enyemaka, na onye na-aza ha.",
    fr: "Les agences qui ont demandé de l'aide, et qui leur répond.",
    pt: "Agências que pediram ajuda, e quem lhes responde.",
    sw: "Mawakala walioomba msaada, na nani anayewajibu.",
    ar: "الوكالات التي طلبت المساعدة، ومن يرد عليها.",
    tw: "Adwumakuo a wɔabisa mmoa, ne obi a ɔrebua wɔn.",
    zu: "Ama-ejensi acele usizo, nokuthi ubani obaphendulayo.",
  },
  panel: {
    en: "Support requests",
    ha: "Buƙatun tallafi",
    yo: "Àwọn ìbéèrè ìrànlọ́wọ́",
    ig: "Arịrịọ nkwado",
    fr: "Demandes d'assistance",
    pt: "Pedidos de apoio",
    sw: "Maombi ya msaada",
    ar: "طلبات الدعم",
    tw: "Mmoa abisadeɛ",
    zu: "Izicelo zosekelo",
  },
  empty: {
    en: "No agency has asked for help yet.",
    ha: "Babu hukumar da ta nemi taimako tukuna.",
    yo: "Kò sí ilé-iṣẹ́ tí ó béèrè ìrànlọ́wọ́ síbẹ̀.",
    ig: "Ọ dịghị ụlọ ọrụ rịọrọ enyemaka ka ugbu a.",
    fr: "Aucune agence n'a encore demandé d'aide.",
    pt: "Nenhuma agência pediu ajuda ainda.",
    sw: "Hakuna wakala aliyeomba msaada bado.",
    ar: "لم تطلب أي وكالة المساعدة بعد.",
    tw: "Adwumakuo biara nnbisaa mmoa ɛ.",
    zu: "Ayikho i-ejensi ecele usizo okwamanje.",
  },
  requestsWord: {
    en: "requests", ha: "buƙatu", yo: "ìbéèrè", ig: "arịrịọ", fr: "demandes",
    pt: "pedidos", sw: "maombi", ar: "طلبات", tw: "abisadeɛ", zu: "izicelo",
  },
  searchPlaceholder: {
    en: "Search by agency or subject",
    ha: "Nemo ta hukuma ko batu",
    yo: "Wá nípa ilé-iṣẹ́ tàbí àkòrí",
    ig: "Chọọ site na ụlọ ọrụ ma ọ bụ isiokwu",
    fr: "Rechercher par agence ou sujet",
    pt: "Pesquisar por agência ou assunto",
    sw: "Tafuta kwa wakala au mada",
    ar: "ابحث حسب الوكالة أو الموضوع",
    tw: "Hwehwɛ adwumakuo anaa asɛmti so",
    zu: "Sesha nge-ejensi noma isihloko",
  },
  anyState: {
    en: "Any state", ha: "Kowane hali", yo: "Ipò yòówù", ig: "Ọnọdụ ọ bụla",
    fr: "Tout état", pt: "Qualquer estado", sw: "Hali yoyote", ar: "أي حالة",
    tw: "Tebea biara", zu: "Noma isiphi isimo",
  },
  stateOpen: {
    en: "Open", ha: "A buɗe", yo: "Ṣí sílẹ̀", ig: "Emeghere", fr: "Ouverte",
    pt: "Aberto", sw: "Wazi", ar: "مفتوح", tw: "Abue", zu: "Kuvuliwe",
  },
  stateClaimed: {
    en: "Claimed", ha: "An ɗauka", yo: "A gbà", ig: "Ewerela", fr: "Prise en charge",
    pt: "Atribuído", sw: "Imechukuliwa", ar: "قيد المعالجة", tw: "Wɔafa", zu: "Kuthathiwe",
  },
  stateResolved: {
    en: "Resolved", ha: "An warware", yo: "A yanjú", ig: "Edoziela", fr: "Résolue",
    pt: "Resolvido", sw: "Imetatuliwa", ar: "تم الحل", tw: "Wɔasiesie", zu: "Kuxazululiwe",
  },
  tableHead: {
    agency: {
      en: "Agency", ha: "Hukuma", yo: "Ilé-iṣẹ́", ig: "Ụlọ ọrụ", fr: "Agence",
      pt: "Agência", sw: "Wakala", ar: "الوكالة", tw: "Adwumakuo", zu: "I-ejensi",
    },
    subject: {
      en: "Subject", ha: "Batu", yo: "Àkòrí", ig: "Isiokwu", fr: "Sujet",
      pt: "Assunto", sw: "Mada", ar: "الموضوع", tw: "Asɛmti", zu: "Isihloko",
    },
    raised: {
      en: "Raised", ha: "An ɗaga", yo: "A gbé dìde", ig: "Ewelitere", fr: "Soumise",
      pt: "Enviado", sw: "Iliwasilishwa", ar: "أُرسل", tw: "Wɔde bae", zu: "Kufakwe",
    },
    state: {
      en: "Status", ha: "Matsayi", yo: "Ipò", ig: "Ọnọdụ", fr: "Statut",
      pt: "Estado", sw: "Hali", ar: "الحالة", tw: "Tebea", zu: "Isimo",
    },
    assignee: {
      en: "With", ha: "Tare da", yo: "Pẹ̀lú", ig: "Nʼaka", fr: "Chez",
      pt: "Com", sw: "Kwa", ar: "لدى", tw: "Wɔ", zu: "Ku-",
    },
    actions: {
      en: "Actions", ha: "Ayyuka", yo: "Ìṣe", ig: "Omume", fr: "Actions",
      pt: "Ações", sw: "Vitendo", ar: "إجراءات", tw: "Nneyɛe", zu: "Izenzo",
    },
  },
  claim: {
    en: "Claim", ha: "Ɗauka", yo: "Gbà", ig: "Were", fr: "Prendre en charge",
    pt: "Atribuir a mim", sw: "Chukua", ar: "استلام", tw: "Fa", zu: "Thatha",
  },
  release: {
    en: "Hand back", ha: "Mayar", yo: "Dá padà", ig: "Nyeghachi", fr: "Rendre",
    pt: "Devolver", sw: "Rudisha", ar: "إعادة", tw: "Fa san ma", zu: "Buyisela",
  },
  resolve: {
    en: "Mark resolved", ha: "Yiwa alama an warware", yo: "Sàmì pé a yanjú",
    ig: "Kaa ya edoziela", fr: "Marquer comme résolue", pt: "Marcar como resolvido",
    sw: "Weka kuwa imetatuliwa", ar: "وضع علامة تم الحل", tw: "Hyɛ no sɛ wɔasiesie",
    zu: "Maka njengexazululiwe",
  },
  unassigned: {
    en: "Nobody yet", ha: "Babu kowa tukuna", yo: "Kò sí ẹnìkan síbẹ̀",
    ig: "Ọ dịghị onye ka ugbu a", fr: "Personne encore", pt: "Ninguém ainda",
    sw: "Hakuna bado", ar: "لا أحد بعد", tw: "Obiara nni hɔ ɛ", zu: "Akekho okwamanje",
  },
  notFound: {
    en: "We could not find that support request.",
    ha: "Ba mu sami wannan buƙatar tallafi ba.",
    yo: "A kò rí ìbéèrè ìrànlọ́wọ́ yẹn.",
    ig: "Anyị ahụghị arịrịọ nkwado ahụ.",
    fr: "Nous n'avons pas trouvé cette demande d'assistance.",
    pt: "Não encontrámos esse pedido de apoio.",
    sw: "Hatukupata ombi hilo la msaada.",
    ar: "لم نتمكن من العثور على طلب الدعم هذا.",
    tw: "Yɛanhu saa mmoa abisadeɛ no.",
    zu: "Asisitholanga leso sicelo sosekelo.",
  },
};
