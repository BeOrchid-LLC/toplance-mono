import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The agency landing page's hero and intro strip (`src/app/(site)/page.tsx`).
 * Unlike `/travelers`, this page addresses agency owners in English in the
 * client's copy doc, but the platform's locale switcher still reaches this
 * page, so its copy is translated like every other static string here.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house, the same way
 * as the rest of `src/lib/i18n/*`.
 */
export const LANDING_HERO: {
  tag: L;
  title: L;
  lead: L;
  ctaPrimary: L;
  ctaSecondary: L;
  corridorCta: L;
  introTitle: L;
  introBody: L;
  introChecklist: L[];
} = {
  tag: {
    en: "For visa and relocation agencies",
    ha: "Ga hukumomin biza da ƙaura",
    yo: "Fún àwọn àjọ fisa àti ìṣílọ",
    ig: "Maka ụlọ ọrụ visa na mbugharị",
    fr: "Pour les agences de visas et de relocalisation",
    pt: "Para agências de vistos e mudança",
    sw: "Kwa mashirika ya viza na uhamiaji",
    ar: "لوكالات التأشيرات والانتقال",
    tw: "Ma visa ne atutena adwumakuo",
    zu: "Ezinhlanganweni zamavisa nokufuduka",
  },
  title: {
    en: "Handle more travelers, with far less chasing.",
    ha: "Kula da matafiya da yawa, tare da ƙarancin bibiya.",
    yo: "Tọ́jú àwọn arìnrìn-àjò púpọ̀ sí i, pẹ̀lú lílépa tí ó dínkù gan-an.",
    ig: "Lekọta ndị njem karịa, na ịchụso dị ntakịrị.",
    fr: "Gérez plus de voyageurs, avec beaucoup moins de relances.",
    pt: "Trate de mais viajantes, com muito menos perseguição.",
    sw: "Shughulikia wasafiri wengi zaidi, ukiwa na ufuatiliaji mdogo sana.",
    ar: "تعامل مع مزيد من المسافرين، مع أقل قدر بكثير من الملاحقة.",
    tw: "Hwɛ akwantufoɔ pii, na ntaataa nkakra pa ara.",
    zu: "Phatha abahambi abaningi, ngokulandelela okuncane kakhulu.",
  },
  lead: {
    en: "The paperwork is the part that eats your team's time and puts your cases at risk. We take it off your hands — so the right documents come in, problems get caught early, and your team gets to the visa work sooner.",
    ha: "Aikin takardu shine ɓangaren da ke cin lokacin ƙungiyarka kuma yake sanya al'amuranka cikin haɗari. Muna ɗauke maka wannan nauyi — don haka takardun da suka dace su shigo, ana kama matsalolin da wuri, kuma ƙungiyarka ta kai ga aikin biza da sauri.",
    yo: "Iṣẹ́ ìwé ni apá tí ń jẹ àkókò ẹgbẹ́ rẹ tí ó sì ń fi àwọn ọ̀rọ̀ rẹ sínú ewu. A ó gbà á lọ́wọ́ rẹ — kí àwọn ìwé tí ó tọ́ lè dé, kí a mú àwọn ìṣòro ní kùtùkùtù, kí ẹgbẹ́ rẹ sì lè dé iṣẹ́ fisa yára ju.",
    ig: "Ọrụ akwụkwọ bụ akụkụ na-eri oge otu gị ma tinye okwu gị n'ihe egwu. Anyị na-ewepụ ya n'aka gị — ka akwụkwọ ndị ziri ezi bata, ka a chọpụta nsogbu ngwa ngwa, ka otu gị wee rute n'ọrụ visa ngwa ngwa.",
    fr: "La paperasse est la partie qui consomme le temps de votre équipe et met vos dossiers en danger. Nous vous en débarrassons — pour que les bons documents arrivent, que les problèmes soient repérés tôt, et que votre équipe accède plus vite au travail sur le visa.",
    pt: "A papelada é a parte que consome o tempo da sua equipa e coloca os seus processos em risco. Nós tiramos-lhe isso das mãos — para que os documentos certos cheguem, os problemas sejam detetados cedo e a sua equipa chegue mais depressa ao trabalho do visto.",
    sw: "Karatasi ndiyo sehemu inayotumia muda wa timu yako na kuweka kesi zako hatarini. Tunaiondoa mikononi mwako — ili hati sahihi ziingie, matatizo yagundulike mapema, na timu yako ifikie kazi ya viza haraka zaidi.",
    ar: "الأوراق هي الجزء الذي يستهلك وقت فريقك ويعرّض حالاتك للخطر. نحن نتولى ذلك عنك — لتصل المستندات الصحيحة، وتُكتشف المشكلات مبكرًا، ويصل فريقك إلى عمل التأشيرة بشكل أسرع.",
    tw: "Nkrataa ho adwuma no ne ade a ɛsɛe wo kuo berɛ na ɛde wo nsɛm hyɛ asiane mu. Yɛyi fi wo nsam — sɛdeɛ krataa a ɛfata bɛba, wɔbɛhunu ɔhaw ntɛm, na wo kuo ntumi nkɔ visa adwuma no so ntɛm.",
    zu: "Amaphepha yingxenye edla isikhathi sethimba lakho futhi ibeke amacala akho engozini. Sikususa esandleni sakho — ukuze amadokhumenti afanele afike, izinkinga zibanjwe kusenesikhathi, futhi ithimba lakho lifinyelele emsebenzini wevisa ngokushesha.",
  },
  ctaPrimary: {
    en: "Get Started",
    ha: "Fara",
    yo: "Bẹ̀rẹ̀",
    ig: "Malite",
    fr: "Commencer",
    pt: "Começar",
    sw: "Anza",
    ar: "ابدأ الآن",
    tw: "Fi ase",
    zu: "Qala",
  },
  ctaSecondary: {
    en: "Book a demo",
    ha: "Yi rijistar nunawa",
    yo: "Ṣe ìṣètò àpèjúwe",
    ig: "Debanye maka ngosi",
    fr: "Réserver une démo",
    pt: "Marcar uma demonstração",
    sw: "Panga onyesho",
    ar: "احجز عرضًا توضيحيًا",
    tw: "Hyɛ nhwɛso da",
    zu: "Bhukha ukuboniswa",
  },
  corridorCta: {
    en: "See what this trip needs",
    ha: "Duba abin da wannan tafiya take buƙata",
    yo: "Wo ohun tí ìrìn-àjò yìí nílò",
    ig: "Lee ihe njem a chọrọ",
    fr: "Voir ce que ce voyage exige",
    pt: "Ver o que esta viagem exige",
    sw: "Ona kile safari hii inahitaji",
    ar: "اطّلع على متطلبات هذه الرحلة",
    tw: "Hwɛ deɛ saa akwantuo yi hia",
    zu: "Bona lokho olu hambo oludingayo",
  },
  introTitle: {
    en: "You do the visas. We take care of everything before them.",
    ha: "Kai kake yin bizoji. Mu ne muke kula da duk abin da ke zuwa kafin su.",
    yo: "Ìwọ ni ó ń ṣe fisa. Àwa ni a ń rí sí ohun gbogbo kí ó tó dé ibẹ̀.",
    ig: "Ị na-eme visa. Anyị na-elekọta ihe niile tupu ha.",
    fr: "Vous vous occupez des visas. Nous nous occupons de tout ce qui les précède.",
    pt: "Você trata dos vistos. Nós tratamos de tudo antes deles.",
    sw: "Wewe unashughulikia viza. Sisi tunashughulikia kila kitu kabla yake.",
    ar: "أنت تتولى التأشيرات. نحن نتولى كل شيء قبلها.",
    tw: "Wo na woyɛ visa. Yɛn na yɛhwɛ biribiara so ansa na wɔreyɛ no.",
    zu: "Wena wenza amavisa. Thina sinakekela konke ngaphambi kwawo.",
  },
  introBody: {
    en: "For every traveler you take on, we make sure they know exactly what to send, and that what they send is right — before it ever reaches your team. You always know where each traveler stands, and your staff only pick up files that are ready to work. No more chasing documents, no more nasty surprises weeks down the line.",
    ha: "Ga kowane matafiyi da ka karɓa, muna tabbatar da cewa ya san ainihin abin da zai aika, kuma abin da ya aika daidai ne — kafin ya isa ƙungiyarka. Kullum kana sane da inda kowane matafiyi yake, kuma ma'aikatanka suna karɓar fayilolin da suka shirya kawai. Babu ƙarin bibiyar takardu, babu ƙarin abin mamaki mai muni bayan makonni.",
    yo: "Fún gbogbo arìnrìn-àjò tí o bá gbà, a máa rí i dájú pé ó mọ ohun gangan tí yóò fi ránṣẹ́, àti pé ohun tí ó fi ránṣẹ́ tọ́ — kí ó tó dé ọwọ́ ẹgbẹ́ rẹ. Ìwọ yóò mọ ibi tí arìnrìn-àjò kọ̀ọ̀kan wà nígbà gbogbo, àwọn òṣìṣẹ́ rẹ yóò sì máa gba àwọn fáìlì tí ó ti ṣetán láti ṣiṣẹ́ lórí nìkan. Kò sí lílépa ìwé mọ́, kò sí ìyàlẹ́nu búburú mọ́ ní ọ̀sẹ̀ mélòó kan lẹ́yìn.",
    ig: "Maka onye njem ọ bụla ị na-anara, anyị na-eme ka ọ mata kpọmkwem ihe ọ ga-eziga, na na ihe o ziri ziri ezi — tupu o eruo aka otu gị. Ị na-amata mgbe niile ebe onye njem ọ bụla nọ, ndị ọrụ gị na-anarakwa naanị faịlụ ndị dịla njikere iji rụọ ọrụ. Enweghịzi ịchụso akwụkwọ ọzọ, enweghịzi ihe ijuanya ọjọọ n'izu ole na ole ka e mesịrị.",
    fr: "Pour chaque voyageur que vous prenez en charge, nous veillons à ce qu'il sache exactement ce qu'il doit envoyer, et que ce qu'il envoie soit correct — avant même que cela n'atteigne votre équipe. Vous savez toujours où en est chaque voyageur, et votre personnel ne récupère que des dossiers prêts à être traités. Fini de courir après les documents, fini les mauvaises surprises des semaines plus tard.",
    pt: "Para cada viajante que aceita, garantimos que ele sabe exatamente o que enviar, e que o que envia está correto — antes de sequer chegar à sua equipa. Sabe sempre em que ponto está cada viajante, e a sua equipa só recebe processos prontos a trabalhar. Acabou a perseguição a documentos, acabaram as surpresas desagradáveis semanas depois.",
    sw: "Kwa kila msafiri unayemchukua, tunahakikisha anajua hasa cha kutuma, na kwamba anachotuma ni sahihi — kabla hata hajafika kwa timu yako. Daima unajua kila msafiri amefikia wapi, na wafanyakazi wako wanapokea tu faili zilizo tayari kufanyiwa kazi. Hakuna tena kufuatilia hati, hakuna tena mshangao mbaya wiki kadhaa baadaye.",
    ar: "لكل مسافر تتولى أمره، نتأكد من أنه يعرف بالضبط ما يجب إرساله، وأن ما يرسله صحيح — قبل أن يصل إلى فريقك أصلاً. أنت تعرف دائمًا أين وصل كل مسافر، ولا يستلم موظفوك سوى الملفات الجاهزة للعمل عليها. لا مزيد من ملاحقة المستندات، ولا مزيد من المفاجآت السيئة بعد أسابيع.",
    tw: "Ɔkwantuni biara a wugye no, yɛhwɛ hu sɛ onim deɛ ɛsɛ sɛ ɔde ba pɔtee, na deɛ ɔde ba no yɛ deɛ ɛfata — ansa na aduru wo kuo nsam koraa. Wonim berɛ nyinaa baabi a ɔkwantuni biara aduru, na wo adwumayɛfoɔ gye krataasin a ɛyɛ krado ama adwumayɛ nkutoo. Ntaataa nkrataa akyi biara nni hɔ bio, nsuiyɛ bɔne biara wɔ nnaawɔtwe akyi nso nni hɔ bio.",
    zu: "Kubahambi ngabanye obathathayo, siqinisekisa ukuthi bayazi ngokuqondile ukuthi yini okumele bayithumele, nokuthi lokho abakuthumelayo kulungile — ngaphambi kokuba kufike ethimbeni lakho ngqo. Uhlala wazi lapho umhambi ngamunye esekufikile khona, futhi abasebenzi bakho bathola kuphela amafayela asezokwenziwa umsebenzi kuwo. Akusekho ukulandelela amadokhumenti, akusekho izimanga ezimbi emasontweni ngemva kwalokho.",
  },
  introChecklist: [
    {
      en: "Every traveler knows exactly what to bring",
      ha: "Kowane matafiyi ya san ainihin abin da zai kawo",
      yo: "Arìnrìn-àjò kọ̀ọ̀kan mọ ohun gangan tí ó yẹ kí ó mú wá",
      ig: "Onye njem ọ bụla maara kpọmkwem ihe ọ ga-eweta",
      fr: "Chaque voyageur sait exactement quoi apporter",
      pt: "Cada viajante sabe exatamente o que trazer",
      sw: "Kila msafiri anajua hasa cha kuleta",
      ar: "يعرف كل مسافر بالضبط ما يجب إحضاره",
      tw: "Ɔkwantuni biara nim deɛ ɛsɛ sɛ ɔde ba pɔtee",
      zu: "Wonke umhambi uyazi ngokuqondile ukuthi yini okumele aliyilethe",
    },
    {
      en: "The wrong or unusable documents get caught early",
      ha: "Ana kama takardun da ba daidai ba ko marasa amfani da wuri",
      yo: "Àwọn ìwé tí kò tọ́ tàbí tí kò wúlò ni a ń mú ní kùtùkùtù",
      ig: "A na-achọpụta akwụkwọ ndị na-ezighị ezi ma ọ bụ ndị na-adịghị eyi ngwa ngwa",
      fr: "Les documents incorrects ou inutilisables sont repérés tôt",
      pt: "Os documentos errados ou inutilizáveis são detetados cedo",
      sw: "Hati zisizo sahihi au zisizoweza kutumika hugunduliwa mapema",
      ar: "يتم اكتشاف المستندات الخاطئة أو غير الصالحة مبكرًا",
      tw: "Wɔhunu krataa a ɛnyɛ deɛ ɛfata anaa deɛ wontumi mfa nni dwuma ntɛm",
      zu: "Amadokhumenti angalungile noma angasetshenziswa ayabanjwa kusenesikhathi",
    },
    {
      en: "You see where every traveler stands, in one place",
      ha: "Kana ganin inda kowane matafiyi yake, a wuri ɗaya",
      yo: "Ìwọ ń rí ibi tí arìnrìn-àjò kọ̀ọ̀kan wà, ní ibì kan ṣoṣo",
      ig: "Ị na-ahụ ebe onye njem ọ bụla guzo, n'otu ebe",
      fr: "Vous voyez où en est chaque voyageur, en un seul endroit",
      pt: "Vê onde está cada viajante, num só lugar",
      sw: "Unaona alipofika kila msafiri, mahali pamoja",
      ar: "ترى أين وصل كل مسافر، في مكان واحد",
      tw: "Wohu baabi a ɔkwantuni biara aduru, wɔ baabi biako",
      zu: "Ubona lapho umhambi ngamunye esekufikile khona, endaweni eyodwa",
    },
  ],
};
