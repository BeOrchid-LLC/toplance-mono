import type { Locale } from "@/lib/i18n/locales";

export type IntakeQuestion = {
  key: string;
  prompt: Record<Locale, string>;
  /**
   * A chip may carry `{fullName}` in its value and its labels, which
   * `resolveChips` fills in from the profile before either agent renders
   * it. Only the passport question needs it, and it needs it in the
   * value as well as the label: the scripted flow stores `chip.value`
   * verbatim, so a literal token would become the answer of record.
   */
  chips: { value: string; label: Record<Locale, string> }[];
  /** Free text is allowed on every question; chips are only a shortcut. */
  allowsFreeText?: boolean;
};

/** The one placeholder a chip may carry. See `resolveChips`. */
const FULL_NAME_TOKEN = "{fullName}";

const c = (
  value: string,
  en: string,
  ha: string,
  yo: string,
  ig: string
): IntakeQuestion["chips"][number] => ({
  value,
  label: { en, ha, yo, ig },
});

/**
 * Eleven topics, asked one at a time. Every answer stays editable:
 * reopening one truncates the conversation at that point, clears what
 * followed, and rebuilds the checklist — so a mis-tapped chip never
 * flows silently into the requirements.
 */
export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    /**
     * Sign-up already captured a name, so this asks the only question
     * that name cannot answer: is it the one the passport carries? A
     * visa is issued to the passport's spelling, and the two diverging
     * is a refusal nobody sees coming — which is why the answer is
     * stored beside the account name rather than merged into it.
     */
    key: "passport_name",
    prompt: {
      en: "First — what is your full name, exactly as it appears on your passport?",
      ha: "Da farko — mene ne cikakken sunanka, kamar yadda yake a fasfo ɗinka?",
      yo: "Àkọ́kọ́ — kí ni orúkọ rẹ ní kíkún, gẹ́gẹ́ bí ó ṣe wà nínú ìwé ìrìnnà rẹ?",
      ig: "Nke mbụ — gịnị bụ aha gị zuru ezu, dịka o si dị na paspọtụ gị?",
    },
    chips: [
      c(
        FULL_NAME_TOKEN,
        `Yes — ${FULL_NAME_TOKEN}`,
        `Eh — ${FULL_NAME_TOKEN}`,
        `Bẹ́ẹ̀ ni — ${FULL_NAME_TOKEN}`,
        `Ee — ${FULL_NAME_TOKEN}`
      ),
    ],
  },
  {
    key: "nationality",
    prompt: {
      en: "Which country's passport do you hold?",
      ha: "Fasfo na wace ƙasa kake da shi?",
      yo: "Ìwé ìrìnnà orílẹ̀-èdè wo ni o ní?",
      ig: "Paspọtụ obodo ole ka i ji?",
    },
    chips: [
      c("Nigeria", "Nigeria", "Najeriya", "Nàìjíríà", "Naịjirịa"),
      c("Ghana", "Ghana", "Gana", "Gánà", "Ghana"),
      c("Kenya", "Kenya", "Kenya", "Kẹ́nyà", "Kenya"),
      c("South Africa", "South Africa", "Afirka ta Kudu", "Gúúsù Áfríkà", "South Africa"),
      c("Cameroon", "Cameroon", "Kamaru", "Kamerúùnù", "Cameroon"),
    ],
  },
  {
    /**
     * The country, asked before the city. Nationality is not a
     * substitute: a mission's jurisdiction follows where the traveller
     * applies *from*, and a Nigerian passport holder living in Accra
     * applies in Ghana. Recorded and displayed today; the corridor
     * still resolves on nationality, destination and purpose alone.
     */
    key: "residence_country",
    prompt: {
      en: "And which country are you living in right now?",
      ha: "Kuma a wace ƙasa kake zaune yanzu?",
      yo: "Orílẹ̀-èdè wo ni o ń gbé báyìí?",
      ig: "Kedu mba ị bi ugbu a?",
    },
    chips: [
      c("Nigeria", "Nigeria", "Najeriya", "Nàìjíríà", "Naịjirịa"),
      c("Ghana", "Ghana", "Gana", "Gánà", "Ghana"),
      c("Kenya", "Kenya", "Kenya", "Kẹ́nyà", "Kenya"),
      c("South Africa", "South Africa", "Afirka ta Kudu", "Gúúsù Áfríkà", "South Africa"),
      c("Cameroon", "Cameroon", "Kamaru", "Kamerúùnù", "Cameroon"),
    ],
  },
  {
    key: "residence",
    prompt: {
      en: "And which city or town are you in?",
      ha: "Kuma a ina kake zaune yanzu?",
      yo: "Ibo ni o ń gbé báyìí?",
      ig: "Ebee ka ị bi ugbu a?",
    },
    chips: [
      c("Lagos", "Lagos", "Legas", "Èkó", "Lagos"),
      c("Abuja", "Abuja", "Abuja", "Àbùjá", "Abuja"),
      c("Port Harcourt", "Port Harcourt", "Fatakwal", "Pọ́ọ̀tì Hákọ́tì", "Pọtakọt"),
      c("Kano", "Kano", "Kano", "Kánò", "Kano"),
      c("Ibadan", "Ibadan", "Ibadan", "Ìbàdàn", "Ibadan"),
    ],
  },
  {
    key: "destination",
    prompt: {
      en: "Where are you hoping to travel?",
      ha: "Ina kake son tafiya?",
      yo: "Ibo ni o fẹ́ rìn lọ?",
      ig: "Ebee ka ị chọrọ ịga?",
    },
    chips: [
      c("United Kingdom", "United Kingdom", "Birtaniya", "Ilẹ̀ Gẹ̀ẹ́sì", "United Kingdom"),
      c("Canada", "Canada", "Kanada", "Kánádà", "Canada"),
      c("United Arab Emirates", "UAE", "Hadaddiyar Daular Larabawa", "UAE", "UAE"),
      c("Germany", "Germany", "Jamus", "Jámánì", "Germany"),
      c("United States", "United States", "Amurka", "Amẹ́ríkà", "United States"),
    ],
  },
  {
    key: "purpose",
    prompt: {
      en: "What is taking you there — tourism, work, study, medical treatment, or are you relocating?",
      ha: "Me zai kai ka can — yawon buɗe ido, aiki, karatu, magani, ko ƙaura?",
      yo: "Kí ni ń mú ọ lọ síbẹ̀ — ìrìn-àjò, iṣẹ́, ẹ̀kọ́, ìtọ́jú, tàbí ìṣílọ?",
      ig: "Gịnị na-akpọga gị ebe ahụ — njem nlegharị anya, ọrụ, agụmakwụkwọ, ọgwụgwọ, ka ọ bụ ịkwaga?",
    },
    chips: [
      c("Work", "Work", "Aiki", "Iṣẹ́", "Ọrụ"),
      c("Study", "Study", "Karatu", "Ẹ̀kọ́", "Agụmakwụkwọ"),
      c("Tourism", "Tourism", "Yawon buɗe ido", "Ìrìn-àjò", "Njem nlegharị anya"),
      c("Medical", "Medical treatment", "Magani", "Ìtọ́jú", "Ọgwụgwọ"),
      c("Relocation", "Relocating", "Ƙaura", "Ìṣílọ", "Ịkwaga"),
    ],
  },
  {
    key: "dates",
    prompt: {
      en: "Roughly when do you plan to travel?",
      ha: "Kusan yaushe kake shirin tafiya?",
      yo: "Nígbà wo ni o gbèrò láti rìn?",
      ig: "Kedu mgbe ị na-eme atụmatụ ịga?",
    },
    chips: [
      c("Within a month", "Within a month", "Cikin wata ɗaya", "Láàrin oṣù kan", "N'ime otu ọnwa"),
      c("In 2–3 months", "In 2–3 months", "Cikin wata 2–3", "Ní oṣù 2–3", "N'ime ọnwa 2–3"),
      c("In 4–6 months", "In 4–6 months", "Cikin wata 4–6", "Ní oṣù 4–6", "N'ime ọnwa 4–6"),
      c("Not decided yet", "Not decided yet", "Ban yanke shawara ba", "Kò tíì pinnu", "Ekpebibeghị"),
    ],
  },
  {
    key: "budget",
    prompt: {
      en: "What budget are you working with for the move itself — flights, fees, the first month?",
      ha: "Wane kuɗi kake da shi don ƙaurar — tikitin jirgi, kuɗaɗe, watan farko?",
      yo: "Ìnáwó wo ni o ní fún ìṣílọ náà — ọkọ̀ òfúrufú, owó, oṣù àkọ́kọ́?",
      ig: "Ego ole ka i nwere maka mbugharị ahụ — ụgbọelu, ụgwọ, ọnwa mbụ?",
    },
    chips: [
      c("Under ₦2 million", "Under ₦2 million", "Ƙasa da ₦2m", "Kéré sí ₦2m", "N'okpuru ₦2m"),
      c("₦2–4 million", "₦2–4 million", "₦2–4m", "₦2–4m", "₦2–4m"),
      c("₦4–8 million", "₦4–8 million", "₦4–8m", "₦4–8m", "₦4–8m"),
      c("Over ₦8 million", "Over ₦8 million", "Sama da ₦8m", "Ju ₦8m lọ", "Karịa ₦8m"),
      c("Not sure yet", "Not sure yet", "Ban tabbata ba", "Kò dá mi lójú", "Amabeghị m"),
    ],
  },
  {
    key: "accommodation",
    prompt: {
      en: "Where will you stay when you arrive?",
      ha: "Ina za ka sauka idan ka isa?",
      yo: "Ibo ni wàá gbé nígbà tí o bá dé?",
      ig: "Ebee ka ị ga-ebi mgbe ị rutere?",
    },
    chips: [
      c("Long-term rental", "Long-term rental", "Haya na dogon lokaci", "Ìyàlégbé gígùn", "Mgbazinye ogologo oge"),
      c("With family or friends", "With family or friends", "Da dangi ko abokai", "Pẹ̀lú ẹbí tàbí ọ̀rẹ́", "Ya na ezinụlọ ma ọ bụ ndị enyi"),
      c("Employer housing", "Employer housing", "Gidan ma'aikata", "Ilé agbanisíṣẹ́", "Ụlọ onye ọrụ"),
      c("Hotel at first", "Hotel at first", "Otal da farko", "Hotẹ́ẹ̀lì lákọ̀ọ́kọ́", "Họtel na mbụ"),
      c("Student housing", "Student housing", "Gidan ɗalibai", "Ilé akẹ́kọ̀ọ́", "Ụlọ ụmụ akwụkwọ"),
    ],
  },
  {
    key: "companions",
    prompt: {
      en: "Who is coming with you?",
      ha: "Wa zai zo tare da kai?",
      yo: "Ta ni yóò bá ọ lọ?",
      ig: "Onye na-eso gị?",
    },
    chips: [
      c("Just me", "Just me", "Ni kaɗai", "Èmi nìkan", "Naanị m"),
      c("Partner", "My partner", "Abokin zama", "Alábàáṣepọ̀ mi", "Onye ibe m"),
      c("Partner and children", "Partner and children", "Abokin zama da yara", "Alábàáṣepọ̀ àti ọmọ", "Onye ibe m na ụmụ"),
      c("Children", "My children", "Yara", "Àwọn ọmọ mi", "Ụmụ m"),
    ],
  },
  {
    key: "needs",
    prompt: {
      en: "Anything we should plan around — food, health, or getting around?",
      ha: "Akwai wani abu da ya kamata mu tsara — abinci, lafiya, ko zirga-zirga?",
      yo: "Ǹjẹ́ ohunkóhun wà tí a gbọ́dọ̀ gbèrò fún — oúnjẹ, ìlera, tàbí ìrìnkèrindò?",
      ig: "Enwere ihe anyị kwesịrị ịtụ atụmatụ maka ya — nri, ahụike, ma ọ bụ njem?",
    },
    chips: [
      c("Halal food", "Halal food", "Abinci halal", "Oúnjẹ halal", "Nri halal"),
      c("Prayer facilities", "Prayer facilities", "Wurin sallah", "Ibi àdúrà", "Ebe ekpere"),
      c("A medical condition", "A medical condition", "Yanayin lafiya", "Ipò ìlera", "Ọnọdụ ahụike"),
      c("Step-free access", "Step-free access", "Hanya mara matakala", "Ọ̀nà aláìní àtẹ̀gùn", "Ụzọ enweghị steepụ"),
      c("Nothing in particular", "Nothing in particular", "Babu wani abu", "Kò sí nǹkan pàtàkì", "Ọ dịghị ihe pụrụ iche"),
    ],
  },
  {
    key: "history",
    prompt: {
      en: "Last one — have you been refused a visa for anywhere before?",
      ha: "Na ƙarshe — an taɓa hana ka biza a wani wuri?",
      yo: "Ìkẹyìn — ṣé wọ́n kọ fisa fún ọ rí níbìkíbi?",
      ig: "Nke ikpeazụ — ajụla gị visa ebe ọ bụla mbụ?",
    },
    chips: [
      c("No", "No, never", "A'a, bai taɓa faruwa ba", "Rárá, kò rí bẹ́ẹ̀ rí", "Mba, ọ dịtụbeghị"),
      c("Yes — I was refused once", "Yes, once", "Eh, sau ɗaya", "Bẹ́ẹ̀ ni, ẹ̀ẹ̀kan", "Ee, otu ugboro"),
      c("Yes — more than once", "Yes, more than once", "Eh, fiye da sau ɗaya", "Bẹ́ẹ̀ ni, ju ẹ̀ẹ̀kan lọ", "Ee, karịa otu ugboro"),
      c("I would rather explain", "I would rather explain", "Zan fi son bayyanawa", "Mo fẹ́ ṣàlàyé", "Ọ ka mma ka m kọwaa"),
    ],
    allowsFreeText: true,
  },
];

/**
 * A refusal is never hidden and never held against the applicant here —
 * declaring it is what keeps the eventual application truthful.
 */
export const HISTORY_NOTE =
  "A previous refusal must be declared. Hiding one is the single fastest way to lose the next application.";

/**
 * A question's chips with the traveller's own name filled in.
 *
 * Only the passport question carries a placeholder, and it carries it in
 * the value as well as the labels because the two agents read different
 * halves of a chip: the scripted flow stores `chip.value` as the answer
 * of record, while the model-driven one sends the translated label as
 * though the traveller had typed it. A literal `{fullName}` reaching
 * either is a name nobody has.
 *
 * A blank name yields no chip at all rather than one reading "Yes — ",
 * which confirms nothing. Free text answers the question in that case,
 * as it does for every question here.
 */
export function resolveChips(
  question: IntakeQuestion,
  { fullName }: { fullName: string }
): IntakeQuestion["chips"] {
  const name = fullName.trim();

  return question.chips.flatMap((chip) => {
    if (!chip.value.includes(FULL_NAME_TOKEN)) return [chip];
    if (!name) return [];

    return [
      {
        value: chip.value.replaceAll(FULL_NAME_TOKEN, name),
        label: Object.fromEntries(
          Object.entries(chip.label).map(([locale, text]) => [
            locale,
            text.replaceAll(FULL_NAME_TOKEN, name),
          ])
        ) as Record<Locale, string>,
      },
    ];
  });
}

/**
 * Everything the intake knows up to, but not including, one topic — the
 * shadow of what `recordIntakeAnswer` does in the database when an
 * earlier question is answered again.
 *
 * Shared rather than kept beside one screen because three callers need
 * the same shadow: the scripted transcript, the model-driven rail, and
 * the voice hook, which has to know what is still unanswered before it
 * can tell the model what to ask next. A second copy of this rule is a
 * rail that disagrees with the checklist.
 */
export function truncateAnswersAt(
  answers: Record<string, string>,
  key: string
): Record<string, string> {
  const index = INTAKE_QUESTIONS.findIndex((q) => q.key === key);
  // A key the intake does not ask is what `recordIntakeAnswer` refuses
  // outright, so the shadow of it is nothing happening. Spelled out
  // because `slice(0, -1)` would otherwise quietly drop the last answer.
  if (index === -1) return { ...answers };

  const next: Record<string, string> = {};
  INTAKE_QUESTIONS.slice(0, index).forEach((q) => {
    if (answers[q.key]) next[q.key] = answers[q.key];
  });
  return next;
}

/**
 * Where the conversation is: the position of the first unanswered topic,
 * or `INTAKE_QUESTIONS.length` once every one is answered.
 *
 * The first *gap*, never a tally of what is filled. Truncation only ever
 * clears answers *after* the one being written — it does not fill in the
 * ones before it — so a topic recorded out of order leaves a hole, and
 * the answers are no longer a prefix of the question order. Both agents
 * ask at the gap. A screen that counted instead would sit one question
 * past it for every hole, asking about residence under a question about
 * nationality; the scripted flow would then file the reply under the
 * wrong key outright.
 *
 * So it is defined once, here, and everything that needs to know which
 * question is live reads it from this function.
 */
export function intakeFrontier(answers: Record<string, string>): number {
  const index = INTAKE_QUESTIONS.findIndex((q) => !answers[q.key]);
  return index === -1 ? INTAKE_QUESTIONS.length : index;
}

/** The question the intake should ask next — the one at the frontier. */
export function nextIntakeQuestion(
  answers: Record<string, string>
): IntakeQuestion | undefined {
  return INTAKE_QUESTIONS[intakeFrontier(answers)];
}

/** One answer being recorded — by whichever agent was listening. */
export type IntakeWrite = { key: string; value: string };

/**
 * A spoken answer, and where in the typed conversation it happened.
 *
 * `afterWrites` is how many typed answers had been recorded when this
 * one was spoken, which is the only thing that puts the two streams back
 * in order later — see `orderIntakeWrites`.
 */
export type SpokenIntakeWrite = IntakeWrite & { afterWrites: number };

/**
 * Put the typed and the spoken answers back into the order they were
 * actually recorded in.
 *
 * The screen has two writers. Typed answers can be read back off the
 * chat transcript in order; a spoken one leaves no message behind, so it
 * is kept separately — and simply replaying the separate list last is
 * wrong in a way that loses data. Speak five answers, stop, type the
 * sixth, and a spoken replay tacked onto the end truncates back to
 * answer one and re-applies one to five, silently dropping the sixth:
 * the rail walks backwards, the agent re-asks a question already
 * answered, and an intake the database considers finished never reports
 * itself finished on screen.
 *
 * So each spoken answer remembers how much typing preceded it, and this
 * splices the two streams by that marker. Both are replayed in true
 * order, and the later answer wins because it is genuinely later.
 */
export function orderIntakeWrites(
  typed: IntakeWrite[],
  spoken: SpokenIntakeWrite[]
): IntakeWrite[] {
  const ordered: IntakeWrite[] = [];
  let next = 0;

  for (let i = 0; i < typed.length; i++) {
    while (next < spoken.length && spoken[next].afterWrites <= i) {
      ordered.push(spoken[next++]);
    }
    ordered.push(typed[i]);
  }

  while (next < spoken.length) ordered.push(spoken[next++]);

  return ordered;
}

/**
 * Replay a run of answers over what was already known, truncating at
 * each one the way the database does.
 *
 * Idempotent over an answer that is already in `base` at the same value,
 * which is what lets the rail survive a refresh: once the server sends
 * back a record that already contains a spoken answer, replaying that
 * answer again lands on exactly the same rail.
 */
export function applyIntakeWrites(
  base: Record<string, string>,
  writes: IntakeWrite[]
): Record<string, string> {
  let answers = { ...base };

  for (const write of writes) {
    answers = truncateAnswersAt(answers, write.key);
    answers[write.key] = write.value;
  }

  return answers;
}
