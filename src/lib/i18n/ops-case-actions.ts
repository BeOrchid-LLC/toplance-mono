import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The three client components on the case screen that post their own
 * server actions and toast their own outcome: `add-case-note.tsx`,
 * `review-row.tsx` and `status-control.tsx`. The server-side error
 * strings those actions can return (`@/app/ops/actions.ts`) already come
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
export const OPS_ADD_NOTE: {
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

export const OPS_REVIEW_ROW: {
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

export const OPS_STATUS_CONTROL: {
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
    en: "No staff action from this state — it is either terminal, or waiting on the traveler.",
    ha: "Babu wani mataki na ma'aikata daga wannan matsayi — ko dai ya ƙare, ko yana jiran matafiyi.",
    yo: "Kò sí ìgbésẹ̀ òṣìṣẹ́ kankan láti ipò yìí — yálà ó ti parí pátápátá, tàbí ó ń dúró de arìnrìn-àjò.",
    ig: "Enweghị ihe onye ọrụ ga-eme site n'ọnọdụ a — ma ọ bụ ọ kwụsịla, ma ọ bụ ọ na-eche onye njem.",
    fr: "Aucune action du personnel n'est possible depuis cet état — soit il est final, soit on attend le voyageur.",
    pt: "Nenhuma ação da equipa é possível a partir deste estado — ou é terminal, ou está à espera do viajante.",
    sw: "Hakuna hatua ya wafanyakazi kutoka hali hii — ama ni ya mwisho, au inasubiri msafiri.",
    ar: "لا يوجد إجراء للموظفين من هذه الحالة — فهي إما نهائية أو بانتظار المسافر.",
    tw: "Adwumayɛfoɔ biribiara nni hɔ a wɔbɛtumi ayɛ afiri tebea yi mu — ɛyɛ deɛ awie, anaasɛ ɛretwɛn akwantufoɔ no.",
    zu: "Asikho isenzo sabasebenzi kulesi simo — noma siphelile, noma silinde isihambi.",
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
  /** `{status}` is `STATUS[to].label` (`@/lib/domain/status.ts`), which is not itself localised — see the review's flags. */
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
