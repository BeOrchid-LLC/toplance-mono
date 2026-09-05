import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/page.tsx` — the case queue. `awaitingReview` and `unassigned`
 * labels are shared with `OPS_COMMON`, since the corridor screens and
 * the case's own document sets use the same words for the same idea.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_QUEUE: {
  heading: L;
  intro: L;
  counters: {
    openCases: { label: L; sub: L };
    awaitingReviewSub: L;
    unassignedSub: L;
    overdue: { label: L; sub: L };
  };
  sortedByAge: L;
  empty: L;
  tableHead: {
    applicant: L;
    destination: L;
    status: L;
    owner: L;
    age: L;
  };
  ageTitle: L;
} = {
  heading: {
    en: "Case queue",
    ha: "Layin shari'o'i",
    yo: "Ẹsẹ̀ ìdúró ẹjọ́",
    ig: "Ndozi ikpe",
    fr: "File des dossiers",
    pt: "Fila de processos",
    sw: "Foleni ya kesi",
    ar: "قائمة انتظار الحالات",
    tw: "Nsɛm hyehyɛɛ",
    zu: "Umugqa wamacala",
  },
  intro: {
    en: "Every application a person still has to act on, oldest first.",
    ha: "Kowace neman da wani har yanzu zai duba, tsofaffi tukuna.",
    yo: "Gbogbo ìwé ẹ̀bẹ̀ tí ẹnìkan ṣì ní láti kojú, ti àtijọ́ jùlọ ní àkọ́kọ́.",
    ig: "Ngwa ọ bụla mmadụ ka ga-eme ihe banyere ya, nke kacha ochie mbụ.",
    fr: "Chaque dossier qu'une personne doit encore traiter, du plus ancien au plus récent.",
    pt: "Todos os processos que uma pessoa ainda tem de tratar, do mais antigo ao mais recente.",
    sw: "Kila ombi ambalo mtu bado anapaswa kulishughulikia, la zamani zaidi kwanza.",
    ar: "كل طلب لا يزال يتعيّن على أحد التعامل معه، الأقدم أولاً.",
    tw: "Application biara a obiara nkasa ho ho, deɛ ɛdi kan no wɔ anim.",
    zu: "Sonke isicelo umuntu okusadingeka enze ngaso, esidala kuqala.",
  },
  counters: {
    openCases: {
      label: {
        en: "Open cases",
        ha: "Shari'o'in da ake tafiyar da su",
        yo: "Àwọn ẹjọ́ tí ń lọ lọ́wọ́",
        ig: "Ikpe ndị ghere oghe",
        fr: "Dossiers ouverts",
        pt: "Processos abertos",
        sw: "Kesi zilizo wazi",
        ar: "الحالات المفتوحة",
        tw: "Nsɛm a ɛda so retena hɔ",
        zu: "Amacala avuliwe",
      },
      sub: {
        en: "in the pipeline",
        ha: "a tsarin aiki",
        yo: "tí ń bọ̀",
        ig: "n'usoro",
        fr: "en cours de traitement",
        pt: "em curso",
        sw: "yaliyo mchakatoni",
        ar: "قيد المعالجة",
        tw: "wɔ adwuma so",
        zu: "asendleleni",
      },
    },
    awaitingReviewSub: {
      en: "at 100% completion",
      ha: "a kashi 100%",
      yo: "ní ìparí 100%",
      ig: "na mmecha 100%",
      fr: "complets à 100 %",
      pt: "com 100% de conclusão",
      sw: "yamekamilika 100%",
      ar: "بنسبة اكتمال 100%",
      tw: "wɔawie 100%",
      zu: "kuphelele ku-100%",
    },
    unassignedSub: {
      en: "no owner yet",
      ha: "babu mai kula tukuna",
      yo: "kò tí ì ní olùdarí",
      ig: "enwebeghị onye nlekọta",
      fr: "sans responsable pour l'instant",
      pt: "ainda sem responsável",
      sw: "bado hakuna mmiliki",
      ar: "لا يوجد مسؤول بعد",
      tw: "onni obi a wahwɛ so",
      zu: "akukho mnikazi okwamanje",
    },
    overdue: {
      label: {
        en: "Overdue",
        ha: "Ya wuce lokaci",
        yo: "Ti kọjá àkókò",
        ig: "Agafeela oge",
        fr: "En retard",
        pt: "Em atraso",
        sw: "Zimechelewa",
        ar: "متأخرة",
        tw: "Atwam berɛ",
        zu: "Sekwephuze",
      },
      sub: {
        en: "more than 5 days in queue",
        ha: "fiye da kwana 5 a layi",
        yo: "ó ju ọjọ́ márùn-ún lọ nínú ẹsẹ̀ ìdúró",
        ig: "karịrị ụbọchị ise n'ahịrị",
        fr: "plus de 5 jours dans la file",
        pt: "há mais de 5 dias na fila",
        sw: "zaidi ya siku 5 kwenye foleni",
        ar: "أكثر من 5 أيام في قائمة الانتظار",
        tw: "asen nna 5 wɔ hyehyɛɛ mu",
        zu: "ngaphezu kwezinsuku ezi-5 emugqeni",
      },
    },
  },
  sortedByAge: {
    en: "Sorted by age, oldest first",
    ha: "An tsara bisa tsawon lokaci, tsofaffi tukuna",
    yo: "A to wọ́n gẹ́gẹ́ bí ọjọ́ orí, ti àtijọ́ jùlọ ní àkọ́kọ́",
    ig: "Ahazighị ya dịka ogologo oge, nke kacha ochie mbụ",
    fr: "Triés par ancienneté, du plus ancien au plus récent",
    pt: "Ordenados por antiguidade, do mais antigo ao mais recente",
    sw: "Vimepangwa kwa muda, la zamani zaidi kwanza",
    ar: "مرتّبة حسب المدة، الأقدم أولاً",
    tw: "Wɔahyehyɛ no sɛnea berɛ te, deɛ ɛdi kan no wɔ anim",
    zu: "Kuhlelwe ngobudala, okudala kuqala",
  },
  empty: {
    en: "Nothing in the queue. Cases appear here once a traveler finishes intake.",
    ha: "Babu kome a layi. Shari'o'i suna bayyana nan da zarar matafiyi ya kammala shigarwa.",
    yo: "Kò sí ohunkóhun nínú ẹsẹ̀ ìdúró. Àwọn ẹjọ́ máa ń farahàn níhìn-ín ní kété tí arìnrìn-àjò bá parí ìforúkọsílẹ̀.",
    ig: "Ọ dịghị ihe dị n'ahịrị. Ikpe na-apụta ebe a mgbe onye njem mechara ntinye ozi.",
    fr: "Rien dans la file. Les dossiers apparaissent ici dès qu'un voyageur termine son admission.",
    pt: "Nada na fila. Os processos aparecem aqui assim que um viajante termina a admissão.",
    sw: "Hakuna kitu kwenye foleni. Kesi huonekana hapa mara msafiri anapomaliza kujiandikisha.",
    ar: "لا شيء في قائمة الانتظار. تظهر الحالات هنا فور إنهاء المسافر لعملية الاستقبال.",
    tw: "Hwee nni hyehyɛɛ no mu. Nsɛm pue wɔ ha bere a akwantufo awie nsɛmmisa no.",
    zu: "Akukho lutho emugqeni. Amacala avela lapha uma isihambi siqeda ukubhaliswa.",
  },
  tableHead: {
    applicant: {
      en: "Applicant",
      ha: "Mai nema",
      yo: "Olùbẹ̀bẹ̀",
      ig: "Onye na-arịọ",
      fr: "Demandeur",
      pt: "Requerente",
      sw: "Mwombaji",
      ar: "مقدّم الطلب",
      tw: "Deɛ ɔresrɛ",
      zu: "Umfaki-sicelo",
    },
    destination: {
      en: "Destination",
      ha: "Wurin zuwa",
      yo: "Ibi tí ò ń lọ",
      ig: "Ebe ị na-aga",
      fr: "Destination",
      pt: "Destino",
      sw: "Unakoenda",
      ar: "الوجهة",
      tw: "Baabi a woreko",
      zu: "Indawo oya kuyo",
    },
    status: {
      en: "Status",
      ha: "Matsayi",
      yo: "Ipò",
      ig: "Ọnọdụ",
      fr: "Statut",
      pt: "Estado",
      sw: "Hali",
      ar: "الحالة",
      tw: "Tebea",
      zu: "Isimo",
    },
    owner: {
      en: "Owner",
      ha: "Mai kula",
      yo: "Olùdarí",
      ig: "Onye nlekọta",
      fr: "Responsable",
      pt: "Responsável",
      sw: "Mmiliki",
      ar: "المسؤول",
      tw: "Ɔhwɛfoɔ",
      zu: "Umnikazi",
    },
    age: {
      en: "Age",
      ha: "Tsawon lokaci",
      yo: "Ọjọ́ orí",
      ig: "Ogologo oge",
      fr: "Ancienneté",
      pt: "Antiguidade",
      sw: "Muda",
      ar: "المدة",
      tw: "Berɛ a atwa mu",
      zu: "Ubudala",
    },
  },
  /** `{age}` is replaced with the number of days before this is shown as a `title` tooltip. */
  ageTitle: {
    en: "{age} days in the queue",
    ha: "Kwana {age} a layi",
    yo: "Ọjọ́ {age} nínú ẹsẹ̀ ìdúró",
    ig: "Ụbọchị {age} n'ahịrị",
    fr: "{age} jours dans la file",
    pt: "{age} dias na fila",
    sw: "Siku {age} kwenye foleni",
    ar: "{age} يومًا في قائمة الانتظار",
    tw: "Nna {age} wɔ hyehyɛɛ mu",
    zu: "Izinsuku ezi-{age} emugqeni",
  },
};
