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
  /**
   * Rewritten 2026-09-10 at the client's request. The previous copy —
   * "Our team is reviewing the documents you sent" — described a review
   * already under way, and a director who had sent nothing read it as a
   * status about work that did not exist. What actually happens is an
   * email asking for the documents, so that is what this now says.
   *
   * The subscription link the old copy promised is deliberately not
   * mentioned, and nothing is lost by dropping it: it is a real link in
   * the activation email itself — `kybActivatedEmail` in
   * `@/lib/notifications/templates`, whose CTA is "Start your
   * subscription" pointing at `billingUrl`. Promising it here described
   * a button on a letter that has not arrived yet.
   */
  body: {
    en: "We have sent you an email request for verification documents. Once your documents are verified, we will activate your account.",
    ha: "Mun aika muku da imel muna neman takardun tabbatarwa. Da zarar an tabbatar da takardunku, za mu kunna asusunku.",
    yo: "A ti fi ímeèlì ránṣẹ́ sí yín láti béèrè àwọn ìwé ìjẹ́rìísí. Kété tí a bá ti jẹ́rìísí àwọn ìwé yín, a ó ṣí àkọọ́lẹ̀ yín.",
    ig: "Anyị ezigala gị ozi ịmeel na-arịọ akwụkwọ nkwenye. Ozugbo anyị kwadoro akwụkwọ gị, anyị ga-agbanye akaụntụ gị.",
    fr: "Nous vous avons envoyé un e-mail demandant vos documents de vérification. Dès qu'ils seront vérifiés, nous activerons votre compte.",
    pt: "Enviámos-lhe um e-mail a pedir os documentos de verificação. Assim que os seus documentos forem verificados, ativaremos a sua conta.",
    sw: "Tumekutumia barua pepe tukiomba nyaraka za uthibitisho. Mara nyaraka zako zitakapothibitishwa, tutawasha akaunti yako.",
    ar: "لقد أرسلنا إليك بريدًا إلكترونيًا نطلب فيه مستندات التحقق. وبمجرد التحقق من مستنداتك، سنقوم بتفعيل حسابك.",
    tw: "Yɛasoma email akɔma wo rebisa wo nkrataa a wɔde bɛsɔ wo ano. Sɛ yɛsɔ wo nkrataa no ano wie a, yɛbɛbue wo akawnt no.",
    zu: "Sikuthumele i-imeyili sicela amadokhumenti okuqinisekisa. Uma amadokhumenti akho eseqinisekisiwe, sizovula i-akhawunti yakho.",
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
