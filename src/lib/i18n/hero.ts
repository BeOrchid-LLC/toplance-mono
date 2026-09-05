import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The hero, both calls to action and the trust line run in all four
 * languages — these are the strings that decide whether someone starts.
 * Long-form marketing body copy further down the page stays English for
 * now; translating it is a content job, not a design one.
 */
export const HERO: {
  kicker: L;
  title: L;
  body: L;
  ctaPrimary: L;
  ctaShort: L;
  ctaSecondary: L;
  signIn: L;
  trust: L[];
  slots: { origin: L; destination: L; purpose: L };
} = {
  kicker: {
    en: "Visas and relocation, done properly",
    ha: "Biza da ƙaura, an yi shi yadda ya kamata",
    yo: "Fisa àti ìṣílọ, tí a ṣe dáadáa",
    ig: "Visa na mbugharị, e mere ya nke ọma",
    fr: "Visas et installation, faits correctement",
    pt: "Vistos e mudança, feitos como deve ser",
    sw: "Viza na uhamiaji, vimefanywa ipasavyo",
    ar: "التأشيرات والانتقال، بالشكل الصحيح",
  },
  title: {
    en: "Know exactly what your visa needs — before you spend a naira on it",
    ha: "San ainihin abin da bizarka ke buƙata — kafin ka kashe ko sisi",
    yo: "Mọ̀ ohun gangan tí fisa rẹ nílò — kí o tó ná owó kankan",
    ig: "Mara kpọmkwem ihe visa gị chọrọ — tupu i mefuo otu naira",
    fr: "Sachez exactement ce que votre visa exige — avant de dépenser le moindre franc",
    pt: "Saiba exatamente o que o seu visto exige — antes de gastar um cêntimo",
    sw: "Jua hasa kile viza yako inahitaji — kabla ya kutumia hata senti moja",
    ar: "اعرف بالضبط ما تتطلبه تأشيرتك — قبل أن تنفق درهماً واحداً",
  },
  body: {
    en: "Toplance asks a few short questions in your own language, turns your answers into the exact document checklist for your destination, checks every file as you upload it, and stays with you through the decision and your first week after landing.",
    ha: "Toplance yana yin ƴan gajerun tambayoyi da harshenka, ya juya amsoshinka zuwa cikakken jerin takardun da wurin da za ka je ke buƙata, yana duba kowace takarda yayin da kake ɗorawa, kuma yana tare da kai har zuwa yanke shawara da makon farko bayan ka sauka.",
    yo: "Toplance a bi ọ́ ní àwọn ìbéèrè kúkúrú díẹ̀ ní èdè tìrẹ, á sì sọ àwọn ìdáhùn rẹ di àkọsílẹ̀ ìwé pàtó tí ibi tí ò ń lọ nílò, á ṣàyẹ̀wò ìwé kọ̀ọ̀kan bí o ṣe ń gbé e sókè, á sì wà pẹ̀lú rẹ títí di ìpinnu àti ọ̀sẹ̀ àkọ́kọ́ rẹ lẹ́yìn tí o bá dé.",
    ig: "Toplance na-ajụ ajụjụ ole na ole dị mkpirikpi n'asụsụ gị, tụgharịa azịza gị ka ọ bụrụ ndepụta akwụkwọ kpọmkwem ebe ị na-aga chọrọ, nyochaa akwụkwọ ọ bụla ka ị na-ebugo ya, ma nọnyere gị ruo mgbe mkpebi ga-abịa na izu mbụ gị mgbe ị rutere.",
    fr: "Toplance vous pose quelques questions courtes dans votre propre langue, transforme vos réponses en la liste exacte des documents exigés par votre destination, vérifie chaque fichier au moment où vous le déposez, et reste avec vous jusqu'à la décision et pendant votre première semaine sur place.",
    pt: "A Toplance faz-lhe algumas perguntas curtas na sua própria língua, transforma as suas respostas na lista exata de documentos que o seu destino exige, verifica cada ficheiro à medida que o carrega, e fica consigo até à decisão e durante a sua primeira semana depois de chegar.",
    sw: "Toplance hukuuliza maswali machache mafupi kwa lugha yako mwenyewe, hugeuza majibu yako kuwa orodha kamili ya nyaraka zinazohitajika mahali unapokwenda, huikagua kila faili unapoipakia, na hubaki nawe hadi uamuzi utolewe na katika wiki yako ya kwanza baada ya kuwasili.",
    ar: "يطرح عليك Toplance بضعة أسئلة قصيرة بلغتك، ويحوّل إجاباتك إلى قائمة المستندات المطلوبة تحديداً لوجهتك، ويفحص كل ملف أثناء رفعك له، ويبقى معك حتى صدور القرار وطوال أسبوعك الأول بعد الوصول.",
  },
  ctaPrimary: {
    en: "See your checklist — free",
    ha: "Ga jerin takardunka — kyauta",
    yo: "Wo àkọsílẹ̀ rẹ — ọ̀fẹ́",
    ig: "Hụ ndepụta gị — n'efu",
    fr: "Voir votre liste — gratuit",
    pt: "Ver a sua lista — grátis",
    sw: "Ona orodha yako — bure",
    ar: "اطّلع على قائمتك — مجاناً",
  },
  ctaShort: {
    en: "Get started",
    ha: "Fara",
    yo: "Bẹ̀rẹ̀",
    ig: "Malite",
    fr: "Commencer",
    pt: "Começar",
    sw: "Anza",
    ar: "ابدأ الآن",
  },
  ctaSecondary: {
    en: "For organisations",
    ha: "Ga kamfanoni",
    yo: "Fún àwọn àjọ",
    ig: "Maka ụlọ ọrụ",
    fr: "Pour les organisations",
    pt: "Para organizações",
    sw: "Kwa mashirika",
    ar: "للمؤسسات",
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
  },
  trust: [
    {
      en: "No card needed to see your checklist",
      ha: "Ba a buƙatar kati don ganin jerin takardunka",
      yo: "Kò sí káàdì tó nílò láti wo àkọsílẹ̀ rẹ",
      ig: "Ọ dịghị kaadị achọrọ iji hụ ndepụta gị",
      fr: "Aucune carte bancaire pour voir votre liste",
      pt: "Não é preciso cartão para ver a sua lista",
      sw: "Hakuna kadi inayohitajika kuona orodha yako",
      ar: "لا حاجة لبطاقة لعرض قائمتك",
    },
    {
      en: "Documents encrypted at rest and in transit",
      ha: "An ɓoye takardu a ajiye da kuma yayin aikawa",
      yo: "A fi ààbò bo àwọn ìwé nígbà ìpamọ́ àti ìfiránṣẹ́",
      ig: "E zochiri akwụkwọ mgbe echekwara ma na-ezigara",
      fr: "Documents chiffrés au repos et en transit",
      pt: "Documentos cifrados em repouso e em trânsito",
      sw: "Nyaraka zimesimbwa zikiwa zimehifadhiwa na zikiwa safarini",
      ar: "المستندات مشفّرة أثناء التخزين وأثناء الإرسال",
    },
    /**
     * Named rather than counted, because "eight languages" is a claim
     * about us and a list is a claim about the reader: someone scanning
     * for their own language finds it here or knows immediately that it
     * is missing. Keep it in step with `LOCALES`.
     */
    {
      en: "English, Hausa, Yoruba, Igbo, French, Portuguese, Swahili and Arabic",
      ha: "Turanci, Hausa, Yoruba, Igbo, Faransanci, Fotigal, Suwahili da Larabci",
      yo: "Gẹ̀ẹ́sì, Hausa, Yorùbá, Ìgbò, Faransé, Pọ́tọ́gí, Swahili àti Lárúbáwá",
      ig: "Bekee, Hausa, Yoruba, Igbo, French, Portuguese, Swahili na Arabic",
      fr: "Anglais, haoussa, yoruba, igbo, français, portugais, swahili et arabe",
      pt: "Inglês, hauçá, ioruba, igbo, francês, português, suaíli e árabe",
      sw: "Kiingereza, Kihausa, Kiyoruba, Kiigbo, Kifaransa, Kireno, Kiswahili na Kiarabu",
      ar: "الإنجليزية والهوسا واليوروبا والإيغبو والفرنسية والبرتغالية والسواحيلية والعربية",
    },
  ],

  /**
   * The three slots of the hero corridor bar. Single words on purpose:
   * the resolved corridor itself is shown as `NGA → GBR · WORK`, which
   * needs no grammar and reads the same in every language, so nothing
   * here has to survive being interpolated into a sentence.
   *
   * NEEDS NATIVE REVIEW before launch — these are the only strings on
   * the page not taken from copy the client supplied.
   */
  slots: {
    origin: {
      en: "Passport",
      ha: "Fasfo",
      yo: "Ìwé ìrìnnà",
      ig: "Paspọtụ",
      fr: "Passeport",
      pt: "Passaporte",
      sw: "Pasipoti",
      ar: "جواز السفر",
    },
    destination: {
      en: "Destination",
      ha: "Wurin zuwa",
      yo: "Ibi tí ò ń lọ",
      ig: "Ebe ị na-aga",
      fr: "Destination",
      pt: "Destino",
      sw: "Unakoenda",
      ar: "الوجهة",
    },
    purpose: {
      en: "Purpose",
      ha: "Dalili",
      yo: "Ìdí",
      ig: "Nzube",
      fr: "Motif",
      pt: "Motivo",
      sw: "Sababu",
      ar: "الغرض",
    },
  },
};
