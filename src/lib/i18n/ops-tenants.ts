import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/tenants` and `/ops/tenants/[id]` — the agencies on the platform
 * and the demo enquiries that have not become one yet.
 *
 * The review-state words and the nav labels stay in `OPS_COMMON`, and
 * the `{ error }` strings the actions return stay in `OPS_ACTIONS`, for
 * the same reason `OPS_CORRIDORS` keeps neither: a second copy of a word
 * is a word that will disagree with itself.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_TENANTS: {
  heading: L;
  intro: L;
  counters: {
    liveTenants: { label: L; sub: L };
    suspended: { label: L; sub: L };
    members: { label: L; sub: L };
    openEnquiries: { label: L; sub: L };
  };
  tenantsPanel: L;
  agenciesWord: L;
  searchPlaceholder: L;
  anyStatus: L;
  inviteSearchPlaceholder: L;
  anyKind: L;
  emptyTenants: L;
  tableHead: {
    agency: L;
    members: L;
    applications: L;
    progress: L;
    state: L;
    added: L;
  };
  live: L;
  suspendedBadge: L;
  planLabel: L;
  planUnpaid: L;
  planPaidUntil: L;
  provisionButton: L;
  provisionTitle: L;
  provisionNotice: L;
  fieldAgencyName: L;
  fieldDomain: L;
  fieldSeats: L;
  fieldBillingContact: L;
  fieldOwnerEmail: L;
  fieldOwnerName: L;
  createButton: L;
  cancelButton: L;
  toastProvisioned: L;
  inviteLinkLabel: L;
  provisionSentTo: L;
  provisionEmailFailed: L;
  detailBackToList: L;
  rosterPanel: L;
  emptyRoster: L;
  rosterHead: { person: L; role: L; joined: L; action: L };
  roleOwner: L;
  roleReviewer: L;
  promoteButton: L;
  demoteButton: L;
  demoteConfirmTitle: L;
  demoteConfirmBody: L;
  toastRoleChanged: L;
  invitesPanel: L;
  emptyInvites: L;
  invitesHead: { email: L; kind: L; sent: L; expires: L };
  kindStaff: L;
  kindClient: L;
  inviteExpired: L;
  billingPanel: L;
  saveBillingButton: L;
  toastBillingSaved: L;
  dangerPanel: L;
  suspendNotice: L;
  suspendButton: L;
  suspendConfirmTitle: L;
  suspendConfirmBody: L;
  restoreNotice: L;
  restoreButton: L;
  toastSuspended: L;
  toastRestored: L;
  awaitingFirstOwner: L;
} = {
  heading: {
    en: "Agencies",
    ha: "Hukumomi",
    yo: "Àwọn ilé-iṣẹ́",
    ig: "Ụlọ ọrụ",
    fr: "Agences",
    pt: "Agências",
    sw: "Mawakala",
    ar: "الوكالات",
    tw: "Adwumakuo",
    zu: "Ama-ejensi",
  },
  intro: {
    en: "Every agency on the platform, what they are handling, and the enquiries that have not become one yet.",
    ha: "Kowace hukuma a dandali, abin da take gudanarwa, da kuma buƙatun da ba su riga sun zama hukuma ba tukuna.",
    yo: "Gbogbo ilé-iṣẹ́ tí ó wà lórí pẹpẹ náà, ohun tí wọ́n ń rí sí, àti àwọn ìbéèrè tí kò tí ì di ilé-iṣẹ́ kan.",
    ig: "Ụlọ ọrụ ọ bụla dị n'ikpo okwu ahụ, ihe ha na-arụ, na arịrịọ ndị na-abụghị ụlọ ọrụ ma ọlị.",
    fr: "Chaque agence sur la plateforme, ce qu'elle traite, et les demandes qui ne sont pas encore devenues une agence.",
    pt: "Cada agência na plataforma, o que está a tratar, e os pedidos que ainda não se tornaram uma.",
    sw: "Kila wakala kwenye jukwaa, wanachoshughulikia, na maombi ambayo bado hayajawa wakala.",
    ar: "كل وكالة على المنصة، وما تتولاه، والطلبات التي لم تصبح وكالة بعد.",
    tw: "Adwumakuo biara a ɛwɔ platform no so, deɛ wɔreyɛ, ne abisadeɛ a wonnyaa nnan adwumakuo bio.",
    zu: "Yonke i-ejensi esekundleni, ekwenzayo, nezicelo ezingakabi yi-ejensi.",
  },
  counters: {
    liveTenants: {
      label: {
        en: "Live agencies",
        ha: "Hukumomin da suke aiki",
        yo: "Àwọn ilé-iṣẹ́ tí ń ṣiṣẹ́",
        ig: "Ụlọ ọrụ na-arụ ọrụ",
        fr: "Agences actives",
        pt: "Agências ativas",
        sw: "Mawakala yanayotumika",
        ar: "الوكالات المُفعَّلة",
        tw: "Adwumakuo a ɛreyɛ adwuma",
        zu: "Ama-ejensi asebenzayo",
      },
      sub: {
        en: "able to review a case",
        ha: "da ke iya bitar shari'a",
        yo: "tí ó lè yẹ ẹjọ́ wò",
        ig: "nwere ike inyocha ikpe",
        fr: "capable d'examiner un dossier",
        pt: "capaz de rever um processo",
        sw: "yenye uwezo wa kukagua kesi",
        ar: "قادرة على مراجعة حالة",
        tw: "a wɔbɛtumi ahwɛ asɛm mu",
        zu: "ekwazi ukubuyekeza icala",
      },
    },
    suspended: {
      label: {
        en: "Suspended",
        ha: "An dakatar",
        yo: "A ti dádúró",
        ig: "Akwụsịrị ya",
        fr: "Suspendue",
        pt: "Suspensa",
        sw: "Imesimamishwa",
        ar: "موقوفة",
        tw: "Wɔagyae",
        zu: "Kumisiwe",
      },
      sub: {
        en: "reach removed, records intact",
        ha: "an cire isa, amma bayanai sun tsira",
        yo: "agbára-ìdásí ti yọ, àmọ́ àkọsílẹ̀ wà láìfọwọ́kàn",
        ig: "ewepụla ike ịrụtụ aka, ma ndekọ ka dị",
        fr: "portée retirée, dossiers intacts",
        pt: "alcance removido, registos intactos",
        sw: "uwezo umeondolewa, kumbukumbu zipo salama",
        ar: "أُزيلت صلاحيتها، مع بقاء السجلات سليمة",
        tw: "wɔayi tumi no afiri hɔ, nanso nkrataa no da so wɔ hɔ",
        zu: "amandla asusiwe, amarekhodi asele ephelele",
      },
    },
    /**
     * People, not seats.
     *
     * This tile read "14 of 25" until 2026-09-09, and the client read
     * the 25 as a limit — reasonably, because that is what a ratio
     * means. There is no limit: `seats_purchased` is checked nowhere in
     * the invitation path, the agency console already calls it "a
     * placeholder until the client sets them", and the platform bills
     * per application rather than per seat. A denominator nothing
     * enforces is a rule the reader invents for us.
     *
     * `seats_purchased` is still stored and still editable on an
     * agency's controls, where it is a plan attribute somebody sets
     * rather than a cap something enforces.
     */
    members: {
      label: {
        en: "Team members",
        ha: "Membobin ƙungiya",
        yo: "Àwọn ọmọ ẹgbẹ́",
        ig: "Ndị òtù",
        fr: "Membres d'équipe",
        pt: "Membros da equipa",
        sw: "Wanachama wa timu",
        ar: "أعضاء الفريق",
        tw: "Kuo no mufoɔ",
        zu: "Amalungu ethimba",
      },
      sub: {
        en: "across every agency",
        ha: "a cikin kowace hukuma",
        yo: "ní gbogbo ilé-iṣẹ́",
        ig: "n'ụlọ ọrụ ọ bụla",
        fr: "dans toutes les agences",
        pt: "em todas as agências",
        sw: "katika kila wakala",
        ar: "عبر كل الوكالات",
        tw: "wɔ adwumakuo biara mu",
        zu: "kuwo wonke ama-ejensi",
      },
    },
    openEnquiries: {
      label: {
        en: "Open enquiries",
        ha: "Bukatun da suke a buɗe",
        yo: "Àwọn ìbéèrè tí ó ṣí sílẹ̀",
        ig: "Arịrịọ dị mmepe",
        fr: "Demandes ouvertes",
        pt: "Pedidos em aberto",
        sw: "Maombi yaliyo wazi",
        ar: "الطلبات المفتوحة",
        tw: "Abisadeɛ a ɛda so retwɛn",
        zu: "Izicelo ezisavuliwe",
      },
      sub: {
        en: "not yet converted or declined",
        ha: "waɗanda ba a riga an mai da su ko a ƙi su ba tukuna",
        yo: "tí kò tí ì di ìyípadà tàbí kò tí ì kọ̀",
        ig: "nke a na-emeghị ka ọ ghọọ ihe ọzọ ma ọ bụ jụ ya ma ọlị",
        fr: "ni encore converties ni refusées",
        pt: "ainda não convertidos nem recusados",
        sw: "bado hazijabadilishwa wala kukataliwa",
        ar: "لم تُحوَّل أو تُرفض بعد",
        tw: "wonnyaa nsakraeɛ anaa wɔmpoo bio",
        zu: "ezingakaguqulwa noma zenqatshwa",
      },
    },
  },
  tenantsPanel: {
    en: "Every agency",
    ha: "Kowace hukuma",
    yo: "Gbogbo ilé-iṣẹ́",
    ig: "Ụlọ ọrụ ọ bụla",
    fr: "Toutes les agences",
    pt: "Todas as agências",
    sw: "Kila wakala",
    ar: "كل وكالة",
    tw: "Adwumakuo biara",
    zu: "Yonke i-ejensi",
  },
  inviteSearchPlaceholder: {
    en: "Search by email or name",
    ha: "Nemo ta imel ko suna",
    yo: "Wá nípa ímeèlì tàbí orúkọ",
    ig: "Chọọ site na email ma ọ bụ aha",
    fr: "Rechercher par e-mail ou nom",
    pt: "Pesquisar por e-mail ou nome",
    sw: "Tafuta kwa barua pepe au jina",
    ar: "ابحث بالبريد الإلكتروني أو الاسم",
    tw: "Hwehwɛ email anaa din so",
    zu: "Sesha nge-imeyili noma igama",
  },
  anyKind: {
    en: "Anyone",
    ha: "Kowa",
    yo: "Ẹnikẹ́ni",
    ig: "Onye ọ bụla",
    fr: "Tout le monde",
    pt: "Qualquer pessoa",
    sw: "Yeyote",
    ar: "أي شخص",
    tw: "Obiara",
    zu: "Noma ubani",
  },
  searchPlaceholder: {
    en: "Search by agency or domain",
    ha: "Nemo ta hukuma ko yanki",
    yo: "Wá nípa ilé-iṣẹ́ tàbí ìkápá",
    ig: "Chọọ site na ụlọ ọrụ ma ọ bụ ngalaba",
    fr: "Rechercher par agence ou domaine",
    pt: "Pesquisar por agência ou domínio",
    sw: "Tafuta kwa wakala au kikoa",
    ar: "ابحث حسب الوكالة أو النطاق",
    tw: "Hwehwɛ adwumakuo anaa domain so",
    zu: "Sesha nge-ejensi noma isizinda",
  },
  /**
   * "All statuses" — the client's wording, asked for on this table on
   * 10 September and applied to every status filter in the product on
   * the same day, because a filter that reads one way on the agencies
   * table and another on the four beside it is not a filter anyone
   * learns once.
   *
   * The distinction is real, not cosmetic: "Any status" describes what
   * the filter would match, and "All statuses" describes what is
   * currently shown. The second is what an unfiltered table is.
   */
  anyStatus: {
    en: "All statuses",
    ha: "Duk matsayi",
    yo: "Gbogbo ipò",
    ig: "Ọnọdụ niile",
    fr: "Tous les statuts",
    pt: "Todos os estados",
    sw: "Hali zote",
    ar: "كل الحالات",
    tw: "Tebea nyinaa",
    zu: "Zonke izimo",
  },
  agenciesWord: {
    en: "agencies",
    ha: "hukumomi",
    yo: "àwọn ilé-iṣẹ́",
    ig: "ụlọ ọrụ",
    fr: "agences",
    pt: "agências",
    sw: "mawakala",
    ar: "الوكالات",
    tw: "adwumakuo",
    zu: "ama-ejensi",
  },
  emptyTenants: {
    en: "No agency has been created yet. Create one from an enquiry below, or start from scratch.",
    ha: "Ba a ƙirƙiri wata hukuma ba tukuna. Ƙirƙiri ɗaya daga buƙatar da ke ƙasa, ko fara daga farko.",
    yo: "A kò tí ì dá ilé-iṣẹ́ kan sílẹ̀. Ṣẹ̀dá ọ̀kan láti inú ìbéèrè tí ó wà nísàlẹ̀, tàbí bẹ̀rẹ̀ láti ìbẹ̀rẹ̀pẹ̀pẹ̀.",
    ig: "Etolitebeghị ụlọ ọrụ ọ bụla ma ọlị. Mepụta otu site na arịrịọ dị n'okpuru, ma ọ bụ malite site na mbido.",
    fr: "Aucune agence n'a encore été créée. Créez-en une à partir d'une demande ci-dessous, ou partez de zéro.",
    pt: "Ainda não foi criada nenhuma agência. Crie uma a partir de um pedido abaixo, ou comece do zero.",
    sw: "Hakuna wakala aliyeundwa bado. Unda mmoja kutoka ombi lililo hapa chini, au anza upya.",
    ar: "لم تُنشأ أي وكالة بعد. أنشئ واحدة من طلب أدناه، أو ابدأ من الصفر.",
    tw: "Wɔmmɔɔ adwumakuo biara ɛnnye. Bɔ baako fi abisadeɛ a ɛwɔ ase ha, anaasɛ fi ahyɛaseɛ.",
    zu: "Ayikho i-ejensi esidaliwe okwamanje. Dala eyodwa kusukela esicelweni esingezansi, noma qala kusukela ekuqaleni.",
  },
  tableHead: {
    agency: {
      en: "Agency",
      ha: "Hukuma",
      yo: "Ilé-iṣẹ́",
      ig: "Ụlọ ọrụ",
      fr: "Agence",
      pt: "Agência",
      sw: "Wakala",
      ar: "الوكالة",
      tw: "Adwumakuo",
      zu: "I-ejensi",
    },
    members: {
      en: "Members",
      ha: "Membobi",
      yo: "Àwọn ọmọ ẹgbẹ́",
      ig: "Ndị òtù",
      fr: "Membres",
      pt: "Membros",
      sw: "Wanachama",
      ar: "الأعضاء",
      tw: "Wɔn a wɔyɛ muni",
      zu: "Amalungu",
    },
    applications: {
      en: "Applications",
      ha: "Aikace-aikace",
      yo: "Àwọn ìbéèrè",
      ig: "Ngwa",
      fr: "Candidatures",
      pt: "Candidaturas",
      sw: "Maombi",
      ar: "الطلبات",
      tw: "Abisadeɛ",
      zu: "Izicelo",
    },
    progress: {
      en: "Progress",
      ha: "Ci gaba",
      yo: "Ìtẹ̀síwájú",
      ig: "Ọganihu",
      fr: "Progression",
      pt: "Progresso",
      sw: "Maendeleo",
      ar: "التقدم",
      tw: "Nkɔso",
      zu: "Inqubekelaphambili",
    },
    /**
     * "Status" over the live/suspended pill, at the client's request on
     * 8 September. The key stays `state`, and so does the `?state=`
     * filter it labels: those are a URL contract an operator can have
     * bookmarked, and renaming a query parameter to match a heading
     * breaks the link without improving the page.
     *
     * Only `en` and `fr` move. Every other locale already used its word
     * for status here, which is how the English drifted unnoticed.
     */
    state: {
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
    added: {
      en: "Added",
      ha: "Ranar ƙarawa",
      yo: "Ọjọ́ àfikún",
      ig: "Ụbọchị e tinyere ya",
      fr: "Ajoutée",
      pt: "Adicionada",
      sw: "Imeongezwa",
      ar: "تاريخ الإضافة",
      tw: "Wɔde kaa ho",
      zu: "Kwengeziwe",
    },
  },
  live: {
    en: "Live",
    ha: "Yana aiki",
    yo: "Ń ṣiṣẹ́",
    ig: "Na-arụ ọrụ",
    fr: "En ligne",
    pt: "Ativo",
    sw: "Inatumika",
    ar: "مُفعَّل",
    tw: "Ɛreyɛ adwuma",
    zu: "Iyasebenza",
  },
  suspendedBadge: {
    en: "Suspended",
    ha: "An dakatar",
    yo: "A ti dádúró",
    ig: "Akwụsịrị ya",
    fr: "Suspendue",
    pt: "Suspensa",
    sw: "Imesimamishwa",
    ar: "موقوفة",
    tw: "Wɔagyae",
    zu: "Kumisiwe",
  },
  planLabel: {
    en: "Plan",
    ha: "Shiri",
    yo: "Ètò",
    ig: "Atụmatụ",
    fr: "Formule",
    pt: "Plano",
    sw: "Mpango",
    ar: "الخطة",
    tw: "Nhyehyɛe",
    zu: "Uhlelo",
  },
  planUnpaid: {
    en: "Unpaid",
    ha: "Ba a biya ba",
    yo: "Kò tíì san",
    ig: "A kwụghị ụgwọ",
    fr: "Impayée",
    pt: "Por pagar",
    sw: "Haijalipwa",
    ar: "غير مدفوعة",
    tw: "Wontuaa ka",
    zu: "Ayikhokhelwe",
  },
  planPaidUntil: {
    en: "Until {date}",
    ha: "Har zuwa {date}",
    yo: "Títí di {date}",
    ig: "Ruo {date}",
    fr: "Jusqu'au {date}",
    pt: "Até {date}",
    sw: "Hadi {date}",
    ar: "حتى {date}",
    tw: "Kosi {date}",
    zu: "Kuze kube ngu-{date}",
  },
  /**
   * "Create agency", not "Provision agency" — renamed 2026-09-10 after
   * the client stopped the demo to ask what provisioning was. The key
   * keeps its name: `provisionTenant`, `ProvisionTenant` and
   * `toplance.tenant_provisioned` are a server action, a component and
   * an analytics event, and the last of those is a union member in
   * `@/lib/analytics/events` with an audit trail behind it. The word on
   * the button is what the client reads; the word in the code is what
   * the platform already agreed on.
   *
   * French, Portuguese and Arabic already said "create" and are
   * unchanged — they never carried the "provision" metaphor.
   */
  provisionButton: {
    en: "Create agency",
    ha: "Ƙirƙiri hukuma",
    yo: "Ṣẹ̀dá ilé-iṣẹ́",
    ig: "Mepụta ụlọ ọrụ",
    fr: "Créer une agence",
    pt: "Criar agência",
    sw: "Unda wakala",
    ar: "إنشاء وكالة",
    tw: "Bɔ adwumakuo",
    zu: "Dala i-ejensi",
  },
  provisionTitle: {
    en: "Set up an agency",
    ha: "Kafa hukuma",
    yo: "Ṣètò ilé-iṣẹ́ kan",
    ig: "Tọlite ụlọ ọrụ",
    fr: "Créer une agence",
    pt: "Configurar uma agência",
    sw: "Sanidi wakala",
    ar: "إعداد وكالة",
    tw: "Siesie adwumakuo",
    zu: "Sungula i-ejensi",
  },
  provisionNotice: {
    en: "This creates the agency and emails its first person an invitation. They join as a reviewer; you make them the director once they have accepted.",
    ha: "Wannan yana ƙirƙirar hukumar sannan ya aika wa mutumin farko nata gayyata ta imel. Za su shiga a matsayin mai bita; za ka mayar da su darakta da zarar sun amince.",
    yo: "Èyí yóò dá ilé-iṣẹ́ náà sílẹ̀, yóò sì fi ìpè ránṣẹ́ sí ẹni àkọ́kọ́ rẹ̀ nípasẹ̀ ímeèlì. Wọn yóò dara pọ̀ mọ́ ẹgbẹ́ gẹ́gẹ́ bí olùyẹ̀wò; ìwọ yóò sọ wọ́n di olùdarí nígbà tí wọ́n bá ti tẹ́wọ́gbà.",
    ig: "Nke a na-emepụta ụlọ ọrụ ma zigara onye mbụ ya email ọkpụkpọ. Ha na-esonye dị ka onye nyocha; ị na-eme ka ha bụrụ onye nduzi mgbe ha kwenyesịrị.",
    fr: "Ceci crée l'agence et envoie une invitation par e-mail à sa première personne. Elle rejoint en tant que réviseur ; vous la promouvez directeur une fois qu'elle a accepté.",
    pt: "Isto cria a agência e envia um convite por email à primeira pessoa. Ela entra como revisora; torna-a diretora assim que aceitar.",
    sw: "Hii huunda wakala na kutuma barua pepe ya mwaliko kwa mtu wake wa kwanza. Watajiunga kama mkaguzi; utawafanya mkurugenzi mara wanapokubali.",
    ar: "يؤدي هذا إلى إنشاء الوكالة وإرسال دعوة بالبريد الإلكتروني إلى أول شخص فيها. ينضم كمراجع؛ وتجعله مديرًا بمجرد قبوله.",
    tw: "Yei bɛbɔ adwumakuo no na wɔde frɛ email akɔma onipa a odi kan. Ɔbɛka ho sɛ ɔhwɛfoɔ; wobɛma no ayɛ ɔpanyin bere a wagye atom.",
    zu: "Lokhu kudala i-ejensi bese kuthumela isimemo nge-imeyili emuntwini wayo wokuqala. Bajoyina njengomhloli; ubenza umqondisi uma sebamukelile.",
  },
  fieldAgencyName: {
    en: "Agency name",
    ha: "Sunan hukuma",
    yo: "Orúkọ ilé-iṣẹ́",
    ig: "Aha ụlọ ọrụ",
    fr: "Nom de l'agence",
    pt: "Nome da agência",
    sw: "Jina la wakala",
    ar: "اسم الوكالة",
    tw: "Adwumakuo din",
    zu: "Igama le-ejensi",
  },
  fieldDomain: {
    en: "Email domain (optional)",
    ha: "Domain na imel (ba dole ba)",
    yo: "Dòmeènì ímeèlì (tí kò ṣe dandan)",
    ig: "Domain email (ọ bụghị iwu)",
    fr: "Domaine e-mail (facultatif)",
    pt: "Domínio de email (opcional)",
    sw: "Kikoa cha barua pepe (si lazima)",
    ar: "نطاق البريد الإلكتروني (اختياري)",
    tw: "Email domain (ɛnhia)",
    zu: "Idomain ye-imeyili (akuphoqelekile)",
  },
  fieldSeats: {
    en: "Seats purchased",
    ha: "Wuraren zama da aka saya",
    yo: "Àwọn ìjókòó tí a rà",
    ig: "Oche a zụtara",
    fr: "Sièges achetés",
    pt: "Lugares adquiridos",
    sw: "Viti vilivyonunuliwa",
    ar: "المقاعد المشتراة",
    tw: "Nkonguabea a wɔtɔeɛ",
    zu: "Izihlalo ezithengiwe",
  },
  fieldBillingContact: {
    en: "Billing contact (optional)",
    ha: "Mai lissafin kuɗi (ba dole ba)",
    yo: "Alábàáṣiṣẹ́pọ̀ owó (tí kò ṣe dandan)",
    ig: "Onye nkwụnye ụgwọ (ọ bụghị iwu)",
    fr: "Contact de facturation (facultatif)",
    pt: "Contacto de faturação (opcional)",
    sw: "Mawasiliano ya malipo (si lazima)",
    ar: "جهة اتصال الفوترة (اختياري)",
    tw: "Sika tua ho obi a wɔde no di dwuma (ɛnhia)",
    zu: "Umuntu wokuxhumana ngezokukhokhwa (akuphoqelekile)",
  },
  fieldOwnerEmail: {
    en: "First director's email",
    ha: "Imel na daraktan farko",
    yo: "Ímeèlì olùdarí àkọ́kọ́",
    ig: "Email onye nduzi mbụ",
    fr: "E-mail du premier directeur",
    pt: "Email do primeiro diretor",
    sw: "Barua pepe ya mkurugenzi wa kwanza",
    ar: "البريد الإلكتروني للمدير الأول",
    tw: "Ɔpanyin a odi kan no email",
    zu: "I-imeyili yomqondisi wokuqala",
  },
  fieldOwnerName: {
    en: "First director's name (optional)",
    ha: "Sunan daraktan farko (ba dole ba)",
    yo: "Orúkọ olùdarí àkọ́kọ́ (tí kò ṣe dandan)",
    ig: "Aha onye nduzi mbụ (ọ bụghị iwu)",
    fr: "Nom du premier directeur (facultatif)",
    pt: "Nome do primeiro diretor (opcional)",
    sw: "Jina la mkurugenzi wa kwanza (si lazima)",
    ar: "اسم المدير الأول (اختياري)",
    tw: "Ɔpanyin a odi kan no din (ɛnhia)",
    zu: "Igama lomqondisi wokuqala (akuphoqelekile)",
  },
  createButton: {
    en: "Create and invite",
    ha: "Ƙirƙira sannan a gayyata",
    yo: "Dá a sílẹ̀ kí o sì pè é",
    ig: "Mepụta ma kpọọ oku",
    fr: "Créer et inviter",
    pt: "Criar e convidar",
    sw: "Unda na alika",
    ar: "إنشاء ودعوة",
    tw: "Bɔ na frɛ",
    zu: "Dala futhi mema",
  },
  cancelButton: {
    en: "Cancel",
    ha: "Soke",
    yo: "Fagilé",
    ig: "Kagbuo",
    fr: "Annuler",
    pt: "Cancelar",
    sw: "Ghairi",
    ar: "إلغاء",
    tw: "Twa mu",
    zu: "Khansela",
  },
  toastProvisioned: {
    en: "Agency created and the invitation is on its way.",
    ha: "An ƙirƙiri hukumar kuma gayyatar tana kan hanya.",
    yo: "Ilé-iṣẹ́ ti dá sílẹ̀, ìpè náà sì ń bọ̀.",
    ig: "Etolitela ụlọ ọrụ na ọkpụkpọ ahụ nọ n'ụzọ.",
    fr: "Agence créée et l'invitation est en route.",
    pt: "Agência criada e o convite está a caminho.",
    sw: "Wakala ameundwa na mwaliko uko njiani.",
    ar: "تم إنشاء الوكالة والدعوة في طريقها.",
    tw: "Wɔabɔ adwumakuo no na frɛ no rekɔ.",
    zu: "I-ejensi idaliwe futhi isimemo sisendleleni.",
  },
  provisionSentTo: {
    en: "The agency is set up and we have emailed the invitation to {email}.",
    ha: "An kafa hukumar kuma mun aika gayyatar zuwa {email}.",
    yo: "A ti ṣètò ilé-iṣẹ́ náà, a sì ti fi ìpè ránṣẹ́ sí {email}.",
    ig: "E hiwela ụlọ ọrụ ahụ, anyị ezigakwala ọkpụkpọ ahụ na {email}.",
    fr: "L'agence est créée et l'invitation a été envoyée à {email}.",
    pt: "A agência está criada e enviámos o convite para {email}.",
    sw: "Wakala ameanzishwa na tumetuma mwaliko kwa {email}.",
    ar: "تم إنشاء الوكالة وأرسلنا الدعوة إلى {email}.",
    tw: "Wɔasi adwumakuo no na yɛde nsato no akɔma {email}.",
    zu: "I-ejensi isunguliwe futhi sithumele isimemo ku-{email}.",
  },
  inviteLinkLabel: {
    en: "Invitation link",
    ha: "Hanyar haɗin gayyata",
    yo: "Ọ̀nà ìjápọ̀ ìpè",
    ig: "Njikọ ọkpụkpọ",
    fr: "Lien d'invitation",
    pt: "Link do convite",
    sw: "Kiungo cha mwaliko",
    ar: "رابط الدعوة",
    tw: "Frɛ link",
    zu: "Isixhumanisi sesimemo",
  },
  provisionEmailFailed: {
    en: "The invitation email could not be sent. Copy the link below and send it yourself — it is the only copy.",
    ha: "Ba a iya aika imel ɗin gayyata ba. Kwafi hanyar da ke ƙasa ka aika da kanka — ita ce kwafi ɗaya tilo.",
    yo: "A kò lè fi ìmèèlì ìpè náà ránṣẹ́. Ṣe àdàkọ ọ̀nà ìsopọ̀ tó wà nísàlẹ̀ kí o sì fi ránṣẹ́ fúnra rẹ — òun nìkan ni àdàkọ tó wà.",
    ig: "Enweghị ike izipu ozi-e òkù ahụ. Detuo njikọ dị n'okpuru ma zipụ ya n'onwe gị — ọ bụ naanị otu ahụ dị.",
    fr: "L'e-mail d'invitation n'a pas pu être envoyé. Copiez le lien ci-dessous et envoyez-le vous-même — c'est la seule copie.",
    pt: "Não foi possível enviar o e-mail de convite. Copie a ligação abaixo e envie-a você mesmo — é a única cópia.",
    sw: "Barua pepe ya mwaliko haikutumwa. Nakili kiungo kilicho hapa chini na ukitume mwenyewe — ndicho nakala pekee.",
    ar: "تعذّر إرسال بريد الدعوة. انسخ الرابط أدناه وأرسله بنفسك — فهو النسخة الوحيدة.",
    tw: "Yɛantumi amfa nsato email no ankɔ. Kopi link a ɛwɔ ase hɔ no na fa kɔma no wo ara — ɛno nko ara na ɛwɔ hɔ.",
    zu: "I-imeyili yesimemo ayikwazanga ukuthunyelwa. Kopisha isixhumanisi esingezansi bese uyithumela ngokwakho — yiyona kuphela ikhophi.",
  },
  detailBackToList: {
    en: "All agencies",
    ha: "Duk hukumomi",
    yo: "Gbogbo ilé-iṣẹ́",
    ig: "Ụlọ ọrụ niile",
    fr: "Toutes les agences",
    pt: "Todas as agências",
    sw: "Mawakala wote",
    ar: "كل الوكالات",
    tw: "Adwumakuo nyinaa",
    zu: "Wonke ama-ejensi",
  },
  rosterPanel: {
    en: "People",
    ha: "Mutane",
    yo: "Àwọn ènìyàn",
    ig: "Ndị mmadụ",
    fr: "Personnes",
    pt: "Pessoas",
    sw: "Watu",
    ar: "الأشخاص",
    tw: "Nnipa",
    zu: "Abantu",
  },
  emptyRoster: {
    en: "Nobody has accepted an invitation to this agency yet.",
    ha: "Babu wanda ya amince da gayyata zuwa wannan hukumar tukuna.",
    yo: "Kò sí ẹnikẹ́ni tí ó tí ì tẹ́wọ́gba ìpè sí ilé-iṣẹ́ yìí.",
    ig: "Ọ dịghị onye kwenyesịrị ọkpụkpọ ịbanye ụlọ ọrụ a ma ọlị.",
    fr: "Personne n'a encore accepté d'invitation pour cette agence.",
    pt: "Ainda ninguém aceitou um convite para esta agência.",
    sw: "Bado hakuna aliyekubali mwaliko wa wakala huyu.",
    ar: "لم يقبل أحد بعد دعوة للانضمام إلى هذه الوكالة.",
    tw: "Obiara nnyaa saa adwumakuo yi frɛ ntoa ɛnnye.",
    zu: "Akekho osamukele isimemo saleli ejensi okwamanje.",
  },
  rosterHead: {
    person: {
      en: "Person",
      ha: "Mutum",
      yo: "Ènìyàn",
      ig: "Onye",
      fr: "Personne",
      pt: "Pessoa",
      sw: "Mtu",
      ar: "الشخص",
      tw: "Onipa",
      zu: "Umuntu",
    },
    role: {
      en: "Role",
      ha: "Matsayi",
      yo: "Ipò",
      ig: "Ọkwa",
      fr: "Rôle",
      pt: "Função",
      sw: "Jukumu",
      ar: "الدور",
      tw: "Dibea",
      zu: "Indima",
    },
    joined: {
      en: "Joined",
      ha: "Ya shiga",
      yo: "Ó dara pọ̀",
      ig: "Sonyere",
      fr: "Rejoint",
      pt: "Aderiu",
      sw: "Amejiunga",
      ar: "انضم",
      tw: "Ɔkaa ho",
      zu: "Ujoyinile",
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
  // The agency's own top rank, named the same word the agency console
  // uses for it — a rank that reads "Director" to the agency and "Owner"
  // to the platform would be two names for one thing.
  roleOwner: {
    en: "Director",
    ha: "Darakta",
    yo: "Olùdarí",
    ig: "Onye nduzi",
    fr: "Directeur",
    pt: "Diretor",
    sw: "Mkurugenzi",
    ar: "المدير",
    tw: "Ɔpanyin",
    zu: "Umqondisi",
  },
  roleReviewer: {
    en: "Reviewer",
    ha: "Mai bita",
    yo: "Olùyẹ̀wò",
    ig: "Onye nyocha",
    fr: "Réviseur",
    pt: "Revisor",
    sw: "Mkaguzi",
    ar: "مراجع",
    tw: "Ɔhwɛfoɔ",
    zu: "Umhloli",
  },
  promoteButton: {
    en: "Make director",
    ha: "Mai da shi darakta",
    yo: "Sọ ọ́ di olùdarí",
    ig: "Mee ka ọ bụrụ onye nduzi",
    fr: "Nommer directeur",
    pt: "Tornar diretor",
    sw: "Mfanye mkurugenzi",
    ar: "تعيينه مديرًا",
    tw: "Ma no nyɛ ɔpanyin",
    zu: "Yenza umqondisi",
  },
  demoteButton: {
    en: "Make reviewer",
    ha: "Mai da shi mai bita",
    yo: "Sọ ọ́ di olùyẹ̀wò",
    ig: "Mee ka ọ bụrụ onye nyocha",
    fr: "Nommer réviseur",
    pt: "Tornar revisor",
    sw: "Mfanye mkaguzi",
    ar: "تعيينه مراجعًا",
    tw: "Ma no nyɛ ɔhwɛfoɔ",
    zu: "Yenza umhloli",
  },
  /**
   * Only the demotion asks; promoting hands capability over and is the
   * way back. The two share one button whose label flips, in a table of
   * rows that look alike, so the wrong row is easy to hit — and the
   * person on the other end of it is not the one clicking.
   */
  demoteConfirmTitle: {
    en: "Make {name} a reviewer?",
    ha: "A mai da {name} mai bita?",
    yo: "Sọ {name} di olùyẹ̀wò?",
    ig: "Mee ka {name} bụrụ onye nyocha?",
    fr: "Nommer {name} réviseur ?",
    pt: "Tornar {name} revisor?",
    sw: "Umfanye {name} mkaguzi?",
    ar: "تعيين {name} مراجعًا؟",
    tw: "Ma {name} nyɛ ɔhwɛfoɔ?",
    zu: "Wenze u-{name} umhloli?",
  },
  demoteConfirmBody: {
    en: "They lose the owner's controls as soon as you confirm — inviting people, billing, and the agency's settings. They keep their console and their cases. Any owner can hand it back.",
    ha: "Za su rasa ikon mai gidan da zarar ka tabbatar — gayyatar mutane, biyan kuɗi, da saitunan hukumar. Za su riƙe na'urar aikinsu da shari'o'insu. Kowane mai gida zai iya mayar musu da shi.",
    yo: "Wọn yóò pàdánù àwọn ìdarí olówó lẹ́sẹ̀kẹsẹ̀ tí o bá fọwọ́sí — pípe ènìyàn, ìsanwó, àti ètò ilé-iṣẹ́ náà. Wọn yóò pa kọ́ńsọ́ọ̀lù wọn àti àwọn ẹjọ́ wọn mọ́. Olówó èyíkéyìí lè dá a padà fún wọn.",
    ig: "Ha ga-atụfu njikwa nke onye nwe ozugbo ị kwadoro — ịkpọ ndị mmadụ òkù, ụgwọ, na ntọala ụlọ ọrụ ahụ. Ha ga-ejide console ha na ikpe ha. Onye nwe ọ bụla nwere ike inyeghachi ya.",
    fr: "Cette personne perd les commandes du propriétaire dès que vous confirmez — inviter, la facturation et les réglages de l'agence. Elle garde sa console et ses dossiers. N'importe quel propriétaire peut les lui rendre.",
    pt: "Perde os controlos de proprietário assim que confirmar — convidar pessoas, faturação e as definições da agência. Mantém a sua consola e os seus processos. Qualquer proprietário pode devolvê-los.",
    sw: "Anapoteza vidhibiti vya mmiliki mara tu unapothibitisha — kualika watu, malipo, na mipangilio ya wakala. Anabaki na konsoli yake na kesi zake. Mmiliki yeyote anaweza kumrudishia.",
    ar: "يفقد صلاحيات المالك فور تأكيدك — دعوة الأشخاص والفوترة وإعدادات الوكالة. ويحتفظ بلوحته وبحالاته. ويستطيع أي مالك إعادتها إليه.",
    tw: "Sɛ wopene so ara a, ɔbɛhwere owura no tumi — nnipa a ɔfrɛ wɔn, sika a wɔgye, ne adwumakuo no nhyehyɛeɛ. Ne console ne ne nsɛm no bɛka ne nsam. Owura biara bɛtumi asan de ama no.",
    zu: "Ulahlekelwa izilawuli zomnikazi ngokushesha uma uqinisekisa — ukumema abantu, ukukhokhisa, nezilungiselelo ze-ejensi. Ugcina ikhonsoli yakhe namacala akhe. Noma yimuphi umnikazi angambuyisela zona.",
  },
  toastRoleChanged: {
    en: "Role updated.",
    ha: "An sabunta matsayi.",
    yo: "Ipò ti di ìmúdójúiwọ̀n.",
    ig: "Emelitela ọkwa.",
    fr: "Rôle mis à jour.",
    pt: "Função atualizada.",
    sw: "Jukumu limesasishwa.",
    ar: "تم تحديث الدور.",
    tw: "Wɔasesa dibea no.",
    zu: "Indima ibuyekeziwe.",
  },
  invitesPanel: {
    en: "Pending invitations",
    ha: "Gayyatun da ake jira",
    yo: "Àwọn ìpè tí ń dúró",
    ig: "Ọkpụkpọ na-eche",
    fr: "Invitations en attente",
    pt: "Convites pendentes",
    sw: "Mialiko inayosubiri",
    ar: "الدعوات المعلقة",
    tw: "Frɛ a ɛretwɛn",
    zu: "Izimemo ezisalindile",
  },
  emptyInvites: {
    en: "No invitation is waiting to be accepted.",
    ha: "Babu gayyatar da ke jiran a amince da ita.",
    yo: "Kò sí ìpè tí ń dúró de ìtẹ́wọ́gbà.",
    ig: "Ọ dịghị ọkpụkpọ na-eche ka a nabata ya.",
    fr: "Aucune invitation n'attend d'être acceptée.",
    pt: "Nenhum convite está à espera de ser aceite.",
    sw: "Hakuna mwaliko unaosubiri kukubaliwa.",
    ar: "لا توجد دعوة بانتظار القبول.",
    tw: "Frɛ biara ntwɛn sɛ wɔbɛgye atom.",
    zu: "Asikho isimemo esilindele ukwamukelwa.",
  },
  invitesHead: {
    email: {
      en: "Email",
      ha: "Imel",
      yo: "Ímeèlì",
      ig: "Email",
      fr: "E-mail",
      pt: "E-mail",
      sw: "Barua pepe",
      ar: "البريد الإلكتروني",
      tw: "Email",
      zu: "I-imeyili",
    },
    kind: {
      en: "Kind",
      ha: "Iri",
      yo: "Irú",
      ig: "Ụdị",
      fr: "Type",
      pt: "Tipo",
      sw: "Aina",
      ar: "النوع",
      tw: "Su",
      zu: "Uhlobo",
    },
    sent: {
      en: "Sent",
      ha: "An aika",
      yo: "A ti fi ránṣẹ́",
      ig: "Ezigara",
      fr: "Envoyée",
      pt: "Enviado",
      sw: "Imetumwa",
      ar: "أُرسلت",
      tw: "Wɔasoma",
      zu: "Kuthunyelwe",
    },
    expires: {
      en: "Expires",
      ha: "Ta ƙare",
      yo: "Ó máa parí",
      ig: "Ọ ga-agwụ",
      fr: "Expire",
      pt: "Expira",
      sw: "Inaisha",
      ar: "تنتهي",
      tw: "Ɛbɛba awiei",
      zu: "Iphelelwa",
    },
  },
  kindStaff: {
    en: "Colleague",
    ha: "Abokin aiki",
    yo: "Alábàáṣiṣẹ́",
    ig: "Onye ọrụ ibe",
    fr: "Collègue",
    pt: "Colega",
    sw: "Mfanyakazi mwenzake",
    ar: "زميل",
    tw: "Yɔnko adwumayɛfoɔ",
    zu: "Ozakwethu",
  },
  kindClient: {
    en: "Traveller",
    ha: "Matafiyi",
    yo: "Arìnrìn-àjò",
    ig: "Onye njem",
    fr: "Voyageur",
    pt: "Viajante",
    sw: "Msafiri",
    ar: "المسافر",
    tw: "Ɔkwantuni",
    zu: "Umhambi",
  },
  inviteExpired: {
    en: "Expired",
    ha: "Ya ƙare",
    yo: "Ó ti pé",
    ig: "Agwụla",
    fr: "Expirée",
    pt: "Expirada",
    sw: "Imeisha",
    ar: "منتهية",
    tw: "Atwam",
    zu: "Iphelelwe yisikhathi",
  },
  billingPanel: {
    en: "Seats and billing",
    ha: "Wuraren zama da lissafin kuɗi",
    yo: "Àwọn ìjókòó àti owó",
    ig: "Oche na ịkwụ ụgwọ",
    fr: "Sièges et facturation",
    pt: "Lugares e faturação",
    sw: "Viti na malipo",
    ar: "المقاعد والفوترة",
    tw: "Nkonguabea ne sika tua",
    zu: "Izihlalo nokukhokhwa",
  },
  saveBillingButton: {
    en: "Save",
    ha: "Ajiye",
    yo: "Fi pamọ́",
    ig: "Chekwaa",
    fr: "Enregistrer",
    pt: "Guardar",
    sw: "Hifadhi",
    ar: "حفظ",
    tw: "Sie",
    zu: "Londoloza",
  },
  toastBillingSaved: {
    en: "Saved.",
    ha: "An ajiye.",
    yo: "A ti fi pamọ́.",
    ig: "Echekwala.",
    fr: "Enregistré.",
    pt: "Guardado.",
    sw: "Imehifadhiwa.",
    ar: "تم الحفظ.",
    tw: "Wɔasie.",
    zu: "Kulondoloziwe.",
  },
  dangerPanel: {
    en: "Access",
    ha: "Damar shiga",
    yo: "Àǹfàní wíwọlé",
    ig: "Ohere ịbanye",
    fr: "Accès",
    pt: "Acesso",
    sw: "Ufikiaji",
    ar: "الوصول",
    tw: "Kwan a wɔfa so kɔ mu",
    zu: "Ukufinyelela",
  },
  suspendNotice: {
    en: "Suspending removes the agency's reach at once: its people stop being able to open any case. Nothing is deleted, every traveller keeps their own documents, and restoring gives it all back.",
    ha: "Dakatarwa yana cire ikon hukumar nan take: mutanenta za su daina iya buɗe kowace shari'a. Ba a share komai ba, kowane matafiyi ya riƙe takardunsa, kuma maido da ita zai mayar da komai.",
    yo: "Dídádúró yóò yọ agbára ilé-iṣẹ́ náà kúrò lẹ́sẹ̀kẹsẹ̀: àwọn ènìyàn rẹ̀ kì yóò lè ṣí ẹjọ́ kankan mọ́. A kò pa ohunkóhun rẹ́, olúkúlùkù arìnrìn-àjò yóò pa àwọn ìwé tirẹ̀ mọ́, dídápadà yóò sì mú gbogbo rẹ̀ padà.",
    ig: "Ịkwụsị ya na-ewepụ ikike ụlọ ọrụ ahụ ozugbo: ndị ya akwụsịrị inwe ike imeghe ikpe ọ bụla. Ọ dịghị ihe a họpụtara, onye njem ọ bụla ga na-ejide akwụkwọ nke ya, weghachikwa ya ga-eweghachi ihe niile.",
    fr: "Suspendre retire aussitôt la portée de l'agence : ses membres ne peuvent plus ouvrir aucun dossier. Rien n'est supprimé, chaque voyageur garde ses propres documents, et restaurer redonne tout.",
    pt: "Suspender remove de imediato o alcance da agência: as suas pessoas deixam de poder abrir qualquer processo. Nada é eliminado, cada viajante mantém os seus próprios documentos, e restaurar devolve tudo.",
    sw: "Kusimamisha huondoa uwezo wa wakala mara moja: watu wake wanaacha kuweza kufungua kesi yoyote. Hakuna kinachofutwa, kila msafiri anaendelea kuwa na hati zake mwenyewe, na kurejesha kunarudisha kila kitu.",
    ar: "يؤدي التعليق إلى إزالة صلاحية الوكالة على الفور: يتوقف أفرادها عن القدرة على فتح أي حالة. لا يُحذف شيء، ويحتفظ كل مسافر بمستنداته الخاصة، وتعيد الاستعادة كل شيء.",
    tw: "Sɛ wɔgyae adwumakuo yi a, ɛyi ne tumi fi hɔ ntɛm ara: ne nnipa no rentumi mmue asɛm biara bio. Wɔmpepa hwee, ɔkwantuni biara bɛkora ne ankasa nkrataa, na sɛ wɔsan de ma no a, ɛbɛsan aba biribiara.",
    zu: "Ukumisa kususa amandla e-ejensi ngokushesha: abantu bayo bayeka ukukwazi ukuvula noma yiliphi icala. Akukho okususwayo, wonke umhambi ugcina amadokhumenti akhe, futhi ukubuyisela kubuyisela konke.",
  },
  suspendButton: {
    en: "Suspend agency",
    ha: "Dakatar da hukuma",
    yo: "Dádúró ilé-iṣẹ́",
    ig: "Kwụsị ụlọ ọrụ",
    fr: "Suspendre l'agence",
    pt: "Suspender agência",
    sw: "Simamisha wakala",
    ar: "إيقاف الوكالة",
    tw: "Gyae adwumakuo no",
    zu: "Misa i-ejensi",
  },
  /**
   * The confirmation the client asked for. `{name}` is the agency's own
   * name, replaced by the caller — an operator holding two tabs open
   * needs the dialog to say which agency it is about, and "this agency"
   * would be the one sentence on the screen that cannot tell them.
   */
  suspendConfirmTitle: {
    en: "Suspend {name}?",
    ha: "A dakatar da {name}?",
    yo: "Dá {name} dúró?",
    ig: "Kwụsị {name}?",
    fr: "Suspendre {name} ?",
    pt: "Suspender {name}?",
    sw: "Kusimamisha {name}?",
    ar: "تعليق {name}؟",
    tw: "Gyae {name}?",
    zu: "Misa i-{name}?",
  },
  /**
   * Deliberately not a second copy of `suspendNotice`: it says what
   * happens at the instant of confirming, which is the part the panel's
   * own sentence states in the abstract.
   */
  suspendConfirmBody: {
    en: "Everyone at {name} loses the ability to open a case the moment you confirm — including anyone in the middle of one. Nothing is deleted, and restoring gives it all back.",
    ha: "Duk mutanen {name} za su rasa ikon buɗe shari'a nan take idan ka tabbatar — har da duk wanda ke tsakiyar ɗaya. Ba a share komai ba, kuma maidowa zai mayar da komai.",
    yo: "Gbogbo ènìyàn ní {name} yóò pàdánù agbára láti ṣí ẹjọ́ lẹ́sẹ̀kẹsẹ̀ tí o bá fọwọ́sí — títí kan ẹnikẹ́ni tí ó wà láàrin ọ̀kan. A kò pa ohunkóhun rẹ́, dídápadà yóò sì mú gbogbo rẹ̀ padà.",
    ig: "Onye ọ bụla nọ na {name} ga-enweghịzi ike imeghe ikpe ozugbo ị kwadoro — gụnyere onye ọ bụla nọ n'etiti otu. Ọ dịghị ihe a na-ehichapụ, iweghachi ya ga-eweghachikwa ihe niile.",
    fr: "Toutes les personnes de {name} perdent la possibilité d'ouvrir un dossier dès que vous confirmez — y compris celles qui sont en plein travail. Rien n'est supprimé, et restaurer redonne tout.",
    pt: "Todas as pessoas de {name} perdem a possibilidade de abrir um processo assim que confirmar — incluindo quem estiver a meio de um. Nada é eliminado, e restaurar devolve tudo.",
    sw: "Kila mtu katika {name} anapoteza uwezo wa kufungua kesi mara tu unapothibitisha — pamoja na yeyote aliye katikati ya kesi. Hakuna kinachofutwa, na kurejesha kunarudisha kila kitu.",
    ar: "يفقد جميع أفراد {name} القدرة على فتح أي حالة فور تأكيدك — بمن فيهم من هو في منتصف حالة. لا يُحذف شيء، وتعيد الاستعادة كل شيء.",
    tw: "Sɛ wopene so ara a, obiara a ɔwɔ {name} rentumi mmue asɛm bio — a wɔn a wɔgu so reyɛ bi no ka ho. Wɔmpepa hwee, na sɛ wɔsan de ma no a, ɛbɛsan aba biribiara.",
    zu: "Wonke umuntu ku-{name} ulahlekelwa amandla okuvula icala ngokushesha uma uqinisekisa — kufaka phakathi noma ubani ophakathi kwelinye. Akukho okususwayo, futhi ukubuyisela kubuyisela konke.",
  },
  restoreNotice: {
    en: "This agency is suspended. Its people cannot open a case. Restoring gives back exactly what it had.",
    ha: "An dakatar da wannan hukumar. Mutanenta ba za su iya buɗe wata shari'a ba. Maido da ita zai mayar mata da abin da take da shi daidai.",
    yo: "Ilé-iṣẹ́ yìí ti dádúró. Àwọn ènìyàn rẹ̀ kò lè ṣí ẹjọ́. Dídápadà yóò mú ohun tí ó ní pàápàá padà.",
    ig: "A kwụsịrị ụlọ ọrụ a. Ndị ya enweghị ike imeghe ikpe. Iweghachi ya ga-eweghachi kpọmkwem ihe o nwere.",
    fr: "Cette agence est suspendue. Ses membres ne peuvent pas ouvrir de dossier. Restaurer lui rend exactement ce qu'elle avait.",
    pt: "Esta agência está suspensa. As suas pessoas não podem abrir um processo. Restaurar devolve exatamente o que ela tinha.",
    sw: "Wakala huyu amesimamishwa. Watu wake hawawezi kufungua kesi. Kurejesha kunamrudishia kile alichokuwa nacho.",
    ar: "هذه الوكالة موقوفة. لا يمكن لأفرادها فتح أي حالة. تعيد الاستعادة تمامًا ما كانت تملكه.",
    tw: "Wɔagyae saa adwumakuo yi. Ne nnipa no rentumi mmue asɛm. Sɛ wɔsan de ma no a, ɛbɛsan aba deɛ na ɔwɔ pɛpɛɛpɛ.",
    zu: "Le ejensi imisiwe. Abantu bayo abakwazi ukuvula icala. Ukubuyisela kubuyisela ngokunembile lokho ebikunakho.",
  },
  restoreButton: {
    en: "Restore agency",
    ha: "Maido da hukuma",
    yo: "Dá ilé-iṣẹ́ padà",
    ig: "Weghachi ụlọ ọrụ",
    fr: "Restaurer l'agence",
    pt: "Restaurar agência",
    sw: "Rejesha wakala",
    ar: "استعادة الوكالة",
    tw: "San fa adwumakuo no bra",
    zu: "Buyisela i-ejensi",
  },
  toastSuspended: {
    en: "Agency suspended.",
    ha: "An dakatar da hukumar.",
    yo: "Ilé-iṣẹ́ ti dádúró.",
    ig: "Akwụsịla ụlọ ọrụ.",
    fr: "Agence suspendue.",
    pt: "Agência suspensa.",
    sw: "Wakala amesimamishwa.",
    ar: "تم إيقاف الوكالة.",
    tw: "Wɔagyae adwumakuo no.",
    zu: "I-ejensi imisiwe.",
  },
  toastRestored: {
    en: "Agency restored.",
    ha: "An maido da hukumar.",
    yo: "Ilé-iṣẹ́ ti padà.",
    ig: "Eweghachila ụlọ ọrụ.",
    fr: "Agence restaurée.",
    pt: "Agência restaurada.",
    sw: "Wakala amerejeshwa.",
    ar: "تم استعادة الوكالة.",
    tw: "Wɔasan de adwumakuo no aba.",
    zu: "I-ejensi ibuyisiwe.",
  },
  awaitingFirstOwner: {
    en: "Waiting for the first director to accept",
    ha: "Ana jiran daraktan farko ya amince",
    yo: "Ń dúró de olùdarí àkọ́kọ́ láti tẹ́wọ́gbà",
    ig: "Na-eche ka onye nduzi mbụ kwenye",
    fr: "En attente que le premier directeur accepte",
    pt: "A aguardar que o primeiro diretor aceite",
    sw: "Inasubiri mkurugenzi wa kwanza akubali",
    ar: "بانتظار قبول المدير الأول",
    tw: "Ɛretwɛn ɔpanyin a odi kan no ngye atom",
    zu: "Kulindwe umqondisi wokuqala ukuba amukele",
  },
};
