import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The user-facing refusals `completeProfile` and `checkInvitedEmail`
 * return — the only copy in `(auth)/actions.ts`. Read with `getLocale()`:
 * a Server Action runs within the request that invoked it, so the same
 * `x-toplance-locale` header `proxy.ts` sets for the page is still there
 * when the action itself runs.
 *
 * `workEmailRefusal()` (`@/lib/domain/work-email`) is deliberately not
 * covered here — that module is not owned by this pass. See the handoff
 * notes.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house from the
 * English, like `HERO` before it.
 */
export const AUTH_ACTIONS: {
  sessionLost: L;
  fullNameRequired: L;
  noClerkEmail: L;
  invitationDead: L;
  invitationMismatch: L;
} = {
  sessionLost: {
    en: "Your session did not carry through. Sign in again.",
    ha: "Zaman ka bai kai ba. Sake shiga.",
    yo: "Ìgbà ìlò rẹ kò gbé kọjá. Tún wọlé.",
    ig: "Oge nnọkọ gị agabigaghị. Banye ọzọ.",
    fr: "Votre session ne s'est pas propagée. Reconnectez-vous.",
    pt: "A sua sessão não foi transportada. Inicie sessão novamente.",
    sw: "Kipindi chako hakikuendelea. Ingia tena.",
    ar: "لم تنتقل جلستك. سجّل الدخول مرة أخرى.",
    tw: "Wo session no antumi ankɔ so. San hyɛn mu bio.",
    zu: "Iseshini yakho ayidluliselwanga. Ngena futhi.",
  },
  fullNameRequired: {
    en: "Enter your full name as it appears in your passport.",
    ha: "Shigar da cikakken sunanka yadda yake a fasfo ɗinka.",
    yo: "Tẹ orúkọ rẹ ní kíkún gẹ́gẹ́ bí ó ṣe wà nínú ìwé ìrìnnà rẹ.",
    ig: "Tinye aha gị zuru ezu dịka ọ dị na paspọtụ gị.",
    fr: "Saisissez votre nom complet tel qu'il apparaît sur votre passeport.",
    pt: "Introduza o seu nome completo tal como consta no seu passaporte.",
    sw: "Ingiza jina lako kamili kama linavyoonekana kwenye pasipoti yako.",
    ar: "أدخل اسمك الكامل كما يظهر في جواز سفرك.",
    tw: "Kyerɛw wo din a edi mu nyinaa sɛnea ɛte wɔ wo pasport mu.",
    zu: "Faka igama lakho eliphelele njengoba livela ephasipotini yakho.",
  },
  noClerkEmail: {
    en: "Clerk returned no email address for that account.",
    ha: "Clerk bai dawo da adireshin imel don wannan asusun ba.",
    yo: "Clerk kò dá àdírẹ́sì ìmẹ́lì kan padà fún àkọọ́lẹ̀ náà.",
    ig: "Clerk enyeghị adreesị ozi-e maka akaụntụ ahụ.",
    fr: "Clerk n'a renvoyé aucune adresse e-mail pour ce compte.",
    pt: "O Clerk não devolveu nenhum endereço de e-mail para essa conta.",
    sw: "Clerk hakurudisha anwani ya barua pepe kwa akaunti hiyo.",
    ar: "لم يُرجع Clerk أي عنوان بريد إلكتروني لهذا الحساب.",
    tw: "Clerk amfa email address biara amma saa akaunt no.",
    zu: "I-Clerk ayibuyiselanga ikheli le-imeyili yaleyo akhawunti.",
  },
  invitationDead: {
    en: "That invitation is no longer valid. Ask for a new one.",
    ha: "Wannan gayyata ba ta da inganci kuma. Nemi sabuwa.",
    yo: "Ìpè náà kò tíì wúlò mọ́. Béèrè fún ọ̀kan tuntun.",
    ig: "Òkù ahụ adịghịzi irè. Rịọ maka nke ọhụrụ.",
    fr: "Cette invitation n'est plus valide. Demandez-en une nouvelle.",
    pt: "Esse convite já não é válido. Peça um novo.",
    sw: "Mwaliko huo hauna uhalali tena. Omba mpya.",
    ar: "لم تعد هذه الدعوة صالحة. اطلب دعوة جديدة.",
    tw: "Saa nsakraeɛ no nni mu bio. Bisa foforo.",
    zu: "Lesi simemo asisavumelekile. Cela esisha.",
  },
  invitationMismatch: {
    en: "That invitation was sent to a different email address.",
    ha: "An aika wannan gayyata zuwa wani adireshin imel dabam.",
    yo: "A fi ìpè náà ránṣẹ́ sí àdírẹ́sì ìmẹ́lì mìíràn.",
    ig: "E zigara òkù ahụ n'adreesị ozi-e ọzọ.",
    fr: "Cette invitation a été envoyée à une autre adresse e-mail.",
    pt: "Esse convite foi enviado para outro endereço de e-mail.",
    sw: "Mwaliko huo ulitumwa kwa anwani nyingine ya barua pepe.",
    ar: "أُرسلت هذه الدعوة إلى عنوان بريد إلكتروني مختلف.",
    tw: "Wɔde saa nsakraeɛ no kɔɔ email address foforo so.",
    zu: "Lesi simemo sithunyelwe kwelinye ikheli le-imeyili.",
  },
};
