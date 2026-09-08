import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The three client components on the case screen that post their own
 * server actions and toast their own outcome: `add-case-note.tsx`,
 * `review-row.tsx` and `status-control.tsx`. The server-side error
 * strings those actions can return (`@/app/[locale]/ops/actions.ts`) already come
 * back pre-localised — see `OPS_ACTIONS` — so only the copy these
 * components author themselves (placeholders, buttons, success toasts)
 * lives here.
 *
 * `{name}` and `{status}` below are replaced by the caller before the
 * string is shown — the same token-and-`replace` idiom
 * `@/lib/domain/intake.ts` uses for `{fullName}`.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const ADD_NOTE: {
  placeholder: L;
  button: L;
  toastSuccess: L;
} = {
  placeholder: {
    en: "What should the file remember? The traveler reads this on their profile.",
    ha: "Mene ne ya kamata fayil ya tuna? Matafiyi yana karanta wannan a bayaninsa.",
    yo: "Kí ni ó yẹ kí fáìlì náà rántí? Arìnrìn-àjò máa ń kà èyí ní ojú ìwé rẹ̀.",
    ig: "Gịnị ka faịlụ kwesịrị icheta? Onye njem na-agụ nke a na profaịlụ ya.",
    fr: "Que doit retenir le dossier ? Le voyageur lit ceci sur son profil.",
    pt: "O que o processo deve reter? O viajante lê isto no seu perfil.",
    sw: "Faili linapaswa kukumbuka nini? Msafiri anasoma haya kwenye wasifu wake.",
    ar: "ما الذي ينبغي أن يتذكره الملف؟ يقرأ المسافر هذا في ملفه الشخصي.",
    tw: "Dɛn na ɛsɛ sɛ faele no kae? Akwantufoɔ no kenkan yei wɔ ne profael so.",
    zu: "Yini okufanele ifayela likhumbule? Isihambi sifunda lokhu kuphrofayela yaso.",
  },
  button: {
    en: "Add note",
    ha: "Ƙara bayani",
    yo: "Fi àkíyèsí kún un",
    ig: "Tinye ndetu",
    fr: "Ajouter une note",
    pt: "Adicionar nota",
    sw: "Ongeza dokezo",
    ar: "إضافة ملاحظة",
    tw: "Fa nsɛm ka ho",
    zu: "Engeza inothi",
  },
  toastSuccess: {
    en: "Note added — the traveler sees it on their profile",
    ha: "An ƙara bayani — matafiyi zai gani a bayaninsa",
    yo: "A fi àkíyèsí kún un — arìnrìn-àjò yóò rí i ní ojú ìwé rẹ̀",
    ig: "Etinyela ndetu — onye njem ga-ahụ ya na profaịlụ ya",
    fr: "Note ajoutée — le voyageur la voit sur son profil",
    pt: "Nota adicionada — o viajante vê-a no seu perfil",
    sw: "Dokezo limeongezwa — msafiri ataliona kwenye wasifu wake",
    ar: "تمت إضافة الملاحظة — سيراها المسافر في ملفه الشخصي",
    tw: "Wɔde nsɛm no aka ho — akwantufoɔ no bɛhu wɔ ne profael so",
    zu: "Inothi lengeziwe — isihambi sizolibona kuphrofayela yaso",
  },
};

export const REVIEW_ROW: {
  view: L;
  verify: L;
  flag: L;
  flagForTraveler: L;
  flagPlaceholder: L;
  optional: L;
  toastVerified: L;
  toastFlagged: L;
  toastOpenFailed: L;
} = {
  view: {
    en: "View",
    ha: "Duba",
    yo: "Wo",
    ig: "Lee",
    fr: "Voir",
    pt: "Ver",
    sw: "Ona",
    ar: "عرض",
    tw: "Hwɛ",
    zu: "Buka",
  },
  verify: {
    en: "Verify",
    ha: "Tabbatar",
    yo: "Ṣàyẹ̀wò",
    ig: "Kwado",
    fr: "Vérifier",
    pt: "Verificar",
    sw: "Thibitisha",
    ar: "تحقّق",
    tw: "Hwɛ mu",
    zu: "Qinisekisa",
  },
  flag: {
    en: "Flag",
    ha: "Yiwa alama",
    yo: "Sàmì sí i",
    ig: "Kaa ihe ịrịba ama",
    fr: "Signaler",
    pt: "Assinalar",
    sw: "Weka alama",
    ar: "وضع علامة",
    tw: "Hyɛ agyiraehyɛde",
    zu: "Phawula",
  },
  flagForTraveler: {
    en: "Flag for the traveler",
    ha: "Yiwa alama don matafiyi",
    yo: "Sàmì sí i fún arìnrìn-àjò",
    ig: "Kaa ihe ịrịba ama maka onye njem",
    fr: "Signaler au voyageur",
    pt: "Assinalar para o viajante",
    sw: "Weka alama kwa msafiri",
    ar: "وضع علامة للمسافر",
    tw: "Hyɛ agyiraehyɛde ma akwantufoɔ no",
    zu: "Phawulela isihambi",
  },
  flagPlaceholder: {
    en: "What is wrong, and what should they upload instead? The traveler reads this.",
    ha: "Mene ne bai dace ba, kuma me ya kamata su ɗora a maimako? Matafiyi yana karanta wannan.",
    yo: "Kí ni kò tọ́, kí sì ni ó yẹ kí wọ́n gbé sókè dípò rẹ̀? Arìnrìn-àjò máa ń kà èyí.",
    ig: "Gịnị ka ọ na-ezighị ezi, gịnịkwa ka ha kwesịrị ibugo kama? Onye njem na-agụ nke a.",
    fr: "Qu'est-ce qui ne va pas, et que devraient-ils téléverser à la place ? Le voyageur lit ceci.",
    pt: "O que está errado, e o que devem carregar em vez disso? O viajante lê isto.",
    sw: "Nini kibaya, na wapakie nini badala yake? Msafiri anasoma haya.",
    ar: "ما الخطأ، وما الذي ينبغي رفعه بدلاً منه؟ يقرأ المسافر هذا.",
    tw: "Dɛn na ɛnyɛ dɛn, na dɛn na ɛsɛ sɛ wɔde to soro wɔ ananmu? Akwantufoɔ no kenkan yei.",
    zu: "Kuyini okungalungile, futhi yini abangayilayisha esikhundleni? Isihambi siyalifunda leli.",
  },
  optional: {
    en: "Optional",
    ha: "Zaɓaɓɓe",
    yo: "Yíyàn",
    ig: "Nhọrọ",
    fr: "Facultatif",
    pt: "Opcional",
    sw: "Hiari",
    ar: "اختياري",
    tw: "Ɛnyɛ ahyɛde",
    zu: "Kuyazikhethela",
  },
  /** `{name}` is `doc.name`, the requirement's own title — left untouched. */
  toastVerified: {
    en: "{name} verified",
    ha: "An tabbatar da {name}",
    yo: "A ṣàyẹ̀wò {name}",
    ig: "Ekwadoro {name}",
    fr: "{name} vérifié",
    pt: "{name} verificado",
    sw: "{name} imethibitishwa",
    ar: "تم التحقق من {name}",
    tw: "Wɔahwɛ {name} mu",
    zu: "I-{name} iqinisekisiwe",
  },
  toastFlagged: {
    en: "{name} flagged — the traveler sees your reason",
    ha: "An yiwa {name} alama — matafiyi zai ga dalilinka",
    yo: "A ti sàmì sí {name} — arìnrìn-àjò yóò rí ìdí rẹ",
    ig: "Akaala {name} ihe ịrịba ama — onye njem ga-ahụ ihe kpatara ya",
    fr: "{name} signalé — le voyageur voit votre motif",
    pt: "{name} assinalado — o viajante vê o seu motivo",
    sw: "{name} imewekwa alama — msafiri ataona sababu yako",
    ar: "تم وضع علامة على {name} — سيرى المسافر سببك",
    tw: "Wɔahyɛ {name} agyiraehyɛde — akwantufoɔ no bɛhu wo nkyerɛase",
    zu: "I-{name} iphawuliwe — isihambi sizosibona isizathu sakho",
  },
  toastOpenFailed: {
    en: "That file could not be opened.",
    ha: "Ba a iya buɗe wannan fayil ba.",
    yo: "A kò lè ṣí fáìlì náà.",
    ig: "Enweghị ike imepe faịlụ ahụ.",
    fr: "Ce fichier n'a pas pu être ouvert.",
    pt: "Não foi possível abrir esse ficheiro.",
    sw: "Faili hilo halikuweza kufunguliwa.",
    ar: "تعذّر فتح هذا الملف.",
    tw: "Wɔantumi ammue saa faele no.",
    zu: "Leli fayela alikwazanga ukuvulwa.",
  },
};

export const STATUS_CONTROL: {
  messagePlaceholder: L;
  noAction: L;
  confirmApproval: L;
  confirmRejection: L;
  toastMoved: L;
} = {
  messagePlaceholder: {
    en: "Message to the traveler — every status change sends one.",
    ha: "Saƙo zuwa matafiyi — kowane canjin matsayi yana aika ɗaya.",
    yo: "Ìránṣẹ́ sí arìnrìn-àjò — gbogbo ìyípadà ipò máa ń fi ọ̀kan ránṣẹ́.",
    ig: "Ozi gaa n'aka onye njem — mgbanwe ọnọdụ ọ bụla na-eziga otu.",
    fr: "Message au voyageur — chaque changement de statut en envoie un.",
    pt: "Mensagem para o viajante — cada mudança de estado envia uma.",
    sw: "Ujumbe kwa msafiri — kila mabadiliko ya hali hutuma mmoja.",
    ar: "رسالة إلى المسافر — كل تغيير في الحالة يرسل واحدة.",
    tw: "Nkrasɛm ma akwantufoɔ no — tebea nsakraeɛ biara de baako kɔma.",
    zu: "Umlayezo esihambini — konke ukuguqulwa kwesimo kuthumela owodwa.",
  },
  noAction: {
    en: "No action from this state — it is either decided, or waiting on the traveler.",
    ha: "Babu abin da za a yi daga wannan matsayin — ko dai an yanke shawara, ko ana jiran matafiyin.",
    yo: "Kò sí ìgbésẹ̀ láti ipò yìí — bóyá a ti pinnu rẹ̀, tàbí à ń dúró de arìnrìn-àjò náà.",
    ig: "Enweghị ihe ị ga-eme site na ọnọdụ a — ma ọ bụ ekpebiela ya, ma ọ bụ na-eche onye njem.",
    fr: "Aucune action possible depuis cet état — soit il est tranché, soit il attend le voyageur.",
    pt: "Nenhuma ação a partir deste estado — ou já foi decidido, ou aguarda o viajante.",
    sw: "Hakuna hatua kutoka hali hii — ama imeamuliwa, au inasubiri msafiri.",
    ar: "لا إجراء من هذه الحالة — إما أنها حُسمت، أو أنها بانتظار المسافر.",
    tw: "Biribiara nni hɔ a wobɛyɛ afiri tebea yi mu — anaasɛ wɔasi so gyinae, anaasɛ ɛretwɛn ɔkwantuni no.",
    zu: "Asikho isenzo esisuka kulesi simo — noma sesinqunyiwe, noma silinde umhambi.",
  },
  confirmApproval: {
    en: "Confirm approval",
    ha: "Tabbatar da amincewa",
    yo: "Fìdí ìfọwọ́sí múlẹ̀",
    ig: "Kwenye nkwenye",
    fr: "Confirmer l'approbation",
    pt: "Confirmar aprovação",
    sw: "Thibitisha idhini",
    ar: "تأكيد الموافقة",
    tw: "Si so dua sɛ wɔapene so",
    zu: "Qinisekisa ukugunyazwa",
  },
  confirmRejection: {
    en: "Confirm rejection",
    ha: "Tabbatar da ƙi",
    yo: "Fìdí ìkọ̀sílẹ̀ múlẹ̀",
    ig: "Kwenye ajụjụ",
    fr: "Confirmer le refus",
    pt: "Confirmar rejeição",
    sw: "Thibitisha kukataliwa",
    ar: "تأكيد الرفض",
    tw: "Si so dua sɛ wɔapow",
    zu: "Qinisekisa ukwenqatshwa",
  },
  /** `{status}` is `STATUS_COPY[to].label` (`@/lib/i18n/status.ts`), localised into the same locale as this sentence. */
  toastMoved: {
    en: 'Case moved to "{status}" — the traveler has been told',
    ha: 'An mayar da shari\'a zuwa "{status}" — an sanar da matafiyi',
    yo: 'A ti gbé ẹjọ́ lọ sí "{status}" — a ti sọ fún arìnrìn-àjò',
    ig: 'Ebugharịla ikpe gaa na "{status}" — agwaala onye njem',
    fr: '« {status} » — le voyageur a été informé',
    pt: 'Processo movido para "{status}" — o viajante foi informado',
    sw: 'Kesi imehamishiwa "{status}" — msafiri ameambiwa',
    ar: 'انتقلت الحالة إلى "{status}" — تم إخبار المسافر',
    tw: 'Wɔde asɛm no akɔ "{status}" mu — wɔaka akyerɛ akwantufoɔ no',
    zu: 'Icala lidluliselwe ku-"{status}" — isihambi sitsheliwe',
  },
};

/**
 * The `flag_reason` enum in words.
 *
 * The class is for whoever is debugging later — it aggregates, the
 * reviewer's sentence does not — and the sentence beside it is what the
 * traveller reads. Both are collected in one step because a reviewer who
 * has just looked at the file knows both answers at once; asking later
 * would mean asking never. See the enum's own note in `schema.ts`.
 */
export const FLAG_REASONS: {
  legend: L;
  unreadable: L;
  expired: L;
  wrong_document: L;
  incomplete: L;
  mismatch: L;
  other: L;
} = {
  legend: {
    en: "What kind of problem?",
    ha: "Wace irin matsala ce?",
    yo: "Irú ìṣòro wo ni?",
    ig: "Ụdị nsogbu dị aṅaa?",
    fr: "Quel type de problème ?",
    pt: "Que tipo de problema?",
    sw: "Ni tatizo la aina gani?",
    ar: "ما نوع المشكلة؟",
    tw: "Ɔhaw bɛn?",
    zu: "Yiluphi uhlobo lwenkinga?",
  },
  unreadable: {
    en: "Cannot be read",
    ha: "Ba a iya karantawa",
    yo: "A kò lè kà á",
    ig: "Enweghị ike ịgụ ya",
    fr: "Illisible",
    pt: "Não se consegue ler",
    sw: "Haisomeki",
    ar: "غير مقروء",
    tw: "Wontumi nkenkan",
    zu: "Ayikwazi ukufundeka",
  },
  expired: {
    en: "Out of date",
    ha: "Ya ƙare",
    yo: "Ó ti parí",
    ig: "Oge agwụla",
    fr: "Périmé",
    pt: "Fora de validade",
    sw: "Muda umeisha",
    ar: "منتهي الصلاحية",
    tw: "Ano atɔ",
    zu: "Iphelelwe yisikhathi",
  },
  wrong_document: {
    en: "Wrong document",
    ha: "Takardar da ba daidai ba",
    yo: "Ìwé tí kò tọ́",
    ig: "Akwụkwọ na-ezighị ezi",
    fr: "Mauvais document",
    pt: "Documento errado",
    sw: "Hati isiyo sahihi",
    ar: "مستند خاطئ",
    tw: "Krataa a ɛnteɛ",
    zu: "Idokhumenti engalungile",
  },
  incomplete: {
    en: "Pages or details missing",
    ha: "An rasa shafuka ko bayanai",
    yo: "Àwọn ojú ìwé tàbí àwọn àlàyé kò pé",
    ig: "Ibe ma ọ bụ nkọwa na-efu",
    fr: "Pages ou informations manquantes",
    pt: "Faltam páginas ou dados",
    sw: "Kurasa au maelezo hayapo",
    ar: "صفحات أو بيانات ناقصة",
    tw: "Nkratafa anaa nsɛm bi ayera",
    zu: "Kunamakhasi noma imininingwane engekho",
  },
  mismatch: {
    en: "Details do not match",
    ha: "Bayanan ba su yi daidai ba",
    yo: "Àwọn àlàyé kò bára mu",
    ig: "Nkọwa adabaghị",
    fr: "Les informations ne concordent pas",
    pt: "Os dados não coincidem",
    sw: "Maelezo hayalingani",
    ar: "البيانات غير متطابقة",
    tw: "Nsɛm no nhyia",
    zu: "Imininingwane ayifani",
  },
  other: {
    en: "Something else",
    ha: "Wani abu dabam",
    yo: "Ohun mìíràn",
    ig: "Ihe ọzọ",
    fr: "Autre chose",
    pt: "Outra coisa",
    sw: "Jambo lingine",
    ar: "شيء آخر",
    tw: "Biribi foforɔ",
    zu: "Okunye",
  },
};

/**
 * The words the case screen needs that are nobody's vocabulary in
 * particular. Copied from `OPS_COMMON` rather than imported: the agency
 * console should not have to reach into the platform console's strings
 * to say "Cancel", and one shared word is not a dependency worth having
 * between two consoles that are meant to drift apart.
 */
export const CASE_COMMON: { cancel: L; handledBy: L; unheld: L; takeCase: L; release: L; assignTo: L } = {
  cancel: {
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
  handledBy: {
    en: "Handled by",
    ha: "Wanda ke kula da shi",
    yo: "Ẹni tí ń bójú tó",
    ig: "Onye na-ahụ maka ya",
    fr: "Suivi par",
    pt: "Tratado por",
    sw: "Anashughulikiwa na",
    ar: "يتولاه",
    tw: "Nea ɔhwɛ so",
    zu: "Kuphathwa ngu",
  },
  unheld: {
    en: "Nobody yet",
    ha: "Babu kowa tukuna",
    yo: "Kò sí ẹnikẹ́ni síbẹ̀",
    ig: "Ọ dịbeghị onye",
    fr: "Personne pour l'instant",
    pt: "Ainda ninguém",
    sw: "Bado hakuna mtu",
    ar: "لا أحد بعد",
    tw: "Obiara nni hɔ",
    zu: "Akekho okwamanje",
  },
  takeCase: {
    en: "Take this case",
    ha: "Ka ɗauki wannan shari'ar",
    yo: "Gba ẹjọ́ yìí",
    ig: "Were okwu a",
    fr: "Prendre ce dossier",
    pt: "Assumir este caso",
    sw: "Chukua kesi hii",
    ar: "تولَّ هذه الحالة",
    tw: "Fa asɛm yi",
    zu: "Thatha leli cala",
  },
  release: {
    en: "Hand back",
    ha: "Mayar da shi",
    yo: "Dá a padà",
    ig: "Nyeghachi ya",
    fr: "Rendre",
    pt: "Devolver",
    sw: "Rudisha",
    ar: "إعادته",
    tw: "San fa ma",
    zu: "Buyisela",
  },
  assignTo: {
    en: "Hand to a colleague",
    ha: "Ba abokin aiki",
    yo: "Fi lé alábàáṣiṣẹ́ lọ́wọ́",
    ig: "Nyefee onye ọrụ ibe gị",
    fr: "Confier à un collègue",
    pt: "Entregar a um colega",
    sw: "Mpe mwenzako",
    ar: "أسندها إلى زميل",
    tw: "Fa ma wo yɔnko adwumayɛni",
    zu: "Nikeza ozakwenu",
  },
};
