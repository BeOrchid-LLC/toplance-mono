import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/cases/[id]/page.tsx` — the case review screen's own copy.
 * The Messages panel reuses `MESSAGES.panelLabel` (`@/lib/i18n/messages`)
 * rather than a second translation of the same word, and the
 * "Traveler"/staff role words live in `OPS_COMMON`.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const CASE_REVIEW: {
  metaTitle: L;
  backToClients: L;
  ownedByPrefix: L;
  unassignedNoOwner: L;
  completion: { of: L; verified: L; uploaded: L };
  caseNotesPanel: L;
  travelerReadsThese: L;
  docSets: { awaitingReview: L; alreadyJudged: L; notUploadedYet: L };
  noChecklistYet: L;
  decisionPanel: L;
  travelHistoryPanel: L;
  noTrips: L;
  messagesUnheld: L;
} = {
  metaTitle: {
    en: "Case review",
    ha: "Nazarin shari'a",
    yo: "Àyẹ̀wò ẹjọ́",
    ig: "Nyocha ikpe",
    fr: "Examen du dossier",
    pt: "Revisão do processo",
    sw: "Ukaguzi wa kesi",
    ar: "مراجعة الحالة",
    tw: "Asɛm ho nhwehwɛmu",
    zu: "Ukubuyekezwa kwecala",
  },
  backToClients: {
    en: "Back to clients",
    ha: "Koma ga abokan ciniki",
    yo: "Padà sí àwọn oníbàárà",
    ig: "Laghachi na ndị ahịa",
    fr: "Retour aux clients",
    pt: "Voltar aos clientes",
    sw: "Rudi kwa wateja",
    ar: "العودة إلى العملاء",
    tw: "San kɔ adetɔfoɔ hɔ",
    zu: "Buyela kumakhasimende",
  },
  ownedByPrefix: {
    en: "Owned by",
    ha: "Mai kula shine",
    yo: "Ẹni tí ó ń darí",
    ig: "Onye nlekọta ya bụ",
    fr: "Suivi par",
    pt: "A cargo de",
    sw: "Inamilikiwa na",
    ar: "يتولاها",
    tw: "Ne wura ne",
    zu: "Kunikazi",
  },
  unassignedNoOwner: {
    en: "Unassigned — no owner yet",
    ha: "Ba a ba wa kowa ba — babu mai kula tukuna",
    yo: "Aláìní olùdarí — kò tí ì ní olùdarí",
    ig: "Enyeghị onye ọrụ — enwebeghị onye nlekọta",
    fr: "Non attribué — pas encore de responsable",
    pt: "Não atribuído — ainda sem responsável",
    sw: "Haijapangiwa — bado hakuna mmiliki",
    ar: "غير مُسند — لا يوجد مسؤول بعد",
    tw: "Wɔnhyɛɛ obiara — onni obi a wahwɛ so",
    zu: "Akwabelwe muntu — akukho mnikazi okwamanje",
  },
  completion: {
    of: {
      en: "of",
      ha: "daga cikin",
      yo: "nínú",
      ig: "n'ime",
      fr: "sur",
      pt: "de",
      sw: "kati ya",
      ar: "من أصل",
      tw: "wɔ",
      zu: "kwezingu-",
    },
    verified: {
      en: "verified",
      ha: "an tabbatar",
      yo: "tí a jẹ́rìí sí",
      ig: "kwadoro",
      fr: "vérifiés",
      pt: "verificados",
      sw: "vimethibitishwa",
      ar: "تم التحقق منها",
      tw: "wɔahwɛ mu",
      zu: "aqinisekisiwe",
    },
    uploaded: {
      en: "uploaded",
      ha: "an ɗora",
      yo: "tí a gbé sókè",
      ig: "abugoro",
      fr: "téléversés",
      pt: "carregados",
      sw: "vimepakiwa",
      ar: "تم رفعها",
      tw: "wɔde ato so",
      zu: "alayishiwe",
    },
  },
  caseNotesPanel: {
    en: "Case notes",
    ha: "Bayanan shari'a",
    yo: "Àwọn àkíyèsí ẹjọ́",
    ig: "Ndetu ikpe",
    fr: "Notes du dossier",
    pt: "Notas do processo",
    sw: "Vidokezo vya kesi",
    ar: "ملاحظات الحالة",
    tw: "Asɛm ho nsɛm",
    zu: "Amanothi ecala",
  },
  travelerReadsThese: {
    en: "Traveler reads these",
    ha: "Matafiyi yana karanta waɗannan",
    yo: "Arìnrìn-àjò máa ń kà wọ́n",
    ig: "Onye njem na-agụ ndị a",
    fr: "Le voyageur les lit",
    pt: "O viajante lê estas notas",
    sw: "Msafiri anasoma haya",
    ar: "يقرأ المسافر هذه الملاحظات",
    tw: "Akwantufoɔ no kenkan yeinom",
    zu: "Isihambi siyawafunda lawa",
  },
  docSets: {
    awaitingReview: {
      en: "Awaiting review",
      ha: "Ana jiran bita",
      yo: "Ń dúró de àyẹ̀wò",
      ig: "Na-eche nyocha",
      fr: "En attente d'examen",
      pt: "A aguardar revisão",
      sw: "Inasubiri ukaguzi",
      ar: "بانتظار المراجعة",
      tw: "Ɛretwɛn nhwehwɛmu",
      zu: "Ilinde ukubuyekezwa",
    },
    alreadyJudged: {
      en: "Already judged",
      ha: "An riga an yanke hukunci",
      yo: "A ti ṣèdájọ́ rẹ̀ tẹ́lẹ̀",
      ig: "Ekpebiela ihe banyere ya",
      fr: "Déjà traités",
      pt: "Já avaliados",
      sw: "Tayari yamehukumiwa",
      ar: "تم البتّ فيها بالفعل",
      tw: "Wɔasi gyinaeɛ dedaw",
      zu: "Sekwenziwe isinqumo",
    },
    notUploadedYet: {
      en: "Not uploaded yet",
      ha: "Ba a ɗora tukuna ba",
      yo: "Kò tí ì gbé e sókè",
      ig: "Ebugobeghị",
      fr: "Pas encore téléversés",
      pt: "Ainda não carregados",
      sw: "Bado havijapakiwa",
      ar: "لم تُرفع بعد",
      tw: "Wɔmfa mmaa so",
      zu: "Akukalayishwa",
    },
  },
  noChecklistYet: {
    en: "No checklist yet — this traveler has not finished intake.",
    ha: "Babu jerin abubuwa tukuna — wannan matafiyi bai kammala shigarwa ba.",
    yo: "Kò tí ì sí àkọsílẹ̀ — arìnrìn-àjò yìí kò tí ì parí ìforúkọsílẹ̀.",
    ig: "Enweghị ndepụta akwụkwọ ka a ga-eme — onye njem a emechabeghị ntinye ozi.",
    fr: "Pas encore de liste — ce voyageur n'a pas terminé son admission.",
    pt: "Ainda sem lista — este viajante ainda não terminou a admissão.",
    sw: "Bado hakuna orodha — msafiri huyu hajamaliza kujiandikisha.",
    ar: "لا توجد قائمة بعد — لم ينهِ هذا المسافر عملية الاستقبال.",
    tw: "Nhyehyɛeɛ biara nni hɔ ansa — akwantufoɔ yi nnwiee nsɛmmisa no.",
    zu: "Akukho uhlu okwamanje — lesi sihambi asikaqedi ukubhaliswa.",
  },
  decisionPanel: {
    en: "Decision",
    ha: "Shawara",
    yo: "Ìpinnu",
    ig: "Mkpebi",
    fr: "Décision",
    pt: "Decisão",
    sw: "Uamuzi",
    ar: "القرار",
    tw: "Gyinaeɛ",
    zu: "Isinqumo",
  },
  travelHistoryPanel: {
    en: "Travel history",
    ha: "Tarihin tafiye-tafiye",
    yo: "Ìtàn ìrìn àjò",
    ig: "Akụkọ ihe mere eme njem",
    fr: "Historique de voyages",
    pt: "Histórico de viagens",
    sw: "Historia ya safari",
    ar: "سجل السفر",
    tw: "Akwantuo mu abakɔsɛm",
    zu: "Umlando wokuhamba",
  },
  noTrips: {
    en: "This traveler has recorded no past trips.",
    ha: "Wannan matafiyi bai rubuta wata tafiya ta baya ba.",
    yo: "Arìnrìn-àjò yìí kò ti kọ ìrìn àjò kankan tí ó ti ṣe sílẹ̀.",
    ig: "Onye njem a edekọbeghị njem ọ bụla gara aga.",
    fr: "Ce voyageur n'a enregistré aucun voyage passé.",
    pt: "Este viajante não registou nenhuma viagem anterior.",
    sw: "Msafiri huyu hajarekodi safari yoyote ya nyuma.",
    ar: "لم يسجّل هذا المسافر أي رحلات سابقة.",
    tw: "Akwantufoɔ yi nkyerɛw akwantuo biara a watu dedaw.",
    zu: "Lesi sihambi asirekhodile uhambo lwangaphambilini.",
  },
  /**
   * In place of the composer while nobody holds the case.
   *
   * `canWriteMessages` refuses the send until the case has a handler,
   * so a composer here would be a box that takes what you type and
   * then a toast that refuses it. It names the two ways out because
   * both are one click away on this same screen.
   */
  messagesUnheld: {
    en: "Nobody is handling this case yet. Take it, or hand it to a colleague, and the thread opens.",
    ha: "Har yanzu babu wanda ke kula da wannan fayil. Karɓe shi, ko ka mika shi ga abokin aiki, sannan zancen zai buɗe.",
    yo: "Kò tíì sí ẹni tí ó ń bójú tó fáìlì yìí. Gbà á, tàbí fi í lé alábàáṣiṣẹ́ lọ́wọ́, ọ̀rọ̀ náà yóò sì ṣí.",
    ig: "Ọ dịghị onye na-elekọta faịlụ a ugbu a. Were ya, ma ọ bụ nyefee ya onye ọrụ ibe gị, mkparịta ụka ga-emeghe.",
    fr: "Personne ne gère encore ce dossier. Prenez-le, ou confiez-le à un collègue, et la conversation s'ouvre.",
    pt: "Ainda ninguém está a tratar deste processo. Assuma-o, ou entregue-o a um colega, e a conversa abre.",
    sw: "Bado hakuna anayeshughulikia faili hili. Lichukue, au mkabidhi mwenzako, na mazungumzo yatafunguka.",
    ar: "لا أحد يتولى هذا الملف بعد. تولَّه، أو سلّمه إلى زميل، وستُفتح المحادثة.",
    tw: "Obiara nhwɛ fael yi so nnya. Gye, anaa fa ma wo yɔnko adwumayɛfoɔ, na nkɔmmɔ no bɛbue.",
    zu: "Akekho osaphethe leli cala. Lithathe, noma unikeze ozakwenu, bese ingxoxo ivuleka.",
  },
};
