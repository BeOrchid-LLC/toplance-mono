import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * Calling a traveller in.
 *
 * One dictionary for both sides — the handler's form and the
 * traveller's notice — because they describe one appointment, and two
 * dictionaries would drift into two vocabularies for it.
 *
 * NEEDS NATIVE REVIEW before launch, as with `ops-common.ts`.
 */
export const ATTENDANCE: {
  panelTitle: L;
  panelLead: L;
  kindBiometrics: L;
  kindInterview: L;
  whenLabel: L;
  whenHint: L;
  placeLabel: L;
  placePlaceholder: L;
  noteLabel: L;
  notePlaceholder: L;
  send: L;
  sent: L;
  noticeBiometrics: L;
  noticeInterview: L;
  noticeWhen: L;
  noticeTimeToCome: L;
  noticeWhere: L;
} = {
  panelTitle: {
    en: "Ask them to come in", ha: "Nemi su zo", yo: "Béèrè kí wọ́n wá",
    ig: "Rịọ ka ha bịa", fr: "Demander de venir", pt: "Pedir que compareça",
    sw: "Waombe waje", ar: "اطلب منهم الحضور", tw: "Ka kyerɛ wɔn sɛ wɔmmra",
    zu: "Cela beze",
  },
  panelLead: {
    en: "Biometrics and interviews happen at an office, not here. This sends the traveller the address and the time, by email and on their dashboard.",
    ha: "Ana yin biometrics da tattaunawa a ofis, ba a nan ba. Wannan yana aika wa matafiyin adireshi da lokaci, ta imel da kuma allon sarrafa su.",
    yo: "Biometrics àti ìfọ̀rọ̀wánilẹ́nuwò ń ṣẹlẹ̀ ní ọ́fíìsì, kì í ṣe níbí. Èyí ń fi àdírẹ́sì àti àkókò ránṣẹ́ sí arìnrìn-àjò, nípasẹ̀ ímeèlì àti lórí dasibọ́ọ̀dù wọn.",
    ig: "Biometrics na ajụjụ ọnụ na-eme nʼụlọ ọrụ, ọ bụghị ebe a. Nke a na-ezigara onye njem adreesị na oge, site na email na dashboard ha.",
    fr: "La biométrie et les entretiens ont lieu dans un bureau, pas ici. Ceci envoie au voyageur l'adresse et l'heure, par e-mail et sur son tableau de bord.",
    pt: "A biometria e as entrevistas acontecem num escritório, não aqui. Isto envia ao viajante a morada e a hora, por e-mail e no painel.",
    sw: "Biometriki na mahojiano hufanyika ofisini, si hapa. Hii humtumia msafiri anwani na wakati, kwa barua pepe na kwenye dashibodi yake.",
    ar: "تجري القياسات الحيوية والمقابلات في مكتب، لا هنا. يرسل هذا إلى المسافر العنوان والوقت، بالبريد الإلكتروني وعلى لوحته.",
    tw: "Biometrics ne nkɔmmɔbisa sisi ɔfese, ɛnyɛ ha. Yei de address ne berɛ kɔma ɔkwantufoɔ no, wɔ email ne ne dashboard so.",
    zu: "I-biometrics nezinhlolokhono kwenzeka ehhovisi, hhayi lapha. Lokhu kuthumela umhambi ikheli nesikhathi, nge-imeyili nakudeshibhodi yakhe.",
  },
  kindBiometrics: {
    en: "Biometrics", ha: "Biometrics", yo: "Biometrics", ig: "Biometrics",
    fr: "Biométrie", pt: "Biometria", sw: "Biometriki", ar: "القياسات الحيوية",
    tw: "Biometrics", zu: "I-biometrics",
  },
  kindInterview: {
    en: "Interview", ha: "Tattaunawa", yo: "Ìfọ̀rọ̀wánilẹ́nuwò", ig: "Ajụjụ ọnụ",
    fr: "Entretien", pt: "Entrevista", sw: "Mahojiano", ar: "مقابلة",
    tw: "Nkɔmmɔbisa", zu: "Inhlolokhono",
  },
  whenLabel: {
    en: "When", ha: "Yaushe", yo: "Ìgbà", ig: "Mgbe", fr: "Quand", pt: "Quando",
    sw: "Lini", ar: "متى", tw: "Berɛ bɛn", zu: "Nini",
  },
  whenHint: {
    en: "Leave it empty if you have not booked a slot — the traveller is told you will confirm.",
    ha: "Ka bar shi babu komai idan ba ka yi ajiya ba — za a gaya wa matafiyin cewa za ka tabbatar.",
    yo: "Fi í sílẹ̀ ní òfìfo bí o kò tíì gba àkókò — a ó sọ fún arìnrìn-àjò pé wàá jẹ́rìí sí i.",
    ig: "Hapụ ya efu ma ọ bụrụ na ị debeghị oge — a ga-agwa onye njem na ị ga-akwado ya.",
    fr: "Laissez vide si aucun créneau n'est réservé — le voyageur est informé que vous confirmerez.",
    pt: "Deixe vazio se ainda não marcou — o viajante é informado de que irá confirmar.",
    sw: "Iache wazi kama hujaweka nafasi — msafiri ataambiwa utathibitisha.",
    ar: "اتركه فارغًا إن لم تحجز موعدًا — سيُبلَّغ المسافر بأنك ستؤكد لاحقًا.",
    tw: "Gyaa no hɔ sɛ wonyaa berɛ ɛ — wɔbɛka akyerɛ ɔkwantufoɔ no sɛ wobɛsi so dua.",
    zu: "Kushiye kungenalutho uma ungakabhukhi — umhambi utshelwa ukuthi uzoqinisekisa.",
  },
  placeLabel: {
    en: "Where", ha: "Ina", yo: "Ibi", ig: "Ebee", fr: "Où", pt: "Onde",
    sw: "Wapi", ar: "أين", tw: "Ɛhe", zu: "Kuphi",
  },
  placePlaceholder: {
    en: "The office and its address",
    ha: "Ofis da adireshinsa", yo: "Ọ́fíìsì àti àdírẹ́sì rẹ̀",
    ig: "Ụlọ ọrụ na adreesị ya", fr: "Le bureau et son adresse",
    pt: "O escritório e a morada", sw: "Ofisi na anwani yake",
    ar: "المكتب وعنوانه", tw: "Ɔfese no ne ne address",
    zu: "Ihhovisi nekheli lalo",
  },
  noteLabel: {
    en: "Anything to bring", ha: "Abin da za a kawo", yo: "Ohun tí wọ́n máa mú wá",
    ig: "Ihe ọ bụla ị ga-eweta", fr: "À apporter", pt: "O que levar",
    sw: "Cha kuleta", ar: "ما ينبغي إحضاره", tw: "Deɛ wɔmfa mmra",
    zu: "Okufanele bakulethe",
  },
  notePlaceholder: {
    en: "Passport, appointment slip, anything else",
    ha: "Fasfo, takardar alƙawari, da sauransu",
    yo: "Ìwé ìrìnnà, ìwé ìpàdé, àti ohunkóhun mìíràn",
    ig: "Paspọtụ, akwụkwọ oge, ihe ọzọ ọ bụla",
    fr: "Passeport, convocation, autre chose",
    pt: "Passaporte, marcação, o que mais for preciso",
    sw: "Pasipoti, karatasi ya miadi, kingine chochote",
    ar: "جواز السفر، ورقة الموعد، وأي شيء آخر",
    tw: "Passport, nhyiam krataa, biribiara foforɔ",
    zu: "Ipasipoti, iphepha lokubhukha, noma yini enye",
  },
  send: {
    en: "Send the invitation", ha: "Aika gayyatar", yo: "Fi ìpè náà ránṣẹ́",
    ig: "Ziga ọkpụkpọ ahụ", fr: "Envoyer l'invitation", pt: "Enviar o convite",
    sw: "Tuma mwaliko", ar: "إرسال الدعوة", tw: "Fa nsato no kɔ",
    zu: "Thumela isimemo",
  },
  sent: {
    en: "Sent", ha: "An aika", yo: "A fi ránṣẹ́", ig: "Ezigara ya",
    fr: "Envoyée", pt: "Enviado", sw: "Imetumwa", ar: "أُرسلت",
    tw: "Wɔde kɔeɛ", zu: "Kuthunyelwe",
  },
  noticeBiometrics: {
    en: "Your agency needs you for biometrics",
    ha: "Hukumarka na buƙatarka don biometrics",
    yo: "Ilé-iṣẹ́ rẹ nílò rẹ fún biometrics",
    ig: "Ụlọ ọrụ gị chọrọ gị maka biometrics",
    fr: "Votre agence vous attend pour la biométrie",
    pt: "A sua agência precisa de si para a biometria",
    sw: "Wakala wako anakuhitaji kwa biometriki",
    ar: "وكالتك بحاجة إليك لأخذ القياسات الحيوية",
    tw: "W'adwumakuo hia wo ma biometrics",
    zu: "I-ejensi yakho iyakudinga nge-biometrics",
  },
  noticeInterview: {
    en: "Your agency needs you for an interview",
    ha: "Hukumarka na buƙatarka don tattaunawa",
    yo: "Ilé-iṣẹ́ rẹ nílò rẹ fún ìfọ̀rọ̀wánilẹ́nuwò",
    ig: "Ụlọ ọrụ gị chọrọ gị maka ajụjụ ọnụ",
    fr: "Votre agence vous attend pour un entretien",
    pt: "A sua agência precisa de si para uma entrevista",
    sw: "Wakala wako anakuhitaji kwa mahojiano",
    ar: "وكالتك بحاجة إليك لإجراء مقابلة",
    tw: "W'adwumakuo hia wo ma nkɔmmɔbisa",
    zu: "I-ejensi yakho iyakudinga enhlolokhonweni",
  },
  noticeWhen: {
    en: "When", ha: "Yaushe", yo: "Ìgbà", ig: "Mgbe", fr: "Quand", pt: "Quando",
    sw: "Lini", ar: "متى", tw: "Berɛ bɛn", zu: "Nini",
  },
  noticeTimeToCome: {
    en: "Your agency will confirm the time with you.",
    ha: "Hukumarka za ta tabbatar da lokacin tare da kai.",
    yo: "Ilé-iṣẹ́ rẹ yóò jẹ́rìí àkókò náà fún ọ.",
    ig: "Ụlọ ọrụ gị ga-akwado oge ahụ gị.",
    fr: "Votre agence vous confirmera l'heure.",
    pt: "A sua agência confirmará a hora consigo.",
    sw: "Wakala wako atathibitisha muda nawe.",
    ar: "ستؤكد لك وكالتك الموعد.",
    tw: "W'adwumakuo bɛsi berɛ no so dua akyerɛ wo.",
    zu: "I-ejensi yakho izoqinisekisa isikhathi nawe.",
  },
  noticeWhere: {
    en: "Where", ha: "Ina", yo: "Ibi", ig: "Ebee", fr: "Où", pt: "Onde",
    sw: "Wapi", ar: "أين", tw: "Ɛhe", zu: "Kuphi",
  },
};
