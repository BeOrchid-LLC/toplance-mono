import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/ops/corridors/[id]/page.tsx` and the two client components it
 * renders, `corridor-decision.tsx` and `requirement-condition.tsx` —
 * kept in one file because all three describe one screen's worth of
 * copy: reading a draft, comparing it with what is live, and deciding.
 *
 * `corridor-diff.ts`'s own field labels ("Government fee", "Visa name",
 * "Required" / "Only if it applies" as a diff value, and so on) are
 * generated in `@/lib/domain/corridor-diff.ts`, outside this pass's
 * ownership, and are left in English — see the review's flags.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_CORRIDOR_REVIEW: {
  metaTitle: L;
  backLink: L;
  approvedByPrefix: L;
  sentBackBecause: L;
  routeFactsPanel: L;
  fields: { governmentFee: L; decisionTime: L; lastChecked: L };
  notYet: L;
  weeksSuffix: L;
  changesSincePrefix: L;
  changesWord: L;
  noDiff: L;
  notSet: L;
  newDocument: L;
  noLongerAskedFor: L;
  reworded: L;
  removedNotice: L;
  everyRequirementPanel: L;
  noRequirements: L;
  onlyIfApplies: L;
  openTheSource: L;
  yourDecisionPanel: L;
} = {
  metaTitle: {
    en: "Review route",
    ha: "Nazarin hanya",
    yo: "Àyẹ̀wò ipa ọ̀nà",
    ig: "Nyocha ụzọ",
    fr: "Examiner l'itinéraire",
    pt: "Rever rota",
    sw: "Kagua njia",
    ar: "مراجعة المسار",
    tw: "Hwɛ ɛkwan no mu",
    zu: "Buyekeza indlela",
  },
  backLink: {
    en: "Route coverage",
    ha: "Rufin hanyoyi",
    yo: "Àdéhùn ipa ọ̀nà",
    ig: "Mkpuchi ụzọ",
    fr: "Couverture des itinéraires",
    pt: "Cobertura de rotas",
    sw: "Ufuniko wa njia",
    ar: "تغطية المسارات",
    tw: "Akwan a wɔakata so",
    zu: "Ukumbozwa kwezindlela",
  },
  /** Followed by the approver's name: "Approved by {name}". */
  approvedByPrefix: {
    en: "by",
    ha: "daga",
    yo: "láti ọ̀dọ̀",
    ig: "site na",
    fr: "par",
    pt: "por",
    sw: "na",
    ar: "بواسطة",
    tw: "ɛfiri",
    zu: "ngu-",
  },
  sentBackBecause: {
    en: "Sent back because",
    ha: "An mayar da shi domin",
    yo: "A dá a padà nítorí pé",
    ig: "Ezighachi ya n'ihi",
    fr: "Renvoyé pour la raison suivante",
    pt: "Devolvido porque",
    sw: "Imerudishwa kwa sababu",
    ar: "أُعيد للسبب التالي",
    tw: "Wɔsan de kɔeɛ ɛfiri sɛ",
    zu: "Kubuyisiwe ngoba",
  },
  routeFactsPanel: {
    en: "Route facts",
    ha: "Bayanan hanya",
    yo: "Àwọn ìmọ̀ ipa ọ̀nà",
    ig: "Eziokwu banyere ụzọ",
    fr: "Informations sur l'itinéraire",
    pt: "Dados da rota",
    sw: "Ukweli wa njia",
    ar: "حقائق المسار",
    tw: "Ɛkwan no ho nokwasɛm",
    zu: "Amaqiniso endlela",
  },
  fields: {
    governmentFee: {
      en: "Government fee",
      ha: "Kuɗin gwamnati",
      yo: "Owó ìjọba",
      ig: "Ụgwọ gọọmentị",
      fr: "Frais gouvernementaux",
      pt: "Taxa governamental",
      sw: "Ada ya serikali",
      ar: "الرسوم الحكومية",
      tw: "Aban ka",
      zu: "Imali okhokhwa kuhulumeni",
    },
    decisionTime: {
      en: "Decision time",
      ha: "Lokacin yanke shawara",
      yo: "Àkókò ìpinnu",
      ig: "Oge mkpebi",
      fr: "Délai de décision",
      pt: "Tempo de decisão",
      sw: "Muda wa uamuzi",
      ar: "مدة اتخاذ القرار",
      tw: "Gyinaeɛ berɛ",
      zu: "Isikhathi sesinqumo",
    },
    lastChecked: {
      en: "Last checked",
      ha: "Bincike na ƙarshe",
      yo: "Àyẹ̀wò tí ó kẹ́yìn",
      ig: "Nlele ikpeazụ",
      fr: "Dernière vérification",
      pt: "Última verificação",
      sw: "Ukaguzi wa mwisho",
      ar: "آخر فحص",
      tw: "Nhwehwɛmu a etwa toɔ",
      zu: "Ukuhlolwa kokugcina",
    },
  },
  notYet: {
    en: "Not yet",
    ha: "Ba tukuna",
    yo: "Kò tí ì tíì",
    ig: "Ma  ọ  bụghị  ugbu a",
    fr: "Pas encore",
    pt: "Ainda não",
    sw: "Bado",
    ar: "ليس بعد",
    tw: "Ɛnnye",
    zu: "Akukafiki",
  },
  /** `{min}` and `{max}` are already rendered before this — the suffix reads "3–6 weeks". */
  weeksSuffix: {
    en: "weeks",
    ha: "makwanni",
    yo: "ọ̀sẹ̀",
    ig: "izu",
    fr: "semaines",
    pt: "semanas",
    sw: "wiki",
    ar: "أسابيع",
    tw: "nnawɔtwe",
    zu: "amasonto",
  },
  /** `{version}` is the live version number: "Changes since v{version}". */
  changesSincePrefix: {
    en: "Changes since v{version}",
    ha: "Canje-canje tun v{version}",
    yo: "Àwọn ìyípadà láti v{version} wá",
    ig: "Mgbanwe kemgbe v{version}",
    fr: "Changements depuis la v{version}",
    pt: "Alterações desde a v{version}",
    sw: "Mabadiliko tangu v{version}",
    ar: "التغييرات منذ الإصدار v{version}",
    tw: "Nsakraeɛ a asi firi v{version}",
    zu: "Izinguquko kusukela ku-v{version}",
  },
  changesWord: {
    en: "changes",
    ha: "canje-canje",
    yo: "àwọn ìyípadà",
    ig: "mgbanwe",
    fr: "changements",
    pt: "alterações",
    sw: "mabadiliko",
    ar: "تغييرات",
    tw: "nsakraeɛ",
    zu: "izinguquko",
  },
  noDiff: {
    en: "Nothing differs from the live version. Publishing this would raise a version number and change nothing a traveler sees — which usually means the draft did not pick up what it was meant to.",
    ha: "Babu bambanci da bugu mai aiki. Wallafa wannan zai ƙara lambar bugu amma ba zai canza wani abu da matafiyi zai gani ba — wanda yawanci ke nufin daftarin bai kama abin da aka nufa ba.",
    yo: "Kò sí ìyàtọ̀ láti ẹ̀yà tí ń ṣiṣẹ́ lọ́wọ́. Títẹ̀ èyí jáde yóò gbé nọ́mbà ẹ̀yà sókè láìsí yíyí ohunkóhun tí arìnrìn-àjò rí padà — èyí sábà a máa jẹ́ pé àkọsílẹ̀ náà kò mú ohun tí ó yẹ kí ó mú.",
    ig: "Ọ dịghị ihe dị iche na ụdị na-arụ ọrụ ugbu a. Ibipụta nke a ga-ebuli nọmba ụdị elu ma ọ gaghị agbanwe ihe ọ bụla onye njem na-ahụ — nke a na-egosikarị na ntule ahụ anataghị ihe e bu n'obi ka o mee.",
    fr: "Rien ne diffère de la version en ligne. Publier ceci ferait passer un numéro de version sans rien changer pour le voyageur — ce qui signifie généralement que le brouillon n'a pas repris ce qu'il devait.",
    pt: "Nada difere da versão ativa. Publicar isto elevaria um número de versão sem mudar nada que o viajante veja — o que geralmente significa que o rascunho não captou o que devia.",
    sw: "Hakuna kinachotofautiana na toleo linalotumika. Kuchapisha hii kungeongeza nambari ya toleo bila kubadilisha chochote anachoona msafiri — ambayo kwa kawaida ina maana rasimu haikupata kile ilichokusudiwa.",
    ar: "لا شيء يختلف عن النسخة المُفعَّلة. نشر هذا سيرفع رقم الإصدار دون أن يغيّر شيئًا يراه المسافر — وهو ما يعني عادة أن المسودة لم تلتقط ما كان يُقصد بها.",
    tw: "Biribiara nsesa firi nsakraeɛ a ɛreyɛ adwuma no ho. Sɛ wɔde eyi gu soro a, ɛbɛma nsakraeɛ akontaabu no kɔ soro nanso ɛnnsesa hwee a akwantufoɔ no bɛhu — deɛ ɛkyerɛ sɛ deɛ wɔatwerɛ no ammfa deɛ ɛsɛ sɛ ɛfa no.",
    zu: "Akukho okwehlukile enguqulweni esebenzayo. Ukushicilela lokhu kuzokhuphula inombolo yenguqulo kodwa akushintshi lutho isihambi esikubonayo — okuvame ukusho ukuthi uhlaka aluthathanga lokho okwakuhlosiwe.",
  },
  notSet: {
    en: "not set",
    ha: "ba a saita ba",
    yo: "a kò tí ì ṣètò",
    ig: "edobeghị",
    fr: "non défini",
    pt: "não definido",
    sw: "haijawekwa",
    ar: "غير محدد",
    tw: "wɔnhyehyɛɛ",
    zu: "akuhlelwe",
  },
  newDocument: {
    en: "New document",
    ha: "Sabuwar takarda",
    yo: "Ìwé tuntun",
    ig: "Akwụkwọ ọhụrụ",
    fr: "Nouveau document",
    pt: "Novo documento",
    sw: "Hati mpya",
    ar: "مستند جديد",
    tw: "Krataa foforɔ",
    zu: "Idokhumenti entsha",
  },
  noLongerAskedFor: {
    en: "No longer asked for",
    ha: "Ba a ƙara buƙata ba",
    yo: "A kò ní béèrè fún un mọ́",
    ig: "Anaghị ajụzikwa ya",
    fr: "N'est plus demandé",
    pt: "Já não é pedido",
    sw: "Haihitajiki tena",
    ar: "لم يعد مطلوبًا",
    tw: "Wɔnhwehwɛ bio",
    zu: "Akusadingwa",
  },
  reworded: {
    en: "Reworded",
    ha: "An sāke rubuta",
    yo: "A tún un kọ",
    ig: "Edeghachiri ya",
    fr: "Reformulé",
    pt: "Reformulado",
    sw: "Imeandikwa upya",
    ar: "أُعيدت صياغته",
    tw: "Wɔasesa mu asɛm",
    zu: "Kuphinde kwabhalwa",
  },
  removedNotice: {
    en: "A traveler who already uploaded this keeps their file — only untouched rows are dropped.",
    ha: "Matafiyin da ya riga ya ɗora wannan zai ci gaba da riƙe fayilinsa — layukan da ba a taɓa ba ne kawai za a cire.",
    yo: "Arìnrìn-àjò tí ó ti gbé èyí sókè tẹ́lẹ̀ yóò pa fáìlì rẹ̀ mọ́ — àwọn ìlà tí a kò fọwọ́ kàn nìkan ni a ó yọ kúrò.",
    ig: "Onye njem buworo nke a na mbụ na-ejigide faịlụ ya — naanị ahịrị a na-emetụghị aka ka a na-ewepụ.",
    fr: "Un voyageur qui a déjà téléversé ceci conserve son fichier — seules les lignes non touchées sont supprimées.",
    pt: "Um viajante que já carregou isto mantém o seu ficheiro — só as linhas intocadas são removidas.",
    sw: "Msafiri ambaye tayari amepakia hii anaendelea kuwa na faili lake — safu ambazo hazijaguswa pekee ndizo zinaondolewa.",
    ar: "المسافر الذي رفع هذا المستند بالفعل يحتفظ بملفه — تُحذف الصفوف غير الملموسة فقط.",
    tw: "Akwantufoɔ a wɔde eyi ato soro dedaw no bɛkora ne faele — nkyekyɛmu a wɔmfaa mu nko na wɔbɛyi afiri hɔ.",
    zu: "Isihambi esesilifake leli lilondoloza ifayela laso — kususwa kuphela imigqa engathintwanga.",
  },
  everyRequirementPanel: {
    en: "Every requirement in this version",
    ha: "Kowace buƙata a wannan bugu",
    yo: "Gbogbo ohun tí a béèrè nínú ẹ̀yà yìí",
    ig: "Ihe achọrọ ọ bụla n'ụdị a",
    fr: "Toutes les exigences de cette version",
    pt: "Todos os requisitos desta versão",
    sw: "Kila hitaji katika toleo hili",
    ar: "كل متطلب في هذا الإصدار",
    tw: "Ahyɛde biara a ɛwɔ saa nsakraeɛ yi mu",
    zu: "Sonke isidingo kule nguqulo",
  },
  noRequirements: {
    en: "This draft has no requirements. It cannot be approved — a traveler would get a checklist with nothing on it, no upload slots and no way to reach submission.",
    ha: "Wannan daftarin bashi da wata buƙata. Ba za a iya amincewa da shi ba — matafiyi zai sami jerin abubuwa mara komai, babu wurin ɗorawa kuma babu hanyar isa ga miƙawa.",
    yo: "Àkọsílẹ̀ yìí kò ní ohun tí a béèrè. A kò lè fọwọ́ sí i — arìnrìn-àjò yóò rí àkọsílẹ̀ tí kò ní nǹkan kan, kò ní ibi ìgbésókè kankan, kò sì ní ọ̀nà láti dé ìfisilẹ̀.",
    ig: "Ntule a enweghị ihe achọrọ. Enweghị ike ikwenye ya — onye njem ga-enweta ndepụta na-enweghị ihe ọ bụla na ya, enweghị oghere ibugo na enweghị ụzọ iru ntinye.",
    fr: "Ce brouillon n'a aucune exigence. Il ne peut pas être approuvé — un voyageur obtiendrait une liste vide, sans emplacement de téléversement ni moyen d'arriver à la soumission.",
    pt: "Este rascunho não tem requisitos. Não pode ser aprovado — o viajante obteria uma lista vazia, sem locais para carregar e sem forma de chegar à submissão.",
    sw: "Rasimu hii haina hitaji lolote. Haiwezi kuidhinishwa — msafiri angepata orodha isiyo na chochote, hakuna nafasi za kupakia na hakuna njia ya kufikia uwasilishaji.",
    ar: "لا تحتوي هذه المسودة على أي متطلبات. لا يمكن اعتمادها — سيحصل المسافر على قائمة فارغة، دون خانات رفع ودون طريقة للوصول إلى التقديم.",
    tw: "Saa deɛ wɔatwerɛ yi nni ahyɛde biara. Wɔntumi mmpene so — akwantufoɔ bɛnya nhyehyɛeɛ a hwee nni mu, beaeɛ biara nni hɔ a wɔde nkrataa bɛto soro na ɛkwan biara nni hɔ a ɛbɛma wɔde akɔ.",
    zu: "Lolu hlaka alunazo izidingo. Alukwazi ukugunyazwa — isihambi singathola uhlu olungenalutho, akukho izikhala zokulayisha futhi akukho indlela yokufinyelela ekuthumeleni.",
  },
  onlyIfApplies: {
    en: "Only if it applies",
    ha: "Kawai idan ya shafi",
    yo: "Bí ó bá kàn án nìkan",
    ig: "Naanị ma ọ dabara",
    fr: "Uniquement si applicable",
    pt: "Só se aplicável",
    sw: "Ikiwa tu inahusika",
    ar: "فقط إن كان ينطبق",
    tw: "Sɛ ɛfa ho nko ara",
    zu: "Kuphela uma kusebenza",
  },
  openTheSource: {
    en: "Open the source",
    ha: "Buɗe tushen",
    yo: "Ṣí orísun náà",
    ig: "Mepee isi mmalite",
    fr: "Ouvrir la source",
    pt: "Abrir a fonte",
    sw: "Fungua chanzo",
    ar: "فتح المصدر",
    tw: "Bue nsutɔ no",
    zu: "Vula umthombo",
  },
  yourDecisionPanel: {
    en: "Your decision",
    ha: "Shawararka",
    yo: "Ìpinnu rẹ",
    ig: "Mkpebi gị",
    fr: "Votre décision",
    pt: "A sua decisão",
    sw: "Uamuzi wako",
    ar: "قرارك",
    tw: "Wo gyinaeɛ",
    zu: "Isinqumo sakho",
  },
};

/**
 * `corridor-decision.tsx` — the approve/reject controls.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_CORRIDOR_DECISION: {
  readOnlyNotice: L;
  approveNotice: L;
  approveButton: L;
  sendBack: L;
  rejectPlaceholder: L;
  toastApproveSuccess: L;
  toastRejectSuccess: L;
} = {
  readOnlyNotice: {
    en: "Only a super admin can approve a route. You can read this draft and its sources, but the decision is not yours to record.",
    ha: "Babban admin ne kawai zai iya amincewa da hanya. Kana iya karanta wannan daftarin da tushensa, amma yanke shawarar ba naka bane don rubutawa.",
    yo: "Alábòójútó gíga nìkan ló lè fọwọ́ sí ipa ọ̀nà. O lè kà àkọsílẹ̀ yìí àti àwọn orísun rẹ̀, ṣùgbọ́n ìpinnu náà kì í ṣe tìrẹ láti kọ sílẹ̀.",
    ig: "Ọ bụ naanị onyeisi kachasị elu nwere ike ikwenye ụzọ. Ị nwere ike ịgụ ntule a na isi mmalite ya, mana mkpebi ahụ abụghị nke gị idebe.",
    fr: "Seul un super administrateur peut approuver un itinéraire. Vous pouvez lire ce brouillon et ses sources, mais la décision ne vous revient pas.",
    pt: "Só um super administrador pode aprovar uma rota. Pode ler este rascunho e as suas fontes, mas a decisão não é sua para registar.",
    sw: "Msimamizi mkuu pekee ndiye anayeweza kuidhinisha njia. Unaweza kusoma rasimu hii na vyanzo vyake, lakini uamuzi si wako kuurekodi.",
    ar: "المشرف الأعلى وحده يمكنه اعتماد المسار. يمكنك قراءة هذه المسودة ومصادرها، لكن القرار ليس لك لتسجيله.",
    tw: "Ɔhwɛfoɔ kɛseɛ nko ara na ɔbɛtumi apene ɛkwan so. Wobɛtumi akenkan saa deɛ wɔatwerɛ yi ne ne nsutɔ, nanso gyinaeɛ no nyɛ wo dea sɛ wobɛkyerɛw.",
    zu: "Umphathi omkhulu kuphela ongagunyaza indlela. Ungafunda lolu hlaka nemithombo yalo, kodwa isinqumo asisiso sakho ukuze usibhale.",
  },
  approveNotice: {
    en: "Approving publishes this version to every traveler on the route and records you as the person who checked it.",
    ha: "Amincewa zai wallafa wannan bugu ga kowane matafiyi a kan hanyar kuma ya rubuta ka a matsayin wanda ya duba shi.",
    yo: "Ìfọwọ́sí yóò tẹ ẹ̀yà yìí jáde fún gbogbo arìnrìn-àjò lórí ipa ọ̀nà, yóò sì kọ ọ́ sílẹ̀ pé ìwọ ni ẹni tí ó ṣàyẹ̀wò rẹ̀.",
    ig: "Ikwenye ga-ebipụta ụdị a nye onye njem ọ bụla nọ n'ụzọ ma dekọọ gị dịka onye lelere ya anya.",
    fr: "Approuver publie cette version pour chaque voyageur sur l'itinéraire et vous enregistre comme la personne qui l'a vérifiée.",
    pt: "Aprovar publica esta versão para todos os viajantes na rota e regista-o como a pessoa que a verificou.",
    sw: "Kuidhinisha kutachapisha toleo hili kwa kila msafiri kwenye njia hii na kukurekodi kama mtu aliyeikagua.",
    ar: "الموافقة تنشر هذا الإصدار لكل مسافر على هذا المسار وتسجّلك بصفتك الشخص الذي فحصها.",
    tw: "Sɛ wopene so a, ɛde saa nsakraeɛ yi bɛma akwantufoɔ biara a ɔwɔ ɛkwan no so na ɛbɛkyerɛw wo sɛ obi a ɔhwɛɛ mu.",
    zu: "Ukugunyaza kushicilela le nguqulo kuzo zonke izihambi ezisendleleni futhi kukurekhoda njengomuntu owayihlolile.",
  },
  approveButton: {
    en: "Approve and publish",
    ha: "Amince kuma wallafa",
    yo: "Fọwọ́ sí i kí o sì tẹ̀ ẹ́ jáde",
    ig: "Kwenye ma bipụta",
    fr: "Approuver et publier",
    pt: "Aprovar e publicar",
    sw: "Idhinisha na uchapishe",
    ar: "الموافقة والنشر",
    tw: "Pene so na fa gu soro",
    zu: "Gunyaza bese ushicilela",
  },
  sendBack: {
    en: "Send back",
    ha: "Mayar da shi",
    yo: "Dá a padà",
    ig: "Zighachi ya",
    fr: "Renvoyer",
    pt: "Devolver",
    sw: "Rudisha",
    ar: "إعادة",
    tw: "San de kɔ",
    zu: "Buyisela",
  },
  rejectPlaceholder: {
    en: "What is wrong with this draft? Whoever redrafts it reads this.",
    ha: "Mene ne bai dace ba da wannan daftarin? Duk wanda zai sāke shi zai karanta wannan.",
    yo: "Kí ni kò tọ́ sí àkọsílẹ̀ yìí? Ẹnikẹ́ni tí yóò tún un kọ yóò kà èyí.",
    ig: "Gịnị ka na-ezighị ezi banyere ntule a? Onye ọ bụla ga-edeghachi ya na-agụ nke a.",
    fr: "Qu'est-ce qui ne va pas dans ce brouillon ? Celui qui le refera lira ceci.",
    pt: "O que está errado com este rascunho? Quem o reescrever lê isto.",
    sw: "Nini kibaya na rasimu hii? Yeyote atakayeirekebisha atasoma haya.",
    ar: "ما الخطأ في هذه المسودة؟ من سيعيد صياغتها سيقرأ هذا.",
    tw: "Dɛn na ɛnyɛ dɛn wɔ deɛ wɔatwerɛ yi mu? Obiara a ɔbɛsan atwerɛ bio no bɛkenkan yei.",
    zu: "Yini engalungile ngalolu hlaka? Noma ubani ozoluphinda uzokufunda lokhu.",
  },
  toastApproveSuccess: {
    en: "Approved — travelers on this route see it now",
    ha: "An amince — matafiya a kan wannan hanya suna gani yanzu",
    yo: "A ti fọwọ́ sí i — àwọn arìnrìn-àjò lórí ipa ọ̀nà yìí ń rí i báyìí",
    ig: "Ekwenyere — ndị njem nọ n'ụzọ a na-ahụ ya ugbu a",
    fr: "Approuvé — les voyageurs sur cet itinéraire le voient désormais",
    pt: "Aprovado — os viajantes nesta rota já o veem",
    sw: "Imeidhinishwa — wasafiri kwenye njia hii wanaiona sasa",
    ar: "تمت الموافقة — يراها الآن المسافرون على هذا المسار",
    tw: "Wɔapene so — akwantufoɔ a wɔwɔ saa ɛkwan yi so hu seesei ara",
    zu: "Kugunyaziwe — izihambi kule ndlela ziyayibona manje",
  },
  toastRejectSuccess: {
    en: "Sent back with your reason",
    ha: "An mayar da shi tare da dalilinka",
    yo: "A dá a padà pẹ̀lú ìdí rẹ",
    ig: "Ezighachiri ya na ihe kpatara ya i kwuru",
    fr: "Renvoyé avec votre motif",
    pt: "Devolvido com o seu motivo",
    sw: "Imerudishwa na sababu yako",
    ar: "أُعيدت مع سببك",
    tw: "Wɔasan de akɔ wo nkyerɛase ho",
    zu: "Kubuyiswe nesizathu sakho",
  },
};

/**
 * `requirement-condition.tsx` — the applies-when rule builder.
 *
 * The chip values a rule names (`current.in`, and `chip.value` /
 * `q.prompt` selected from `INTAKE_QUESTIONS`) are the traveller's own
 * answer tokens, stored verbatim for matching — never translated, same
 * as a case note. `INTAKE_QUESTIONS`'s own `prompt`/`label` text is
 * already a `Record<Locale, string>` from the foundation pass, so this
 * component now resolves it through `useT()` rather than a hardcoded
 * `.en`.
 *
 * NEEDS NATIVE REVIEW before launch. Translated in-house from the
 * English, the same way `hero.ts` and `intake.ts` were.
 */
export const OPS_REQUIREMENT_CONDITION: {
  appliesWhen: L;
  orWord: L;
  noRuleReadOnly: L;
  noRuleBadge: L;
  changeRule: L;
  writeTheRule: L;
  appliesWhenAnswered: L;
  chooseQuestion: L;
  withAnyOfTheseAnswers: L;
  freeTextNotice: L;
  saveRule: L;
  clearRule: L;
  toastCleared: L;
  toastSaved: L;
} = {
  appliesWhen: {
    en: "Applies when",
    ha: "Yana aiki idan",
    yo: "Ń kan nígbà tí",
    ig: "Ọ na-adaba mgbe",
    fr: "S'applique quand",
    pt: "Aplica-se quando",
    sw: "Inahusika wakati",
    ar: "ينطبق عندما",
    tw: "Ɛfa ho ɛberɛ a",
    zu: "Kusebenza uma",
  },
  orWord: {
    en: "or",
    ha: "ko",
    yo: "tàbí",
    ig: "ma ọ bụ",
    fr: "ou",
    pt: "ou",
    sw: "au",
    ar: "أو",
    tw: "anaa",
    zu: "noma",
  },
  noRuleReadOnly: {
    en: "No rule yet — travellers are asked about this one with a hedge.",
    ha: "Babu ƙa'ida tukuna — ana tambayar matafiya game da wannan tare da tanadi.",
    yo: "Kò tí ì sí òfin — a máa ń béèrè lọ́wọ́ àwọn arìnrìn-àjò nípa èyí pẹ̀lú ìṣọ́ra.",
    ig: "Enweghị iwu ka a ga-eme — a na-ajụ ndị njem gbasara nke a na nkwadebe.",
    fr: "Pas encore de règle — les voyageurs sont interrogés à ce sujet, par prudence.",
    pt: "Ainda sem regra — os viajantes são questionados sobre isto por precaução.",
    sw: "Bado hakuna sheria — wasafiri wanaulizwa kuhusu hii kwa tahadhari.",
    ar: "لا توجد قاعدة بعد — يُسأل المسافرون عن هذا الأمر احتياطًا.",
    tw: "Mmara biara nni hɔ ɛnnye — wɔbisa akwantufoɔ fa yei ho de bɔ ho ban.",
    zu: "Akukho mthetho okwamanje — izihambi ziyabuzwa ngalokhu ngokuqaphela.",
  },
  noRuleBadge: {
    en: "No rule yet",
    ha: "Babu ƙa'ida tukuna",
    yo: "Kò tí ì sí òfin",
    ig: "Enweghị iwu ka a ga-eme",
    fr: "Pas encore de règle",
    pt: "Ainda sem regra",
    sw: "Bado hakuna sheria",
    ar: "لا توجد قاعدة بعد",
    tw: "Mmara biara nni hɔ ɛnnye",
    zu: "Akukho mthetho okwamanje",
  },
  changeRule: {
    en: "Change rule",
    ha: "Canza ƙa'ida",
    yo: "Yí òfin padà",
    ig: "Gbanwee iwu",
    fr: "Modifier la règle",
    pt: "Alterar regra",
    sw: "Badilisha sheria",
    ar: "تغيير القاعدة",
    tw: "Sesa mmara no",
    zu: "Shintsha umthetho",
  },
  writeTheRule: {
    en: "Write the rule",
    ha: "Rubuta ƙa'idar",
    yo: "Kọ òfin náà",
    ig: "Dee iwu ahụ",
    fr: "Rédiger la règle",
    pt: "Escrever a regra",
    sw: "Andika sheria",
    ar: "كتابة القاعدة",
    tw: "Twerɛ mmara no",
    zu: "Bhala umthetho",
  },
  appliesWhenAnswered: {
    en: "Applies when the traveller answered",
    ha: "Yana aiki idan matafiyi ya amsa",
    yo: "Ń kan nígbà tí arìnrìn-àjò bá dáhùn",
    ig: "Ọ na-adaba mgbe onye njem zara",
    fr: "S'applique lorsque le voyageur a répondu",
    pt: "Aplica-se quando o viajante respondeu",
    sw: "Inahusika wakati msafiri alijibu",
    ar: "ينطبق عندما يكون المسافر قد أجاب",
    tw: "Ɛfa ho ɛberɛ a akwantufoɔ no bua sɛ",
    zu: "Kusebenza uma isihambi siphendule",
  },
  chooseQuestion: {
    en: "Choose a question…",
    ha: "Zaɓi tambaya…",
    yo: "Yan ìbéèrè kan…",
    ig: "Họrọ ajụjụ…",
    fr: "Choisissez une question…",
    pt: "Escolha uma pergunta…",
    sw: "Chagua swali…",
    ar: "اختر سؤالًا…",
    tw: "Yi asɛmmisa bi…",
    zu: "Khetha umbuzo…",
  },
  withAnyOfTheseAnswers: {
    en: "with any of these answers",
    ha: "tare da kowace daga cikin waɗannan amsoshin",
    yo: "pẹ̀lú èyíkéyìí nínú àwọn ìdáhùn wọ̀nyí",
    ig: "site na azịza ọ bụla n'ime ndị a",
    fr: "avec l'une de ces réponses",
    pt: "com qualquer uma destas respostas",
    sw: "na jibu lolote kati ya haya",
    ar: "بأي من هذه الإجابات",
    tw: "wɔ mmuae yi mu biara ho",
    zu: "nganoma iyiphi yalezi zimpendulo",
  },
  freeTextNotice: {
    en: "A traveller who typed their own answer instead of tapping one of these is not matched by the rule, and keeps this document on their conditional list.",
    ha: "Matafiyin da ya rubuta amsarsa maimakon danna ɗaya daga cikin waɗannan, ƙa'idar ba za ta yi daidai da shi ba, kuma zai ci gaba da samun wannan takarda a jerin takardun sharaɗi.",
    yo: "Arìnrìn-àjò tí ó tẹ ìdáhùn tirẹ̀ dípò kíkọ ọ̀kan nínú àwọn wọ̀nyí, òfin náà kò ní bá a mu, yóò sì pa ìwé yìí mọ́ nínú àkọsílẹ̀ àṣàyàn rẹ̀.",
    ig: "Onye njem tinyere azịza nke ya n'ọnọdụ ịpị otu n'ime ndị a, iwu ahụ agaghị adaba ya, ọ ga-ejigidekwa akwụkwọ a na ndepụta ya nwere ọnọdụ.",
    fr: "Un voyageur ayant saisi sa propre réponse plutôt que d'en toucher une de la liste n'est pas concerné par la règle, et garde ce document sur sa liste conditionnelle.",
    pt: "Um viajante que escreveu a sua própria resposta em vez de tocar numa destas não é abrangido pela regra, e mantém este documento na sua lista condicional.",
    sw: "Msafiri aliyeandika jibu lake mwenyewe badala ya kugusa mojawapo ya haya halingani na sheria, na anaendelea kuwa na hati hii kwenye orodha yake ya masharti.",
    ar: "المسافر الذي كتب إجابته الخاصة بدلاً من اختيار إحدى هذه الإجابات لا تنطبق عليه القاعدة، ويبقى هذا المستند في قائمته المشروطة.",
    tw: "Akwantufoɔ a ɔtwerɛɛ n'ankasa mmuae sen sɛ ɔbɛka mmuae yi mu baako no, mmara no nte no, na ɔbɛkora saa krataa yi wɔ ne nhyehyɛeɛ a ɛda nsɛm so no mu.",
    zu: "Isihambi esibhale impendulo yaso siqu esikhundleni sokuthepha enye yalezi asihlangani nomthetho, futhi sigcina le dokhumenti ohlwini lwaso oluyimibandela.",
  },
  saveRule: {
    en: "Save rule",
    ha: "Ajiye ƙa'idar",
    yo: "Fi òfin pamọ́",
    ig: "Chekwaa iwu ahụ",
    fr: "Enregistrer la règle",
    pt: "Guardar regra",
    sw: "Hifadhi sheria",
    ar: "حفظ القاعدة",
    tw: "Kora mmara no so",
    zu: "Londoloza umthetho",
  },
  clearRule: {
    en: "Clear the rule",
    ha: "Share ƙa'idar",
    yo: "Pa òfin náà rẹ́",
    ig: "Kpochapụ iwu ahụ",
    fr: "Effacer la règle",
    pt: "Limpar a regra",
    sw: "Futa sheria",
    ar: "مسح القاعدة",
    tw: "Pepa mmara no",
    zu: "Sula umthetho",
  },
  toastCleared: {
    en: "Rule cleared.",
    ha: "An share ƙa'idar.",
    yo: "A ti pa òfin náà rẹ́.",
    ig: "Ekpochapụla iwu ahụ.",
    fr: "Règle effacée.",
    pt: "Regra limpa.",
    sw: "Sheria imefutwa.",
    ar: "تم مسح القاعدة.",
    tw: "Wɔapepa mmara no.",
    zu: "Umthetho ususiwe.",
  },
  toastSaved: {
    en: "Rule saved.",
    ha: "An ajiye ƙa'idar.",
    yo: "A ti fi òfin náà pamọ́.",
    ig: "Echekwala iwu ahụ.",
    fr: "Règle enregistrée.",
    pt: "Regra guardada.",
    sw: "Sheria imehifadhiwa.",
    ar: "تم حفظ القاعدة.",
    tw: "Wɔakora mmara no so.",
    zu: "Umthetho ulondoloziwe.",
  },
};
