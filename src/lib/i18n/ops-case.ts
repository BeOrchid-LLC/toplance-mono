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
export const OPS_CASE: {
  metaTitle: L;
  backToQueue: L;
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
  backToQueue: {
    en: "Back to the queue",
    ha: "Koma zuwa layi",
    yo: "Padà sí ẹsẹ̀ ìdúró",
    ig: "Laghachi na ndozi",
    fr: "Retour à la file",
    pt: "Voltar à fila",
    sw: "Rudi kwenye foleni",
    ar: "العودة إلى قائمة الانتظار",
    tw: "San kɔ hyehyɛɛ no mu",
    zu: "Buyela emugqeni",
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
};
