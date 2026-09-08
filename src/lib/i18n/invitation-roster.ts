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
};
