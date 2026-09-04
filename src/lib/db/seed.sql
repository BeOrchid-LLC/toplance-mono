-- ============================================================
-- TOPLANCE — seed data
--
-- Corridor rule sets for the Nigerian market. These figures are
-- illustrative and dated: every corridor carries a source name and
-- URL because a checklist nobody can trace is a checklist nobody
-- trusts. Verify against the mission before going live.
-- ============================================================

-- Reference data is replaced wholesale on each run, so seeding twice
-- does not double the corridors. Applications reference a corridor with
-- `on delete set null`, so a re-seed during development detaches a
-- checklist rather than destroying the application behind it.
delete from corridor_requirements;
delete from corridors;

-- ---------- United Kingdom · Skilled Worker ----------
with c as (
  insert into corridors (
    nationality_iso, destination_iso, purpose, visa_name, version, effective_from,
    source_name, source_url, processing_weeks_min, processing_weeks_max,
    government_fee_minor, government_fee_currency
  )
  values (
    'ng', 'gb', 'work', 'Skilled Worker Visa', 1, date '2026-01-15',
    'UK Visas and Immigration', 'https://www.gov.uk/skilled-worker-visa',
    3, 8, 71900, 'GBP'
  )
  returning id
)
insert into corridor_requirements (corridor_id, doc_key, name, description, category, is_required, sort_order)
select c.id, v.doc_key, v.name, v.description, v.category, v.is_required, v.sort_order
from c, (values
  ('passport', 'International passport (bio page)', 'Must be valid for the whole period of stay, with at least one blank page.', 'identity', true, 1),
  ('passport_photos', 'Passport photographs ×2', 'Taken in the last six months, plain light background, no glasses.', 'identity', true, 2),
  ('cos', 'Certificate of Sponsorship', 'Reference number issued by your UK employer. Valid for three months from issue.', 'sponsorship', true, 3),
  ('application_form', 'Completed application form', 'The online form, printed and signed.', 'forms', true, 4),
  ('funds', 'Bank statements — 3 months', 'Three full months, every page showing your name and a closing balance.', 'financial', true, 5),
  ('tb_test', 'Tuberculosis test certificate', 'From a UKVI-approved clinic. Required for Nigerian applicants.', 'health', true, 6),
  ('english_test', 'English language evidence', 'An approved test, or a degree taught in English with a NARIC statement.', 'qualifications', true, 7),
  ('qualifications', 'Degree certificate and transcript', 'Originals plus a photocopy of each.', 'qualifications', true, 8),
  ('employment_letter', 'Employment letter', 'From your current employer, on letterhead, stating role and dates.', 'employment', true, 9),
  ('police_certificate', 'Police character certificate', 'Required for some occupations — check the SOC code for your role.', 'background', false, 10),
  ('travel_history', 'Previous passports', 'If you hold any, including expired ones showing prior travel.', 'background', false, 11),
  ('birth_certificate', 'Birth certificate', 'Or an attestation of birth from the National Population Commission.', 'identity', true, 12),
  ('marriage_certificate', 'Marriage certificate', 'Only if a dependant is travelling with you.', 'dependants', false, 13)
) as v(doc_key, name, description, category, is_required, sort_order);

-- ---------- United Arab Emirates · Employment ----------
with c as (
  insert into corridors (
    nationality_iso, destination_iso, purpose, visa_name, version, effective_from,
    source_name, source_url, processing_weeks_min, processing_weeks_max,
    government_fee_minor, government_fee_currency
  )
  values (
    'ng', 'ae', 'work', 'Employment Entry Permit', 1, date '2026-02-01',
    'UAE Ministry of Human Resources and Emiratisation', 'https://u.ae/en/information-and-services/visa-and-emirates-id',
    2, 5, 110000, 'AED'
  )
  returning id
)
insert into corridor_requirements (corridor_id, doc_key, name, description, category, is_required, sort_order)
select c.id, v.doc_key, v.name, v.description, v.category, v.is_required, v.sort_order
from c, (values
  ('passport', 'International passport (bio page)', 'Minimum six months validity from the date of entry.', 'identity', true, 1),
  ('passport_photos', 'Passport photographs ×2', 'White background, taken in the last six months.', 'identity', true, 2),
  ('offer_letter', 'Attested employment offer', 'Attested by the UAE embassy in Abuja.', 'sponsorship', true, 3),
  ('qualifications', 'Attested degree certificate', 'Attested by the Ministry of Foreign Affairs and the UAE embassy.', 'qualifications', true, 4),
  ('medical', 'Medical fitness certificate', 'Completed after arrival, but booked before travel.', 'health', true, 5),
  ('police_certificate', 'Police character certificate', 'Issued within the last three months.', 'background', true, 6),
  ('birth_certificate', 'Birth certificate', 'Attested if dependants are travelling with you.', 'identity', false, 7),
  ('funds', 'Bank statements — 3 months', 'Three full months with a closing balance on every page.', 'financial', false, 8),
  ('application_form', 'Completed application form', 'Submitted by your sponsoring employer.', 'forms', true, 9)
) as v(doc_key, name, description, category, is_required, sort_order);

-- ---------- Canada · Study permit ----------
with c as (
  insert into corridors (
    nationality_iso, destination_iso, purpose, visa_name, version, effective_from,
    source_name, source_url, processing_weeks_min, processing_weeks_max,
    government_fee_minor, government_fee_currency
  )
  values (
    'ng', 'ca', 'study', 'Study Permit', 1, date '2026-01-20',
    'Immigration, Refugees and Citizenship Canada', 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
    6, 14, 15000, 'CAD'
  )
  returning id
)
insert into corridor_requirements (corridor_id, doc_key, name, description, category, is_required, sort_order)
select c.id, v.doc_key, v.name, v.description, v.category, v.is_required, v.sort_order
from c, (values
  ('passport', 'International passport (bio page)', 'Valid for the full length of your study programme.', 'identity', true, 1),
  ('passport_photos', 'Passport photographs ×2', 'Meeting the IRCC photo specification.', 'identity', true, 2),
  ('loa', 'Letter of acceptance', 'From a designated learning institution, with the DLI number visible.', 'sponsorship', true, 3),
  ('pal', 'Provincial attestation letter', 'Required for most study permit applications since 2024.', 'sponsorship', true, 4),
  ('funds', 'Proof of funds', 'Tuition plus living costs for the first year, held for at least four months.', 'financial', true, 5),
  ('qualifications', 'Academic transcripts', 'From every institution named in your application.', 'qualifications', true, 6),
  ('sop', 'Statement of purpose', 'Why this programme, why Canada, and your plan afterwards.', 'forms', true, 7),
  ('medical', 'Immigration medical exam', 'From an IRCC panel physician in Nigeria.', 'health', true, 8),
  ('police_certificate', 'Police character certificate', 'Issued within the last six months.', 'background', true, 9),
  ('biometrics', 'Biometrics appointment', 'Booked at a visa application centre after you apply.', 'forms', true, 10),
  ('birth_certificate', 'Birth certificate', 'Or an attestation of birth.', 'identity', true, 11),
  ('travel_history', 'Previous passports', 'Including expired ones showing prior travel.', 'background', false, 12),
  ('english_test', 'English language test', 'IELTS or equivalent, if your institution requires one.', 'qualifications', false, 13),
  ('sponsor_letter', 'Sponsor affidavit', 'If someone else is funding your studies.', 'financial', false, 14)
) as v(doc_key, name, description, category, is_required, sort_order);

-- ---------- Germany · Work ----------
with c as (
  insert into corridors (
    nationality_iso, destination_iso, purpose, visa_name, version, effective_from,
    source_name, source_url, processing_weeks_min, processing_weeks_max,
    government_fee_minor, government_fee_currency
  )
  values (
    'ng', 'de', 'work', 'EU Blue Card', 1, date '2026-02-10',
    'German Federal Foreign Office', 'https://www.auswaertiges-amt.de/en/visa-service',
    6, 12, 7500, 'EUR'
  )
  returning id
)
insert into corridor_requirements (corridor_id, doc_key, name, description, category, is_required, sort_order)
select c.id, v.doc_key, v.name, v.description, v.category, v.is_required, v.sort_order
from c, (values
  ('passport', 'International passport (bio page)', 'Issued in the last ten years, valid for at least fifteen months.', 'identity', true, 1),
  ('passport_photos', 'Biometric photographs ×2', 'To the German biometric specification.', 'identity', true, 2),
  ('employment_letter', 'Employment contract', 'Showing a salary above the Blue Card threshold for your field.', 'sponsorship', true, 3),
  ('qualifications', 'Recognised degree certificate', 'Recognition confirmed through the anabin database.', 'qualifications', true, 4),
  ('application_form', 'Completed VIDEX form', 'Printed and signed after completing it online.', 'forms', true, 5),
  ('health_insurance', 'Health insurance confirmation', 'Covering you from your first day in Germany.', 'health', true, 6),
  ('accommodation', 'Proof of accommodation', 'A rental contract or a formal invitation from your host.', 'accommodation', true, 7),
  ('funds', 'Bank statements — 3 months', 'Three full months with a closing balance on every page.', 'financial', false, 8),
  ('birth_certificate', 'Birth certificate', 'With a certified German or English translation.', 'identity', true, 9),
  ('police_certificate', 'Police character certificate', 'Issued within the last six months.', 'background', false, 10)
) as v(doc_key, name, description, category, is_required, sort_order);

-- ---------- a demo organisation ----------
insert into organisations (id, name, domain, seats_purchased, billing_contact)
values (
  '00000000-0000-4000-8000-000000000001',
  'Ajala Logistics',
  'ajalalogistics.com',
  25,
  'accounts@ajalalogistics.com'
)
on conflict (id) do nothing;

-- ---------- the rate card ----------
-- Peace's pricing document, as data. The rates are provisional and are
-- meant to be edited here (or by inserting a later `effective_from` row)
-- rather than in code — `@/lib/domain/pricing` holds the arithmetic and
-- reads whatever this table says. Amounts are minor units: 30000 = $300.
--
-- `bands` is cumulative: the 1st–200th application at $18, the
-- 201st–500th at $15, everything above at $12. Exactly one band carries
-- a null `up_to`, and it must be last.
insert into billing_rate_cards (id, base_fee_minor, currency, bands, effective_from, note)
values (
  '00000000-0000-0000-0000-0000000000b1',
  30000,
  'USD',
  '[{"upTo": 200, "rateMinor": 1800}, {"upTo": 500, "rateMinor": 1500}, {"upTo": null, "rateMinor": 1200}]'::jsonb,
  '2026-01-01T00:00:00Z',
  'Launch rates from ToplancePricingStructure.docx — provisional until supplier costs land.'
)
on conflict (id) do nothing;
