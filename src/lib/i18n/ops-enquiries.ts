import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The demo enquiry queue — `/ops/enquiries`.
 *
 * These strings lived in `OPS_TENANTS` while the queue was a table at
 * the foot of the agencies page, below the agency list and its
 * pagination, where nobody scrolled to find it. They describe enquiries
 * rather than tenants, so they move with the screen; a page called
 * Enquiries reading its own headings out of the agencies dictionary is
 * exactly the drift these files are split to prevent.
 *
 * The translations below are the ones that were already in
 * `ops-tenants.ts`, unchanged, plus the assignment column that has no
 * previous wording.
 *
 * NEEDS NATIVE REVIEW before launch, on the same terms as `ops-common.ts`:
 * translated in-house from the English.
 */
export const OPS_ENQUIRIES: {
  heading: L;
  intro: L;
  panel: L;
  empty: L;
  head: { who: L; company: L; preferred: L; status: L; assignee: L; action: L };
  status: {
    new: L;
    contacted: L;
    scheduled: L;
    converted: L;
    declined: L;
  };
  unassigned: L;
  claimButton: L;
  assigneeFilterAll: L;
  assigneeFilterMine: L;
  assigneeFilterNobody: L;
  statusFilterAll: L;
  searchPlaceholder: L;
} = {
  heading: {
    en: "Enquiries",
    ha: "Tambayoyi",
    yo: "Àwọn ìbéèrè",
    ig: "Ajụjụ",
    fr: "Demandes",
    pt: "Pedidos",
    sw: "Maulizo",
    ar: "الاستفسارات",
    tw: "Nsɛmmisa",
    zu: "Imibuzo",
  },
  intro: {
    en: "Everyone who has asked for a demo, and who is looking after them.",
    ha: "Duk wanda ya nemi nuni, da wanda ke kula da su.",
    yo: "Gbogbo ẹni tí ó béèrè fún àfihàn, àti ẹni tí ń bójú tó wọn.",
    ig: "Onye ọ bụla rịọrọ ngosi, na onye na-elekọta ha.",
    fr: "Toutes les personnes ayant demandé une démonstration, et qui s'en occupe.",
    pt: "Todos os que pediram uma demonstração, e quem trata deles.",
    sw: "Kila aliyeomba onyesho, na nani anayewashughulikia.",
    ar: "كل من طلب عرضًا توضيحيًا، ومن يتابعه.",
    tw: "Obiara a wabisa demo, ne nea ɔhwɛ wɔn so.",
    zu: "Wonke umuntu ocele idemo, nokuthi ubani obanakekelayo.",
  },
  panel: {
    en: "Demo requests",
    ha: "Bukatun nuni",
    yo: "Àwọn ìbéèrè àfihàn",
    ig: "Arịrịọ ngosi",
    fr: "Demandes de démonstration",
    pt: "Pedidos de demonstração",
    sw: "Maombi ya onyesho",
    ar: "طلبات العرض التوضيحي",
    tw: "Yɛkyerɛ abisadeɛ",
    zu: "Izicelo zomboniso",
  },
  empty: {
    en: "Nobody has asked for a demo yet.",
    ha: "Babu wanda ya nemi nuni tukuna.",
    yo: "Kò sí ẹnikẹ́ni tí ó tí ì béèrè fún àfihàn.",
    ig: "Ọ dịghị onye rịọrọ ngosi ma ọlị.",
    fr: "Personne n'a encore demandé de démonstration.",
    pt: "Ainda ninguém pediu uma demonstração.",
    sw: "Bado hakuna aliyeomba onyesho.",
    ar: "لم يطلب أحد عرضًا توضيحيًا بعد.",
    tw: "Obiara mmisaa demo ɛnnye.",
    zu: "Akekho osecele idemo okwamanje.",
  },
  head: {
    who: {
      en: "Who",
      ha: "Wa",
      yo: "Ta",
      ig: "Onye",
      fr: "Qui",
      pt: "Quem",
      sw: "Nani",
      ar: "من",
      tw: "Hwan",
      zu: "Ubani",
    },
    company: {
      en: "Company",
      ha: "Kamfani",
      yo: "Ilé-iṣẹ́",
      ig: "Ụlọ ọrụ",
      fr: "Entreprise",
      pt: "Empresa",
      sw: "Kampuni",
      ar: "الشركة",
      tw: "Adwumakuw",
      zu: "Inkampani",
    },
    preferred: {
      en: "Preferred time",
      ha: "Lokacin da ake so",
      yo: "Àkókò tí a fẹ́",
      ig: "Oge a chọrọ",
      fr: "Heure préférée",
      pt: "Hora preferida",
      sw: "Saa inayopendelewa",
      ar: "الوقت المفضل",
      tw: "Bere a wɔpɛ",
      zu: "Isikhathi esithandwayo",
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
    assignee: {
      en: "Assigned to",
      ha: "An ba",
      yo: "Fún",
      ig: "Enyere",
      fr: "Attribuée à",
      pt: "Atribuído a",
      sw: "Amekabidhiwa",
      ar: "مُسندة إلى",
      tw: "Wɔde ama",
      zu: "Kwabelwe",
    },
    action: {
      en: "",
      ha: "",
      yo: "",
      ig: "",
      fr: "",
      pt: "",
      sw: "",
      ar: "",
      tw: "",
      zu: "",
    },
  },
  status: {
    new: {
      en: "New",
      ha: "Sabo",
      yo: "Tuntun",
      ig: "Ọhụrụ",
      fr: "Nouveau",
      pt: "Novo",
      sw: "Mpya",
      ar: "جديد",
      tw: "Foforɔ",
      zu: "Kusha",
    },
    contacted: {
      en: "Contacted",
      ha: "An tuntuɓe",
      yo: "A ti kàn sí i",
      ig: "Akpọtụụrụ ya",
      fr: "Contacté",
      pt: "Contactado",
      sw: "Amewasiliwa",
      ar: "تم التواصل",
      tw: "Wɔfaa no",
      zu: "Kuthintiwe",
    },
    scheduled: {
      en: "Scheduled",
      ha: "An tsara lokaci",
      yo: "A ti ṣètò àkókò",
      ig: "Edobere oge",
      fr: "Planifié",
      pt: "Agendado",
      sw: "Imepangwa",
      ar: "مُجدوَل",
      tw: "Wɔahyehyɛ",
      zu: "Kuhleliwe",
    },
    converted: {
      en: "Converted",
      ha: "Ta zama hukuma",
      yo: "Ó di ilé-iṣẹ́",
      ig: "Aghọọla ụlọ ọrụ",
      fr: "Convertie",
      pt: "Convertida",
      sw: "Imekuwa wakala",
      ar: "تحوّلت إلى وكالة",
      tw: "Adan adwumakuo",
      zu: "Isibe yi-ejensi",
    },
    declined: {
      en: "Declined",
      ha: "An ƙi",
      yo: "A ti kọ̀",
      ig: "Ajụrụ",
      fr: "Refusée",
      pt: "Recusado",
      sw: "Imekataliwa",
      ar: "مرفوض",
      tw: "Wɔapo",
      zu: "Kwenqatshiwe",
    },
  },
  /** An enquiry nobody has taken. A normal state, not a warning. */
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
  claimButton: {
    en: "Claim",
    ha: "Ɗauka",
    yo: "Gbà á",
    ig: "Were ya",
    fr: "Prendre",
    pt: "Assumir",
    sw: "Chukua",
    ar: "استلام",
    tw: "Fa",
    zu: "Thatha",
  },
  assigneeFilterAll: {
    en: "Anyone",
    ha: "Kowa",
    yo: "Ẹnikẹ́ni",
    ig: "Onye ọ bụla",
    fr: "N'importe qui",
    pt: "Qualquer pessoa",
    sw: "Yeyote",
    ar: "أي شخص",
    tw: "Obiara",
    zu: "Noma ubani",
  },
  assigneeFilterMine: {
    en: "Mine",
    ha: "Nawa",
    yo: "Tèmi",
    ig: "Nke m",
    fr: "Les miennes",
    pt: "As minhas",
    sw: "Zangu",
    ar: "الخاصة بي",
    tw: "Me deɛ",
    zu: "Ezami",
  },
  assigneeFilterNobody: {
    en: "Nobody",
    ha: "Babu kowa",
    yo: "Kò sí ẹnikẹ́ni",
    ig: "Ọ dịghị onye",
    fr: "Personne",
    pt: "Ninguém",
    sw: "Hakuna mtu",
    ar: "لا أحد",
    tw: "Obiara nni hɔ",
    zu: "Akekho",
  },
  statusFilterAll: {
    en: "Any status",
    ha: "Kowane matsayi",
    yo: "Ipò yòówù",
    ig: "Ọnọdụ ọ bụla",
    fr: "Tout statut",
    pt: "Qualquer estado",
    sw: "Hali yoyote",
    ar: "أي حالة",
    tw: "Tebea biara",
    zu: "Noma isiphi isimo",
  },
  searchPlaceholder: {
    en: "Search name, email or company",
    ha: "Nemi suna, imel ko kamfani",
    yo: "Wá orúkọ, ímeèlì tàbí ilé-iṣẹ́",
    ig: "Chọọ aha, email ma ọ bụ ụlọ ọrụ",
    fr: "Rechercher un nom, un e-mail ou une entreprise",
    pt: "Procurar nome, e-mail ou empresa",
    sw: "Tafuta jina, barua pepe au kampuni",
    ar: "ابحث بالاسم أو البريد الإلكتروني أو الشركة",
    tw: "Hwehwɛ din, email anaa adwumakuw",
    zu: "Sesha igama, i-imeyili noma inkampani",
  },
};
