import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The roster's own buttons and the toasts they raise.
 *
 * These were English literals inside the two button components, which
 * meant a Yoruba director revoking an invitation was told "Invitation
 * revoked" in English. They are here rather than in `agency.ts` because
 * both consoles render this roster now — the agency's and BeOrchid's.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string in
 * this codebase translated in-house rather than supplied by the client.
 */
export const INVITATION_ROSTER: {
  resend: L;
  revoke: L;
  sentAgainTemplate: L;
  couldNotEmailTemplate: L;
  revoked: L;
  revokeConfirmTitle: L;
  revokeConfirmBody: L;
  keepInvitation: L;
} = {
  resend: {
    en: "Resend",
    ha: "Sake aikawa",
    yo: "Tún fi ránṣẹ́",
    ig: "Zigharia",
    fr: "Renvoyer",
    pt: "Reenviar",
    sw: "Tuma tena",
    ar: "إعادة الإرسال",
    tw: "San fa kɔ",
    zu: "Thumela futhi",
  },
  revoke: {
    en: "Revoke",
    ha: "Soke",
    yo: "Fagilé",
    ig: "Kagbuo",
    fr: "Révoquer",
    pt: "Revogar",
    sw: "Batilisha",
    ar: "إلغاء",
    tw: "Twa mu",
    zu: "Chitha",
  },
  sentAgainTemplate: {
    en: "Invitation sent again to {email}",
    ha: "An sake aika gayyata zuwa {email}",
    yo: "A tún fi ìpè ránṣẹ́ sí {email}",
    ig: "E zigharịrị òkù ahụ na {email}",
    fr: "Invitation renvoyée à {email}",
    pt: "Convite reenviado para {email}",
    sw: "Mwaliko umetumwa tena kwa {email}",
    ar: "أُعيد إرسال الدعوة إلى {email}",
    tw: "Wɔasan de nsato no akɔma {email}",
    zu: "Isimemo siphinde sathunyelwa ku-{email}",
  },
  couldNotEmailTemplate: {
    en: "Could not email {email}. The invitation is still valid.",
    ha: "Ba a iya aika saƙo zuwa {email} ba. Gayyatar tana nan da inganci.",
    yo: "A kò lè fi ìmèlì ránṣẹ́ sí {email}. Ìpè náà ṣì wúlò.",
    ig: "Enweghị ike izigara {email} ozi. Òkù ahụ ka dị irè.",
    fr: "Impossible d'écrire à {email}. L'invitation reste valable.",
    pt: "Não foi possível enviar e-mail para {email}. O convite continua válido.",
    sw: "Haikuwezekana kutuma barua pepe kwa {email}. Mwaliko bado ni halali.",
    ar: "تعذّر إرسال بريد إلى {email}. الدعوة ما زالت صالحة.",
    tw: "Yɛantumi ammɔ {email} email. Nsato no da so wɔ hɔ.",
    zu: "Ayikwazanga ukuthumela i-imeyili ku-{email}. Isimemo sisasebenza.",
  },
  revoked: {
    en: "Invitation revoked",
    ha: "An soke gayyatar",
    yo: "A ti fagilé ìpè náà",
    ig: "A kagbuola òkù ahụ",
    fr: "Invitation révoquée",
    pt: "Convite revogado",
    sw: "Mwaliko umebatilishwa",
    ar: "أُلغيت الدعوة",
    tw: "Wɔatwa nsato no mu",
    zu: "Isimemo sichithiwe",
  },
  /**
   * Revoke sits next to Resend in every row of both consoles, and the
   * two do opposite things — one gets somebody in, the other shuts them
   * out. `{email}` names the address so the question is answerable
   * without counting rows back up to the header.
   */
  revokeConfirmTitle: {
    en: "Revoke the invitation to {email}?",
    ha: "A soke gayyatar zuwa {email}?",
    yo: "Fagilé ìpè sí {email}?",
    ig: "Kagbuo òkù ahụ e zigaara {email}?",
    fr: "Révoquer l'invitation envoyée à {email} ?",
    pt: "Revogar o convite para {email}?",
    sw: "Batilisha mwaliko kwa {email}?",
    ar: "إلغاء الدعوة المرسلة إلى {email}؟",
    tw: "Twa nsato a wɔde kɔmaa {email} no mu?",
    zu: "Chitha isimemo esiya ku-{email}?",
  },
  revokeConfirmBody: {
    en: "Their link stops working straight away, and it cannot be turned back on — getting them in after this means sending a fresh invitation.",
    ha: "Hanyar haɗin su za ta daina aiki nan take, kuma ba za a iya mayar da ita ba — shigar da su bayan wannan yana nufin aika sabuwar gayyata.",
    yo: "Ọ̀nà àsopọ̀ wọn yóò dáwọ́ ṣíṣiṣẹ́ dúró lẹ́sẹ̀kẹsẹ̀, a kò sì lè tún un pada — mímú wọn wọlé lẹ́yìn èyí túmọ̀ sí fífi ìpè tuntun ránṣẹ́.",
    ig: "Njikọ ha ga-akwụsị ịrụ ọrụ ozugbo, a pụghịkwa iweghachi ya — ime ka ha banye mgbe nke a gasịrị pụtara izipu òkù ọhụrụ.",
    fr: "Leur lien cesse aussitôt de fonctionner et ne peut pas être réactivé — pour les faire entrer ensuite, il faudra envoyer une nouvelle invitation.",
    pt: "A ligação deixa de funcionar de imediato e não pode ser reativada — para os fazer entrar depois disto, terá de enviar um convite novo.",
    sw: "Kiungo chao kinaacha kufanya kazi mara moja, na hakiwezi kurudishwa — kuwaingiza baada ya hapa kunamaanisha kutuma mwaliko mpya.",
    ar: "يتوقف رابطهم عن العمل فورًا، ولا يمكن إعادة تفعيله — وإدخالهم بعد ذلك يعني إرسال دعوة جديدة.",
    tw: "Wɔn link no bɛgyae adwumayɛ ntɛm ara, na wɔrentumi nsan mmue bio — sɛ wopɛ sɛ wɔba mu akyire yi a, ɛsɛ sɛ woto nsato foforɔ.",
    zu: "Isixhumanisi sabo siyeka ukusebenza ngokushesha, futhi asikwazi ukubuyiselwa — ukubangenisa ngemva kwalokhu kusho ukuthumela isimemo esisha.",
  },
  keepInvitation: {
    en: "Keep it",
    ha: "Bar ta",
    yo: "Fi í sílẹ̀",
    ig: "Hapụ ya",
    fr: "La garder",
    pt: "Manter",
    sw: "Uache",
    ar: "الإبقاء عليها",
    tw: "Gyaa no hɔ",
    zu: "Sigcine",
  },
};
