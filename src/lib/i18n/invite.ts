import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * Static copy on the invitation acceptance flow — `/invite/[token]` and
 * its one server action, `acceptInvitation`. Both are read with
 * `getLocale()`: the page is a Server Component, and the action reads
 * `x-toplance-locale` off the request the same way `completeProfile`
 * does (see `auth-actions.ts`).
 *
 * `{orgName}` and `{email}` are literal markers the call site splits or
 * replaces; neither is translated content — an organisation's name and a
 * traveller's own address are exactly the dynamic values this dictionary
 * pattern exists to keep out of a `Record<Locale, string>`.
 *
 * The invitation's destination and purpose (`countryFromIso2`,
 * `PURPOSE_ISO`) and `DEAD_END_MESSAGE`'s own titles
 * (`src/components/invite/dead-end.tsx`) are deliberately not covered
 * here — see the handoff notes for why.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house from the
 * English, like `HERO` before it.
 */
export const INVITE_PAGE: {
  title: L;
  tag: L;
  summaryHeadingTemplate: L;
  summaryNoticeTemplate: L;
  wrongAccountTitle: L;
  wrongAccountBodyWithEmailTemplate: L;
  wrongAccountBodyNoEmail: L;
  signOutUseAnotherAddress: L;
  sendNewOne: L;
  backToSite: L;
  notTravelerTitle: L;
  notTravelerBody: L;
  setUpAccount: L;
  signIn: L;
} = {
  title: {
    en: "Accept invitation",
    ha: "Karɓi gayyata",
    yo: "Gba ìpè",
    ig: "Nabata òkù",
    fr: "Accepter l'invitation",
    pt: "Aceitar convite",
    sw: "Kubali mwaliko",
    ar: "قبول الدعوة",
    tw: "Gye nsakraeɛ",
    zu: "Yamukela isimemo",
  },
  tag: {
    en: "Invitation",
    ha: "Gayyata",
    yo: "Ìpè",
    ig: "Òkù",
    fr: "Invitation",
    pt: "Convite",
    sw: "Mwaliko",
    ar: "الدعوة",
    tw: "Nsakraeɛ",
    zu: "Isimemo",
  },
  summaryHeadingTemplate: {
    en: "{orgName} is sponsoring your visa application",
    ha: "{orgName} ne ke ɗaukar nauyin buƙatar bizarka",
    yo: "{orgName} ni ó ń ṣàrànṣe ìbéèrè fisa rẹ",
    ig: "{orgName} na-akwado ngwa visa gị",
    fr: "{orgName} parraine votre demande de visa",
    pt: "A {orgName} está a patrocinar o seu pedido de visto",
    sw: "{orgName} inadhamini ombi lako la viza",
    ar: "تتولى {orgName} رعاية طلب تأشيرتك",
    tw: "{orgName} rehwɛ wo visa application so",
    zu: "I-{orgName} ixhasa isicelo sakho se-visa",
  },
  summaryNoticeTemplate: {
    en: "{orgName} sees your progress, not your documents. Passports, bank statements and police certificates stay between you and Toplance.",
    ha: "{orgName} tana ganin ci gabanka, ba takardunka ba. Fasfo, bayanan banki da takardar shaidar ɗan sanda suna tsakaninka da Toplance kaɗai.",
    yo: "{orgName} ń rí ìtẹ̀síwájú rẹ, kì í ṣe àwọn ìwé rẹ. Ìwé ìrìnnà, àkọsílẹ̀ báǹkì àti ìwé ẹ̀rí ọlọ́pàá wà láàrin ìwọ àti Toplance nìkan.",
    ig: "{orgName} na-ahụ ọganihu gị, ọ bụghị akwụkwọ gị. Paspọtụ, akwụkwọ ndekọ ụlọ akụ na asambodo ndị uwe ojii na-anọ naanị n'etiti gị na Toplance.",
    fr: "{orgName} voit votre avancement, pas vos documents. Passeports, relevés bancaires et certificats de police restent entre vous et Toplance.",
    pt: "A {orgName} vê o seu progresso, não os seus documentos. Passaportes, extratos bancários e certificados de registo criminal ficam apenas entre si e a Toplance.",
    sw: "{orgName} inaona maendeleo yako, si nyaraka zako. Pasipoti, taarifa za benki na vyeti vya polisi hubaki kati yako na Toplance pekee.",
    ar: "تطّلع {orgName} على تقدّمك، لا على مستنداتك. تبقى جوازات السفر وكشوف الحسابات البنكية وشهادات حسن السير والسلوك بينك وبين Toplance فقط.",
    tw: "{orgName} hu wo nkɔso, ɛnyɛ wo nkrataa. Pasport, sikakorabea nsɛm ne polisifoɔ krataa gyina wo ne Toplance ntam nkutoo.",
    zu: "I-{orgName} ibona inqubekelaphambili yakho, hhayi amadokhumenti akho. Amaphasipoti, izitatimende zasebhange nezitifiketi zamaphoyisa kuhlala phakathi kwakho ne-Toplance kuphela.",
  },
  wrongAccountTitle: {
    en: "This invitation is for a different account",
    ha: "Wannan gayyata ta wani asusu ne dabam",
    yo: "Ìpè yìí jẹ́ ti àkọọ́lẹ̀ mìíràn",
    ig: "Òkù a bụ nke akaụntụ ọzọ",
    fr: "Cette invitation est destinée à un autre compte",
    pt: "Este convite é para outra conta",
    sw: "Mwaliko huu ni wa akaunti nyingine",
    ar: "هذه الدعوة موجهة لحساب مختلف",
    tw: "Saa nsakraeɛ yi yɛ akaunt foforo dea",
    zu: "Lesi simemo sesinye i-akhawunti",
  },
  wrongAccountBodyWithEmailTemplate: {
    en: "You are signed in as {email}, and this invitation was sent to another address. Sign out and open the link again with the address the organisation invited.",
    ha: "Kana ciki a matsayin {email}, kuma an aika wannan gayyata zuwa wani adireshin dabam. Fita ka sake buɗe hanyar haɗin da adireshin da ƙungiyar ta gayyata.",
    yo: "O wọlé gẹ́gẹ́ bí {email}, a sì fi ìpè yìí ránṣẹ́ sí àdírẹ́sì mìíràn. Jáde kí o sì tún ṣí ìjápọ̀ náà pẹ̀lú àdírẹ́sì tí àjọ pè.",
    ig: "Ị banyere dịka {email}, e zigakwara òkù a n'adreesị ọzọ. Pụọ ma meghee njikọ ahụ ọzọ site na adreesị ụlọ ọrụ kpọrọ.",
    fr: "Vous êtes connecté en tant que {email}, et cette invitation a été envoyée à une autre adresse. Déconnectez-vous et rouvrez le lien avec l'adresse que l'organisation a invitée.",
    pt: "Tem sessão iniciada como {email}, e este convite foi enviado para outro endereço. Termine sessão e abra novamente a ligação com o endereço que a organização convidou.",
    sw: "Umeingia kama {email}, na mwaliko huu ulitumwa kwa anwani nyingine. Toka na ufungue tena kiungo kwa anwani ambayo shirika liliialika.",
    ar: "لقد سجلت الدخول باسم {email}، وقد أُرسلت هذه الدعوة إلى عنوان آخر. سجّل الخروج وافتح الرابط مجدداً بالعنوان الذي دعته المؤسسة.",
    tw: "Woahyɛn mu sɛ {email}, na wɔde saa nsakraeɛ yi kɔɔ address foforo so. Fi adi na san bue link no bio wɔ address a kuo no to no nsa frɛeɛ no so.",
    zu: "Ungene njenge-{email}, futhi lesi simemo sithunyelwe kwelinye ikheli. Phuma bese uvula isixhumanisi futhi ngekheli inhlangano ebeyimemile.",
  },
  wrongAccountBodyNoEmail: {
    en: "You are signed in with an account this invitation was not sent to. Sign out and open the link again with the address the organisation invited.",
    ha: "Kana ciki da asusun da ba a aika wannan gayyata zuwa gare shi ba. Fita ka sake buɗe hanyar haɗin da adireshin da ƙungiyar ta gayyata.",
    yo: "O wọlé pẹ̀lú àkọọ́lẹ̀ tí a kò fi ìpè yìí ránṣẹ́ sí. Jáde kí o sì tún ṣí ìjápọ̀ náà pẹ̀lú àdírẹ́sì tí àjọ pè.",
    ig: "Ị banyere na akaụntụ a na-ezighị òkù a. Pụọ ma meghee njikọ ahụ ọzọ site na adreesị ụlọ ọrụ kpọrọ.",
    fr: "Vous êtes connecté avec un compte auquel cette invitation n'a pas été envoyée. Déconnectez-vous et rouvrez le lien avec l'adresse que l'organisation a invitée.",
    pt: "Tem sessão iniciada com uma conta para a qual este convite não foi enviado. Termine sessão e abra novamente a ligação com o endereço que a organização convidou.",
    sw: "Umeingia na akaunti ambayo mwaliko huu haukutumwa kwake. Toka na ufungue tena kiungo kwa anwani ambayo shirika liliialika.",
    ar: "لقد سجلت الدخول بحساب لم تُرسل إليه هذه الدعوة. سجّل الخروج وافتح الرابط مجدداً بالعنوان الذي دعته المؤسسة.",
    tw: "Woahyɛn mu wɔ akaunt a wɔansoma saa nsakraeɛ yi ankɔ so so. Fi adi na san bue link no bio wɔ address a kuo no to no nsa frɛeɛ no so.",
    zu: "Ungene ne-akhawunti lesi simemo esingathunyelwanga kuyo. Phuma bese uvula isixhumanisi futhi ngekheli inhlangano ebeyimemile.",
  },
  signOutUseAnotherAddress: {
    en: "Sign out and use another address",
    ha: "Fita ka yi amfani da wani adireshi",
    yo: "Jáde kí o sì lo àdírẹ́sì mìíràn",
    ig: "Pụọ ma jiri adreesị ọzọ",
    fr: "Se déconnecter et utiliser une autre adresse",
    pt: "Terminar sessão e utilizar outro endereço",
    sw: "Toka na utumie anwani nyingine",
    ar: "سجّل الخروج واستخدم عنواناً آخر",
    tw: "Fi adi na fa address foforo di dwuma",
    zu: "Phuma bese usebenzisa elinye ikheli",
  },
  sendNewOne: {
    en: "Ask whoever invited you to send a new one — nothing about your account has changed.",
    ha: "Ka tambayi wanda ya gayyace ka ya aika sabon ɗaya — babu abin da ya canja game da asusunka.",
    yo: "Béèrè lọ́wọ́ ẹni tí ó pè ọ́ láti fi ọ̀kan tuntun ránṣẹ́ — kò sí ohunkóhun tí ó yí padà nípa àkọọ́lẹ̀ rẹ.",
    ig: "Jụọ onye kpọrọ gị ka o zigara gị nke ọhụrụ — ọ dịghị ihe gbanwere gbasara akaụntụ gị.",
    fr: "Demandez à la personne qui vous a invité de vous en envoyer un nouveau — rien n'a changé concernant votre compte.",
    pt: "Peça a quem o convidou que envie um novo — nada mudou na sua conta.",
    sw: "Muulize aliyekualika akutumie mpya — hakuna kilichobadilika kuhusu akaunti yako.",
    ar: "اطلب ممن دعاك أن يرسل لك رابطاً جديداً — لم يتغيّر شيء بشأن حسابك.",
    tw: "Bisa obi a ɔto wo nsa frɛɛ wo no ma ɔnsoma foforo — biribiara nsesaee wɔ wo akaunt ho.",
    zu: "Cela lowo owakumemayo akuthumelele esisha — akukho okushintshile mayelana ne-akhawunti yakho.",
  },
  backToSite: {
    en: "Back to toplance.ca",
    ha: "Koma zuwa toplance.ca",
    yo: "Padà sí toplance.ca",
    ig: "Laghachi na toplance.ca",
    fr: "Retour à toplance.ca",
    pt: "Voltar a toplance.ca",
    sw: "Rudi toplance.ca",
    ar: "العودة إلى toplance.ca",
    tw: "San kɔ toplance.ca",
    zu: "Buyela ku-toplance.ca",
  },
  notTravelerTitle: {
    en: "This invitation is for a traveler account",
    ha: "Wannan gayyata ta asusun matafiyi ne",
    yo: "Ìpè yìí jẹ́ ti àkọọ́lẹ̀ arìnrìn-àjò",
    ig: "Òkù a bụ nke akaụntụ onye njem",
    fr: "Cette invitation est destinée à un compte voyageur",
    pt: "Este convite é para uma conta de viajante",
    sw: "Mwaliko huu ni wa akaunti ya msafiri",
    ar: "هذه الدعوة مخصصة لحساب مسافر",
    tw: "Saa nsakraeɛ yi yɛ ɔkwantuni akaunt dea",
    zu: "Lesi simemo sesakhawunti yomhambi",
  },
  notTravelerBody: {
    en: "You are signed in with an organisation or staff account, which cannot accept a sponsorship invitation. Open the link in a browser signed in as the traveler it was sent to, or sign out first.",
    ha: "Kana ciki da asusun ƙungiya ko na ma'aikaci, wanda ba zai iya karɓar gayyatar ɗaukar nauyi ba. Buɗe hanyar haɗin a mai bincike da aka shiga a matsayin matafiyin da aka aika masa, ko ka fita da farko.",
    yo: "O wọlé pẹ̀lú àkọọ́lẹ̀ àjọ tàbí ti òṣìṣẹ́, èyí tí kò lè gba ìpè ìṣàrànṣe. Ṣí ìjápọ̀ náà ní ẹ̀rọ awakọ̀ tí a ti wọlé gẹ́gẹ́ bí arìnrìn-àjò tí a fi ránṣẹ́ sí, tàbí kí o kọ́kọ́ jáde.",
    ig: "Ị banyere na akaụntụ ụlọ ọrụ ma ọ bụ nke ndị ọrụ, nke na-enweghị ike ịnabata òkù nkwado. Meghee njikọ ahụ na ihe nchọgharị ntanetị e si na ya banye dịka onye njem e zigaara ya, ma ọ bụ pụọ mbụ.",
    fr: "Vous êtes connecté avec un compte organisation ou personnel, qui ne peut pas accepter une invitation de parrainage. Ouvrez le lien dans un navigateur connecté en tant que voyageur destinataire, ou déconnectez-vous d'abord.",
    pt: "Tem sessão iniciada com uma conta de organização ou de equipa, que não pode aceitar um convite de patrocínio. Abra a ligação num navegador com sessão iniciada como o viajante a quem foi enviado, ou termine sessão primeiro.",
    sw: "Umeingia na akaunti ya shirika au ya wafanyakazi, ambayo haiwezi kukubali mwaliko wa udhamini. Fungua kiungo katika kivinjari ulichoingia kama msafiri aliyetumiwa, au toka kwanza.",
    ar: "لقد سجلت الدخول بحساب مؤسسة أو موظف، ولا يمكن لهذا الحساب قبول دعوة الرعاية. افتح الرابط في متصفح مسجَّل الدخول بصفتك المسافر الذي أُرسلت إليه، أو سجّل الخروج أولاً.",
    tw: "Woahyɛn mu wɔ kuo anaa adwumayɛfoɔ akaunt mu, a entumi nnye sponsorship nsakraeɛ. Bue link no wɔ browser a woahyɛn mu sɛ ɔkwantuni a wɔsomaa no no, anaa fi adi kan.",
    zu: "Ungene ne-akhawunti yenhlangano noma yabasebenzi, engeke isamukele isimemo sokuxhaswa. Vula isixhumanisi kusiphequluli ongene ngaso njengomhambi obekuthunyelwe kuye, noma uphume kuqala.",
  },
  setUpAccount: {
    en: "Set up your account",
    ha: "Kafa asusunka",
    yo: "Ṣètò àkọọ́lẹ̀ rẹ",
    ig: "Hazie akaụntụ gị",
    fr: "Configurez votre compte",
    pt: "Configure a sua conta",
    sw: "Weka akaunti yako",
    ar: "أعدّ حسابك",
    tw: "Hyehyɛ wo akaunt",
    zu: "Setha i-akhawunti yakho",
  },
  signIn: {
    en: "Sign in",
    ha: "Shiga",
    yo: "Wọlé",
    ig: "Banye",
    fr: "Se connecter",
    pt: "Entrar",
    sw: "Ingia",
    ar: "تسجيل الدخول",
    tw: "Hyɛn mu",
    zu: "Ngena",
  },
};

/** `acceptInvitation`'s one user-facing refusal, read with `getLocale()`. */
export const INVITE_ACTIONS: { travelerOnly: L } = {
  travelerOnly: {
    en: "Only a traveler account can accept an invitation.",
    ha: "Asusun matafiyi kaɗai zai iya karɓar gayyata.",
    yo: "Àkọọ́lẹ̀ arìnrìn-àjò nìkan ni ó lè gba ìpè.",
    ig: "Naanị akaụntụ onye njem nwere ike ịnabata òkù.",
    fr: "Seul un compte voyageur peut accepter une invitation.",
    pt: "Apenas uma conta de viajante pode aceitar um convite.",
    sw: "Akaunti ya msafiri pekee ndiyo inayoweza kukubali mwaliko.",
    ar: "لا يمكن إلا لحساب المسافر قبول الدعوة.",
    tw: "Ɔkwantuni akaunt nkutoo na ɛtumi gye nsakraeɛ.",
    zu: "I-akhawunti yomhambi kuphela engavuma isimemo.",
  },
};
