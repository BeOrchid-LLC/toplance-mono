import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The user-facing refusals `completeProfile`, `checkInvitedEmail` and
 * `checkSignInEmail` return — the only copy in `(auth)/actions.ts`. Read
 * off the form's own `locale` field rather than the request: see the
 * note at that call site. The other action dictionaries use
 * `getActionLocale()`, which reads the `x-toplance-locale` header
 * `proxy.ts` sets.
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
  noAccount: L;
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
  /**
   * One sentence for one door.
   *
   * It used to be three, one per audience, which was affordable while
   * each audience had a door of its own to be refused at. There is one
   * sign-in now and it cannot know who is typing, so the copy has to be
   * true for all three — hence "invited or created by your organisation"
   * rather than a single route named as though it were the only one.
   *
   * The traveller half deliberately echoes `GO_PAGE.body`: that page is
   * where this person used to land, one spent code later. Saying the
   * same thing in both places is the point — the message did not change,
   * only the moment it arrives.
   */
  noAccount: {
    en: "There is no Toplance account for that address. Check it for a typo — travellers are invited by the organisation sponsoring them, and organisations create their own account.",
    ha: "Babu asusun Toplance don wannan adireshin. Duba shi don kuskuren rubutu — ana gayyatar matafiya ne daga ƙungiyar da ke ɗaukar nauyinsu, ƙungiyoyi kuma su kan ƙirƙiri nasu asusun.",
    yo: "Kò sí àkọọ́lẹ̀ Toplance fún àdírẹ́sì náà. Yẹ̀ ẹ́ wò fún àṣìṣe — àjọ tí ń ṣàrànṣe ni ó ń pe àwọn arìnrìn-àjò, àwọn àjọ sì ń dá àkọọ́lẹ̀ tiwọn sílẹ̀ fúnra wọn.",
    ig: "Enweghị akaụntụ Toplance maka adreesị ahụ. Lelee ya maka ndehie — ụlọ ọrụ na-akwado ha na-akpọ ndị njem òkù, ụlọ ọrụ na-emepụtakwa akaụntụ nke ha.",
    fr: "Aucun compte Toplance n'existe pour cette adresse. Vérifiez-la — les voyageurs sont invités par l'organisation qui les parraine, et les organisations créent elles-mêmes leur compte.",
    pt: "Não existe nenhuma conta Toplance para esse endereço. Verifique-o — os viajantes são convidados pela organização que os patrocina, e as organizações criam a sua própria conta.",
    sw: "Hakuna akaunti ya Toplance kwa anwani hiyo. Iangalie kama ina hitilafu — wasafiri hualikwa na shirika linalowafadhili, na mashirika hufungua akaunti zao wenyewe.",
    ar: "لا يوجد حساب Toplance لهذا العنوان. تحقق منه — المسافرون تدعوهم المؤسسة الراعية لهم، والمؤسسات تنشئ حسابها بنفسها.",
    tw: "Toplance akaunt biara nni hɔ a ɛfa saa address no ho. Hwɛ no yiye — akuo a ɛhwɛ akwantufoɔ so na ɛto wɔn nsa frɛ wɔn, na akuo no ankasa yɛ wɔn akaunt.",
    zu: "Ayikho i-akhawunti ye-Toplance yaleli khelo. Lihlole — abahambi bamenywa yinhlangano ebaxhasayo, kanti izinhlangano zizidalela ezazo ama-akhawunti.",
  },
};
