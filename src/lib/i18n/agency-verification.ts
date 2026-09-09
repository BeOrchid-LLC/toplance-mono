import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * `/agency/verification` — the whole of what an agency sees while
 * BeOrchid decides whether to let it in.
 *
 * Deliberately four strings. The checklist itself is internal: showing a
 * director a `rejected` row they cannot act on in-product invites the
 * question "why can't I just upload it here?", whose honest answer this
 * milestone is "you can't yet". So this screen says what is happening,
 * says what happens next, and says how to reach a person — and nothing
 * about which document is outstanding, because the reply to that is an
 * email either way.
 *
 * NEEDS NATIVE REVIEW before launch, like every non-English string here.
 */
export const AGENCY_VERIFICATION: {
  title: L;
  heading: L;
  body: L;
  contact: L;
} = {
  /** The `<title>`, with no agency name in it — it is read in a tab. */
  title: {
    en: "Verification in progress",
    ha: "Ana tabbatarwa",
    yo: "Ìjẹ́rìísí ń lọ lọ́wọ́",
    ig: "Nkwenye na-aga n'ihu",
    fr: "Vérification en cours",
    pt: "Verificação em curso",
    sw: "Uthibitisho unaendelea",
    ar: "التحقق قيد التنفيذ",
    tw: "Nhwehwɛmu rekɔ so",
    zu: "Ukuqinisekisa kuyaqhubeka",
  },
  /** "We are verifying {agency}" — the agency's own name, on its own screen. */
  heading: {
    en: "We are verifying {agency}",
    ha: "Muna tabbatar da {agency}",
    yo: "À ń jẹ́rìísí {agency}",
    ig: "Anyị na-akwado {agency}",
    fr: "Nous vérifions {agency}",
    pt: "Estamos a verificar a {agency}",
    sw: "Tunathibitisha {agency}",
    ar: "نحن نتحقق من {agency}",
    tw: "Yɛresɔ {agency} ano",
    zu: "Siqinisekisa i-{agency}",
  },
  body: {
    en: "Our team is reviewing the documents you sent. We will email you the moment your console is open, with a link to start your subscription.",
    ha: "Ƙungiyarmu tana bitar takardun da kuka aika. Za mu aika muku da imel nan da nan da na'urar sarrafa ta buɗe, tare da hanyar haɗi don fara biyan kuɗin ku.",
    yo: "Ẹgbẹ́ wa ń yẹ àwọn ìwé tí ẹ rán sí wa wò. A ó fi ímeèlì ránṣẹ́ sí yín kété tí kọ̀nsólù yín bá ṣí, pẹ̀lú ọ̀nà àsopọ̀ láti bẹ̀rẹ̀ ìforúkọsílẹ̀ yín.",
    ig: "Ndị otu anyị na-enyocha akwụkwọ ị zitere. Anyị ga-ezigara gị ozi ozugbo consul gị meghere, tinyere njikọ iji malite ndenye aha gị.",
    fr: "Notre équipe examine les documents que vous avez envoyés. Nous vous écrirons dès l'ouverture de votre console, avec un lien pour lancer votre abonnement.",
    pt: "A nossa equipa está a analisar os documentos que enviou. Enviaremos um e-mail assim que a sua consola abrir, com uma ligação para iniciar a sua subscrição.",
    sw: "Timu yetu inakagua nyaraka ulizotuma. Tutakutumia barua pepe mara kiweko chako kitakapofunguka, pamoja na kiungo cha kuanzisha usajili wako.",
    ar: "يراجع فريقنا المستندات التي أرسلتها. سنراسلك بالبريد فور فتح لوحتك، مع رابط لبدء اشتراكك.",
    tw: "Yɛn kuo no rehwɛ nkrataa a wode kɔmaa yɛn no mu. Yɛbɛsoma email akɔma wo bere a wo console no bue, a link a wode bɛfiri wo subscription ase ka ho.",
    zu: "Ithimba lethu libuyekeza amadokhumenti owathumele. Sizokuthumela i-imeyili ngokushesha lapho ikhonsoli yakho ivuleka, nesixhumanisi sokuqala okubhalisayo kwakho.",
  },
  /**
   * `{email}` rather than a hard-coded address: the support address is
   * `SUPPORT_EMAIL`, and a translation with an address baked
   * into it is ten strings to edit the day it changes.
   */
  contact: {
    en: "Anything to add, or a document to resend? Write to {email}.",
    ha: "Kuna da wani abin ƙarawa, ko takarda da za a sake aikawa? Ku rubuta zuwa {email}.",
    yo: "Ǹjẹ́ ẹ ní ohunkóhun láti fikún, tàbí ìwé láti tún rán? Ẹ kọ̀wé sí {email}.",
    ig: "Ị nwere ihe ị ga-agbakwunye, ma ọ bụ akwụkwọ ị ga-eziga ọzọ? Degara {email}.",
    fr: "Un ajout, ou un document à renvoyer ? Écrivez à {email}.",
    pt: "Algo a acrescentar, ou um documento a reenviar? Escreva para {email}.",
    sw: "Una la kuongeza, au hati ya kutuma tena? Andika kwa {email}.",
    ar: "هل لديك ما تضيفه أو مستند تريد إعادة إرساله؟ راسلنا على {email}.",
    tw: "Wowɔ biribi a wode bɛka ho, anaa krataa a wobɛsan de akɔma yɛn? Twerɛ kɔ {email}.",
    zu: "Ingabe kukhona ongakwengeza, noma idokhumenti ongaphinda ulithumele? Bhalela ku-{email}.",
  },
};
