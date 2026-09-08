import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The platform staff member's own profile screen.
 *
 * Its own file rather than three more keys on `OPS_COMMON`, which holds
 * what every ops screen repeats — a subtitle, the review-state words, the
 * nav labels. A page's heading and lead belong to that page, the way
 * `ops-staff.ts` and `ops-tenants.ts` hold theirs.
 *
 * The heading and the details label are word-for-word the agency
 * profile's (`AGENCY.profileTitle`, `AGENCY.profileDetailsLabel`) in
 * every locale: the two screens ask the same question of two personas,
 * and answering it in two different phrasings would only be drift. The
 * lead differs because the audience does — a reviewer here is seen by
 * colleagues and by the agencies they provision, not by clients.
 *
 * NEEDS NATIVE REVIEW before launch, on the same terms as `ops-common.ts`
 * and `agency.ts`: translated in-house from the English.
 */
export const OPS_PROFILE: {
  heading: L;
  intro: L;
  detailsLabel: L;
} = {
  heading: {
    en: "Your profile",
    ha: "Bayananka",
    yo: "Àkọọ́lẹ̀ rẹ",
    ig: "Profaịlụ gị",
    fr: "Votre profil",
    pt: "O seu perfil",
    sw: "Wasifu wako",
    ar: "ملفك الشخصي",
    tw: "Wo ho nsɛm",
    zu: "Iphrofayela yakho",
  },
  intro: {
    en: "How your colleagues and the agencies you work with see you, and where we reach you.",
    ha: "Yadda abokan aikinka da hukumomin da kake aiki da su suke ganin ka, da inda za mu tuntuɓe ka.",
    yo: "Bí àwọn alábàáṣiṣẹ́ rẹ àti àwọn ilé-iṣẹ́ tí o ń bá ṣiṣẹ́ ṣe rí ọ, àti ibi tí a ti lè kàn sí ọ.",
    ig: "Otú ndị ọrụ ibe gị na ụlọ ọrụ ndị gị na ha na-arụ ọrụ si hụ gị, na ebe anyị ga-akpọtụrụ gị.",
    fr: "Ce que vos collègues et les agences avec lesquelles vous travaillez voient de vous, et où nous vous joignons.",
    pt: "Como os seus colegas e as agências com quem trabalha o veem, e onde falamos consigo.",
    sw: "Jinsi wenzako na mashirika unayofanya nayo kazi wanavyokuona, na mahali tunapokufikia.",
    ar: "كيف يراك زملاؤك والوكالات التي تعمل معها، وأين نصل إليك.",
    tw: "Sɛdeɛ w'adwumayɛfoɔ ne adwumakuo a wo ne wɔn yɛ adwuma hunu wo, ne baabi a yɛbɛfa so aka asɛm akyerɛ wo.",
    zu: "Indlela ozakwenu nezinkampani osebenza nazo abakubona ngayo, nalapho sikuthola khona.",
  },
  detailsLabel: {
    en: "Your details",
    ha: "Bayananka",
    yo: "Àwọn àlàyé rẹ",
    ig: "Nkọwa gị",
    fr: "Vos coordonnées",
    pt: "Os seus dados",
    sw: "Maelezo yako",
    ar: "بياناتك",
    tw: "Wo ho nsɛm",
    zu: "Imininingwane yakho",
  },
};
