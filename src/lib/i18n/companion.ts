import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The "After you land" companion tab — its static chrome only. The
 * AI-generated local tips (`tips.markdown`, rendered through
 * `ChatMarkdown`), the arrival checklist and renewal guidance
 * (`@/lib/domain/companion`, outside this pass's ownership), the
 * official travel advisories (another government's own words, never
 * paraphrased), and curated destination/weather data all stay exactly
 * as produced — nothing generated or DB-sourced is touched here.
 *
 * English values here are exactly the copy the page already had; every
 * other locale was translated in-house from that English, the same way
 * `HERO` was.
 *
 * NEEDS NATIVE REVIEW before launch.
 */
export const COMPANION: {
  title: L;
  heading: L;
  intro: L;
  arrivalChecklistLabel: L;
  stepsBadge: L;
  localTipsLabel: L;
  noTipsYet: L;
  renewalLabel: L;
  checkAheadBadge: L;
  thisWeekLabel: L;
  weatherOutlook: L;
  travelAdviceLabel: L;
  officialBadge: L;
  readItOn: L;
  yourVisaLabel: L;
  approvedAndOnFile: L;
} = {
  title: {
    en: "After you land",
    ha: "Bayan ka sauka",
    yo: "Lẹ́yìn tí o bá dé",
    ig: "Mgbe ị rutere",
    fr: "Après votre arrivée",
    pt: "Depois de chegar",
    sw: "Baada ya kuwasili",
    ar: "بعد وصولك",
    tw: "Wo aduba akyi",
    zu: "Ngemva kokufika kwakho",
  },
  heading: {
    en: "After you land",
    ha: "Bayan ka sauka",
    yo: "Lẹ́yìn tí o bá dé",
    ig: "Mgbe ị rutere",
    fr: "Après votre arrivée",
    pt: "Depois de chegar",
    sw: "Baada ya kuwasili",
    ar: "بعد وصولك",
    tw: "Wo aduba akyi",
    zu: "Ngemva kokufika kwakho",
  },
  intro: {
    en: "Your approval is the start of a new file, not the end of this one — here is what to do in your first weeks, and what to check before your visa needs renewing.",
    ha: "Amincewarka ita ce farkon sabon fayil, ba ƙarshen wannan ba — ga abin da za ka yi a makonnin farko, da abin da za ka duba kafin bizarka ta buƙaci sabuntawa.",
    yo: "Ìfọwọ́sí rẹ ni ìbẹ̀rẹ̀ fáìlì tuntun, kì í ṣe òpin èyí — èyí ni ohun tí o gbọ́dọ̀ ṣe ní àwọn ọ̀sẹ̀ àkọ́kọ́ rẹ, àti ohun tí o gbọ́dọ̀ ṣàyẹ̀wò kí fisa rẹ tó nílò sìsọdọ̀tun.",
    ig: "Nkwado gị bụ mmalite faịlụ ọhụrụ, ọ bụghị njedebe nke a — nke a bụ ihe ị ga-eme n'izu mbụ gị, na ihe ị ga-elele tupu visa gị achọ imegharị.",
    fr: "Votre approbation est le début d'un nouveau dossier, pas la fin de celui-ci — voici quoi faire dans vos premières semaines, et quoi vérifier avant que votre visa n'ait besoin d'être renouvelé.",
    pt: "A sua aprovação é o início de um novo processo, não o fim deste — aqui está o que fazer nas primeiras semanas, e o que verificar antes de o seu visto precisar de ser renovado.",
    sw: "Idhini yako ni mwanzo wa faili jipya, si mwisho wa hili — hapa kuna la kufanya katika wiki zako za kwanza, na la kuangalia kabla viza yako haijahitaji kufanywa upya.",
    ar: "موافقتك هي بداية ملف جديد، وليست نهاية هذا الملف — إليك ما يجب فعله في أسابيعك الأولى، وما يجب التحقق منه قبل أن تحتاج تأشيرتك إلى التجديد.",
    tw: "Wo nkuranhyensa yɛ faele foforɔ mfitiaseɛ, ɛnyɛ eyi awieeɛ — deɛ yi ne deɛ ɛsɛ sɛ woyɛ wɔ wo nnawɔtwe a edi kan mu, ne deɛ ɛsɛ sɛ wohwɛ ansa na wo visa ahia sɛ wɔyɛ no foforɔ.",
    zu: "Ukugunyazwa kwakho kuwukuqala kwefayela elisha, hhayi ukuphela kwaleli — nakhu okumele ukwenze emasontweni akho okuqala, nokumele ukuhlole ngaphambi kokuba i-visa yakho idinge ukuvuselelwa.",
  },
  arrivalChecklistLabel: {
    en: "Arrival checklist",
    ha: "Jerin abubuwa na isowa",
    yo: "Àkọsílẹ̀ ìgbésẹ̀ nígbà dídé",
    ig: "Ndepụta mgbe ị rutere",
    fr: "Liste de contrôle à l'arrivée",
    pt: "Lista de verificação de chegada",
    sw: "Orodha ya kufika",
    ar: "قائمة مهام الوصول",
    tw: "Aduba ho krataa nhyehyɛeɛ",
    zu: "Uhlu lokuhlola lokufika",
  },
  stepsBadge: {
    en: "steps",
    ha: "matakai",
    yo: "ìgbésẹ̀",
    ig: "nzọụkwụ",
    fr: "étapes",
    pt: "passos",
    sw: "hatua",
    ar: "خطوات",
    tw: "anammɔntuo",
    zu: "izinyathelo",
  },
  localTipsLabel: {
    en: "Local tips",
    ha: "Shawarwarin gida",
    yo: "Ìmọ̀ràn agbègbè",
    ig: "Ndụmọdụ mpaghara",
    fr: "Conseils locaux",
    pt: "Dicas locais",
    sw: "Vidokezo vya eneo",
    ar: "نصائح محلية",
    tw: "Mpɔtam afutusɛm",
    zu: "Amathiphu endawo",
  },
  noTipsYet: {
    en: "Nothing generated yet. Your checklist above is ready either way — local tips appear here once they have been put together.",
    ha: "Ba a haifar da komai ba tukuna. Jerin abubuwanka a sama a shirye yake ko ta yaya — shawarwarin gida za su bayyana a nan da zarar an tattara su.",
    yo: "Kò tí ì sí ohun tí a ti dá sílẹ̀. Àkọsílẹ̀ rẹ lókè ti ṣetan bí ó tilẹ̀ jẹ́ pé — ìmọ̀ràn agbègbè máa farahàn níbí ní kété tí a bá ti kó wọn jọ.",
    ig: "Ọ dịbeghị ihe emepụtara. Ndepụta gị dị n'elu adịla njikere n'ụzọ ọ bụla — ndụmọdụ mpaghara ga-apụta ebe a ozugbo achịkọtara ha.",
    fr: "Rien n'a encore été généré. Votre liste ci-dessus est prête de toute façon — les conseils locaux apparaîtront ici une fois assemblés.",
    pt: "Ainda nada foi gerado. A sua lista acima está pronta de qualquer forma — as dicas locais aparecem aqui assim que forem reunidas.",
    sw: "Hakuna kilichozalishwa bado. Orodha yako hapo juu iko tayari hata hivyo — vidokezo vya eneo vitaonekana hapa mara vitakapoandaliwa.",
    ar: "لم يتم إنشاء شيء بعد. قائمتك أعلاه جاهزة على أي حال — ستظهر النصائح المحلية هنا بمجرد تجميعها.",
    tw: "Wɔmmfaa hwee mmaa ɛnnora. Wo krataa nhyehyɛeɛ a ɛwɔ soro no ayɛ krado deɛ ɛbɛba biara — mpɔtam afutusɛm bɛpue wɔ ha sɛ wɔaboaboa ano wie a.",
    zu: "Akukho okwenziwe okwamanje. Uhlu lwakho olungenhla lusekulungele noma kunjalo — amathiphu endawo azovela lapha uma esehlangeniswe.",
  },
  renewalLabel: {
    en: "Renewal",
    ha: "Sabuntawa",
    yo: "Ìsọdọ̀tun",
    ig: "Imegharị",
    fr: "Renouvellement",
    pt: "Renovação",
    sw: "Uhuishaji",
    ar: "التجديد",
    tw: "Foforɔyɛ",
    zu: "Ukuvuselela",
  },
  checkAheadBadge: {
    en: "Check ahead",
    ha: "Duba tun da wuri",
    yo: "Ṣàyẹ̀wò ṣáájú",
    ig: "Lelee tupu oge eruo",
    fr: "À vérifier à l'avance",
    pt: "Verificar com antecedência",
    sw: "Angalia mapema",
    ar: "تحقق مسبقاً",
    tw: "Hwɛ ansa",
    zu: "Hlola kusengaphambili",
  },
  thisWeekLabel: {
    en: "This week",
    ha: "Wannan makon",
    yo: "Ọ̀sẹ̀ yìí",
    ig: "Izu a",
    fr: "Cette semaine",
    pt: "Esta semana",
    sw: "Wiki hii",
    ar: "هذا الأسبوع",
    tw: "Saa dapɛn yi",
    zu: "Leli sonto",
  },
  weatherOutlook: {
    en: "Over the next {days} days in {city}, expect highs around {highC}{unit} and lows around {lowC}{unit}.",
    ha: "A cikin kwanaki {days} masu zuwa a {city}, ana sa ran mafi zafi kusan {highC}{unit} da mafi sanyi kusan {lowC}{unit}.",
    yo: "Láàrin ọjọ́ {days} tí ń bọ̀ ní {city}, retí ìgbóná tí ó ga jùlọ ní àyíká {highC}{unit} àti ìtutù tí ó kéré jùlọ ní àyíká {lowC}{unit}.",
    ig: "N'ime ụbọchị {days} na-abịa na {city}, tụọ anya okpomọkụ dịka {highC}{unit} na oyi dịka {lowC}{unit}.",
    fr: "Au cours des {days} prochains jours à {city}, attendez-vous à des maximales autour de {highC}{unit} et des minimales autour de {lowC}{unit}.",
    pt: "Nos próximos {days} dias em {city}, espere máximas em torno de {highC}{unit} e mínimas em torno de {lowC}{unit}.",
    sw: "Katika siku {days} zijazo huko {city}, tarajia joto kali kiasi cha {highC}{unit} na baridi kiasi cha {lowC}{unit}.",
    ar: "خلال الأيام {days} القادمة في {city}، توقّع درجات حرارة عليا حول {highC}{unit} ودنيا حول {lowC}{unit}.",
    tw: "Wɔ nna {days} a ɛreba wɔ {city} mu no, hwɛ kwan sɛ ɔhyew bɛba bɛn {highC}{unit} na awɔw bɛba bɛn {lowC}{unit}.",
    zu: "Ezinsukwini ezingu-{days} ezizayo e-{city}, lindela izinga eliphakeme elingaba {highC}{unit} nelisezansi elingaba {lowC}{unit}.",
  },
  travelAdviceLabel: {
    en: "Travel advice",
    ha: "Shawarar tafiya",
    yo: "Ìmọ̀ràn ìrìnnà",
    ig: "Ndụmọdụ njem",
    fr: "Conseils aux voyageurs",
    pt: "Conselhos de viagem",
    sw: "Ushauri wa usafiri",
    ar: "نصائح السفر",
    tw: "Akwantuo ho afutusɛm",
    zu: "Iseluleko sokuhamba",
  },
  officialBadge: {
    en: "Official",
    ha: "Na hukuma",
    yo: "Ti ìjọba",
    ig: "Nke gọọmentị",
    fr: "Officiel",
    pt: "Oficial",
    sw: "Rasmi",
    ar: "رسمي",
    tw: "Aban deɛ",
    zu: "Okusemthethweni",
  },
  readItOn: {
    en: "Read it on {source}",
    ha: "Karanta shi a {source}",
    yo: "Ka a lórí {source}",
    ig: "Gụọ ya na {source}",
    fr: "Lire sur {source}",
    pt: "Ler em {source}",
    sw: "Soma kwenye {source}",
    ar: "اقرأه على {source}",
    tw: "Kenkan wɔ {source} so",
    zu: "Kufunde ku-{source}",
  },
  yourVisaLabel: {
    en: "Your visa",
    ha: "Bizarka",
    yo: "Fisa rẹ",
    ig: "Visa gị",
    fr: "Votre visa",
    pt: "O seu visto",
    sw: "Viza yako",
    ar: "تأشيرتك",
    tw: "Wo visa",
    zu: "I-visa yakho",
  },
  approvedAndOnFile: {
    en: "Approved and on file.",
    ha: "An amince kuma yana cikin fayil.",
    yo: "A ti fọwọ́sí a sì wà nínú fáìlì.",
    ig: "Akwadoro ma dị na faịlụ.",
    fr: "Approuvé et classé.",
    pt: "Aprovado e arquivado.",
    sw: "Imeidhinishwa na iko kwenye faili.",
    ar: "تمت الموافقة وهو مسجَّل في الملف.",
    tw: "Wɔapene so na ɛwɔ faele mu.",
    zu: "Kugunyaziwe futhi kusefayeleni.",
  },
};
