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
  confirmResendTitle: L;
  confirmResendBody: L;
  confirmResendConfirm: L;
  confirmResendDismiss: L;
  confirmRevokeTitle: L;
  confirmRevokeBody: L;
  confirmRevokeConfirm: L;
  confirmRevokeDismiss: L;
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
  confirmResendTitle: {
    en: "Send this invitation again?",
    ha: "A sake aika wannan gayyatar?",
    yo: "Ṣé kí a tún fi ìpè yìí ránṣẹ́?",
    ig: "Zigharia òkù a ọzọ?",
    fr: "Renvoyer cette invitation ?",
    pt: "Reenviar este convite?",
    sw: "Tuma mwaliko huu tena?",
    ar: "إعادة إرسال هذه الدعوة؟",
    tw: "Yɛnsan mfa nsato yi nkɔ?",
    zu: "Thumela lesi simemo futhi?",
  },
  confirmResendBody: {
    en: "A new email goes to {email}. The link already sent stays valid.",
    ha: "Sabon saƙo zai je zuwa {email}. Hanyar da aka riga aka aika tana nan da inganci.",
    yo: "Ìmèlì tuntun yóò lọ sí {email}. Ọ̀nà tí a ti fi ránṣẹ́ ṣì wúlò.",
    ig: "Ozi ọhụrụ ga-aga na {email}. Njikọ e zigaralarị ka dị irè.",
    fr: "Un nouvel e-mail part vers {email}. Le lien déjà envoyé reste valable.",
    pt: "Um novo e-mail segue para {email}. O link já enviado continua válido.",
    sw: "Barua pepe mpya itakwenda kwa {email}. Kiungo kilichotumwa tayari bado ni halali.",
    ar: "سيُرسَل بريد جديد إلى {email}. الرابط المُرسَل سابقًا ما زال صالحًا.",
    tw: "Email foforɔ bɛkɔ {email}. Nkitahodi a wɔasoma dada no da so wɔ hɔ.",
    zu: "I-imeyili entsha iya ku-{email}. Isixhumanisi esesithunyelwe sisasebenza.",
  },
  confirmResendConfirm: {
    en: "Send again",
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
  confirmResendDismiss: {
    en: "Not now",
    ha: "Ba yanzu ba",
    yo: "Kì í ṣe nísinsìnyí",
    ig: "Ọ bụghị ugbu a",
    fr: "Pas maintenant",
    pt: "Agora não",
    sw: "Si sasa",
    ar: "ليس الآن",
    tw: "Ɛnyɛ seesei",
    zu: "Hhayi manje",
  },
  confirmRevokeTitle: {
    en: "Revoke this invitation?",
    ha: "A soke wannan gayyatar?",
    yo: "Ṣé kí a fagilé ìpè yìí?",
    ig: "Kagbuo òkù a?",
    fr: "Révoquer cette invitation ?",
    pt: "Revogar este convite?",
    sw: "Batilisha mwaliko huu?",
    ar: "إلغاء هذه الدعوة؟",
    tw: "Yɛntwa nsato yi mu?",
    zu: "Chitha lesi simemo?",
  },
  confirmRevokeBody: {
    en: "{email} will not be able to use the link they were sent. You can invite them again afterwards.",
    ha: "{email} ba zai iya amfani da hanyar da aka aika masa ba. Kana iya sake gayyatarsa daga baya.",
    yo: "{email} kò ní lè lo ọ̀nà tí a fi ránṣẹ́ sí i. O lè tún pè é lẹ́yìn náà.",
    ig: "{email} agaghị enwe ike iji njikọ e zigaara ya. Ị nwere ike ịkpọ ya ọzọ ma emesịa.",
    fr: "{email} ne pourra plus utiliser le lien qui lui a été envoyé. Vous pourrez l'inviter à nouveau ensuite.",
    pt: "{email} não poderá usar o link que recebeu. Pode convidá-lo novamente depois.",
    sw: "{email} hataweza kutumia kiungo alichotumiwa. Unaweza kumwalika tena baadaye.",
    ar: "لن يتمكن {email} من استخدام الرابط المُرسَل إليه. يمكنك دعوته مرة أخرى لاحقًا.",
    tw: "{email} rentumi mfa nkitahodi a wɔde kɔmaa no no nni dwuma. Wubetumi asan ato nsa afrɛ no akyiri yi.",
    zu: "{email} ngeke akwazi ukusebenzisa isixhumanisi asithunyelwe. Ungaphinda ummeme kamuva.",
  },
  confirmRevokeConfirm: {
    en: "Revoke invitation",
    ha: "Soke gayyatar",
    yo: "Fagilé ìpè náà",
    ig: "Kagbuo òkù ahụ",
    fr: "Révoquer l'invitation",
    pt: "Revogar convite",
    sw: "Batilisha mwaliko",
    ar: "إلغاء الدعوة",
    tw: "Twa nsato no mu",
    zu: "Chitha isimemo",
  },
  /**
   * Never "Cancel". `OPS_COMMON.cancel` and `revoke` above are the same
   * word in Hausa, Yoruba, Igbo, Twi and Arabic — "Soke", "Fagilé",
   * "Kagbuo", "Twa mu", "إلغاء" — so a Cancel/Revoke pair would set two
   * identical buttons side by side for half the languages this product
   * speaks, with the destructive one indistinguishable from the way out.
   * Naming what the dismissal *keeps* is legible in all ten.
   */
  confirmRevokeDismiss: {
    en: "Keep invitation",
    ha: "Bar gayyatar",
    yo: "Fi ìpè náà sílẹ̀",
    ig: "Hapụ òkù ahụ",
    fr: "Conserver l'invitation",
    pt: "Manter convite",
    sw: "Acha mwaliko",
    ar: "الإبقاء على الدعوة",
    tw: "Gyaw nsato no",
    zu: "Gcina isimemo",
  },
};
