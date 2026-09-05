import type { Locale } from "@/lib/i18n/locales";

type L = Record<Locale, string>;

/**
 * The one screen `/go` renders itself — for a session with no profile
 * row, since anyone with a role is redirected before this ever paints.
 * A Server Component, resolved with `getLocale()`.
 *
 * NEEDS NATIVE REVIEW before launch — translated in-house from the
 * English, like `HERO` before it.
 */
export const GO_PAGE: { tag: L; title: L; body: L; signOut: L } = {
  tag: {
    en: "Account",
    ha: "Asusu",
    yo: "Àkọọ́lẹ̀",
    ig: "Akaụntụ",
    fr: "Compte",
    pt: "Conta",
    sw: "Akaunti",
    ar: "الحساب",
    tw: "Akaunt",
    zu: "I-akhawunti",
  },
  title: {
    en: "This sign-in has no Toplance account",
    ha: "Wannan shigar bata da asusun Toplance",
    yo: "Ìwọlé yìí kò ní àkọọ́lẹ̀ Toplance",
    ig: "Nbanye a enweghị akaụntụ Toplance",
    fr: "Cette connexion n'a aucun compte Toplance",
    pt: "Este início de sessão não tem uma conta Toplance",
    sw: "Kuingia huku hakuna akaunti ya Toplance",
    ar: "لا يوجد حساب Toplance مرتبط بتسجيل الدخول هذا",
    tw: "Saa hyɛn mu yi nni Toplance akaunt",
    zu: "Lokhu kungena akunayo i-akhawunti ye-Toplance",
  },
  body: {
    en: "You are signed in, but nothing here belongs to this address. Toplance accounts are created from an invitation — open the link the organisation sponsoring you sent, or sign out and try the address they invited.",
    ha: "Kana ciki, amma babu abin da ke nan da ya shafi wannan adireshin. Ana ƙirƙiro asusun Toplance ne ta hanyar gayyata — buɗe hanyar haɗin da ƙungiyar da ke ɗaukar nauyinka ta aiko, ko ka fita ka gwada adireshin da suka gayyata.",
    yo: "O ti wọlé, ṣùgbọ́n kò sí ohunkóhun níbí tí ó jẹ́ ti àdírẹ́sì yìí. Wọ́n ń dá àwọn àkọọ́lẹ̀ Toplance sílẹ̀ láti inú ìpè — ṣí ìjápọ̀ tí àjọ tí ń ṣàrànṣe rẹ fi ránṣẹ́, tàbí kí o jáde kí o sì gbìyànjú àdírẹ́sì tí wọ́n pè.",
    ig: "Ị banyela, mana ọ dịghị ihe dị ebe a bụ nke adreesị a. A na-emepụta akaụntụ Toplance site na òkù — meghee njikọ ụlọ ọrụ na-akwado gị zitere, ma ọ bụ pụọ ma nwaa adreesị ha kpọrọ.",
    fr: "Vous êtes connecté, mais rien ici n'appartient à cette adresse. Les comptes Toplance sont créés à partir d'une invitation — ouvrez le lien envoyé par l'organisation qui vous parraine, ou déconnectez-vous et essayez l'adresse qu'elle a invitée.",
    pt: "Tem sessão iniciada, mas nada aqui pertence a este endereço. As contas Toplance são criadas a partir de um convite — abra a ligação que a organização que o patrocina enviou, ou termine sessão e experimente o endereço que convidaram.",
    sw: "Umeingia, lakini hakuna kitu hapa kinachomilikiwa na anwani hii. Akaunti za Toplance huundwa kutoka kwa mwaliko — fungua kiungo shirika linalokufadhili lilichokutumia, au toka na ujaribu anwani waliyoialika.",
    ar: "لقد سجلت دخولك، لكن لا شيء هنا يخص هذا العنوان. تُنشأ حسابات Toplance عبر دعوة — افتح الرابط الذي أرسلته المؤسسة الراعية لك، أو سجّل الخروج وجرّب العنوان الذي دعته.",
    tw: "Woahyɛn mu, nanso biribiara nni ha a ɛyɛ saa address yi dea. Wɔyɛ Toplance akaunt denam nsakraeɛ so — bue link a kuo a ɛhwɛ wo so no soma no, anaa fi adi na sɔ address a wɔto no nsa frɛeɛ no hwɛ.",
    zu: "Ungenile, kodwa akukho lutho lapha oluphathelene naleli khelo. Ama-akhawunti e-Toplance enziwa ngokumenywa — vula isixhumanisi inhlangano ekuxhasayo ekuthumele sona, noma uphume uzame ikheli abalimemile.",
  },
  signOut: {
    en: "Sign out",
    ha: "Fita",
    yo: "Jáde",
    ig: "Pụọ",
    fr: "Se déconnecter",
    pt: "Terminar sessão",
    sw: "Toka",
    ar: "تسجيل الخروج",
    tw: "Fi adi",
    zu: "Phuma",
  },
};
