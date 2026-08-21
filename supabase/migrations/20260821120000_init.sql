-- ============================================================
-- TOPLANCE — initial schema
--
-- The spine of the product is document completion: it drives the
-- traveller's next action, the reviewer's queue order, the employer's
-- progress view, and the handoff at 100%.
--
-- The privacy boundary is enforced here, not in the UI. An employer
-- can read an application's progress and status; there is no policy
-- anywhere that grants an org member SELECT on `documents`.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type app_role as enum ('traveler', 'org_member', 'staff');
create type staff_role as enum ('reviewer', 'owner');
create type org_role as enum ('hr_admin', 'owner');

-- Locked status model. Colour mapping lives in the design system:
-- submitted → info · under_review → warning · approved → success
-- rejected → danger · additional_docs → neutral · collecting → brand
create type application_status as enum (
  'draft',
  'collecting_documents',
  'submitted',
  'under_review',
  'additional_documents',
  'approved',
  'rejected'
);

create type document_state as enum (
  'not_started',
  'uploaded',
  'checking',
  'verified',
  'flagged',
  'failed'
);

create type travel_purpose as enum ('tourism', 'work', 'study', 'medical', 'relocation');
create type invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- ---------- profiles ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  country_iso text not null default 'ng',
  locale text not null default 'en' check (locale in ('en', 'ha', 'yo', 'ig')),
  role app_role not null default 'traveler',
  staff_role staff_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_role_only_for_staff
    check (staff_role is null or role = 'staff')
);

comment on column profiles.locale is
  'English is official in Nigeria but a second language for many. The whole traveller surface localises to Hausa, Yoruba and Igbo.';

-- ---------- organisations ----------
create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  seats_purchased int not null default 0 check (seats_purchased >= 0),
  billing_contact text,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references organisations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role org_role not null default 'hr_admin',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  job_title text,
  destination_iso text,
  purpose travel_purpose,
  status invitation_status not null default 'pending',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index invitations_org_idx on invitations (org_id, status);

-- ---------- the requirements engine ----------
-- A corridor is one nationality → one destination → one purpose.
-- Rule sets are versioned: when a mission changes what it wants,
-- everyone on that corridor sees the change with its effective date.
create table corridors (
  id uuid primary key default gen_random_uuid(),
  nationality_iso text not null,
  destination_iso text not null,
  purpose travel_purpose not null,
  visa_name text not null,
  version int not null default 1,
  effective_from date not null default current_date,
  source_name text,
  source_url text,
  processing_weeks_min int,
  processing_weeks_max int,
  government_fee_minor bigint,
  government_fee_currency text default 'NGN',
  is_live boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nationality_iso, destination_iso, purpose, version)
);

create table corridor_requirements (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid not null references corridors (id) on delete cascade,
  doc_key text not null,
  name text not null,
  description text,
  category text not null default 'identity',
  is_required boolean not null default true,
  sort_order int not null default 0,
  unique (corridor_id, doc_key)
);

-- ---------- applications ----------
create table applications (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null unique
    default 'TPL-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
  traveler_id uuid not null references profiles (id) on delete cascade,
  org_id uuid references organisations (id) on delete set null,
  corridor_id uuid references corridors (id) on delete set null,
  status application_status not null default 'draft',
  assignee_id uuid references profiles (id) on delete set null,
  intake_complete boolean not null default false,
  submitted_at timestamptz,
  decided_at timestamptz,
  sla_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_traveler_idx on applications (traveler_id);
create index applications_org_idx on applications (org_id);
create index applications_status_idx on applications (status, sla_due_at);

-- The intake conversation, one row per answered topic. Answers stay
-- editable: re-answering supersedes and rebuilds the checklist.
create table intake_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  question_key text not null,
  value text not null,
  answered_at timestamptz not null default now(),
  unique (application_id, question_key)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  doc_key text not null,
  name text not null,
  state document_state not null default 'not_started',
  storage_path text,
  reason text,
  attempts int not null default 0,
  is_required boolean not null default true,
  sort_order int not null default 0,
  checked_at timestamptz,
  verified_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, doc_key)
);

create index documents_application_idx on documents (application_id, state);

comment on table documents is
  'No policy on this table grants access to org members. That is the privacy boundary: an employer sees progress, never a passport.';

create table messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  sender_id uuid references profiles (id) on delete set null,
  sender_role app_role not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_application_idx on messages (application_id, created_at);

-- Every status change carries a message to the traveller. Enforced in
-- the service layer and recorded here for the audit trail.
create table status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  from_status application_status,
  to_status application_status not null,
  message text,
  actor_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table itineraries (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references applications (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_subject_idx on audit_log (subject_type, subject_id, created_at desc);

-- ---------- completion score ----------
-- One definition of "percent complete", used by every persona.
create or replace function application_completion(app_id uuid)
returns table (total int, verified int, pct int)
language sql
stable
as $$
  select
    count(*)::int as total,
    count(*) filter (where state = 'verified')::int as verified,
    coalesce(
      round(
        100.0 * count(*) filter (where state = 'verified') / nullif(count(*), 0)
      )::int,
      0
    ) as pct
  from documents
  where application_id = app_id and is_required;
$$;

-- ---------- helpers (security definer, to keep RLS non-recursive) ----------
create or replace function auth_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select staff_role from profiles where id = auth.uid();
$$;

create or replace function auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from org_members where user_id = auth.uid();
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'staff' from profiles where id = auth.uid()), false);
$$;

-- ---------- new user → profile ----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, country_iso, locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'country_iso', 'ng'),
    coalesce(new.raw_user_meta_data ->> 'locale', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ---------- updated_at ----------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger applications_touch before update on applications
  for each row execute function touch_updated_at();
create trigger documents_touch before update on documents
  for each row execute function touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table organisations enable row level security;
alter table org_members enable row level security;
alter table invitations enable row level security;
alter table corridors enable row level security;
alter table corridor_requirements enable row level security;
alter table applications enable row level security;
alter table intake_answers enable row level security;
alter table documents enable row level security;
alter table messages enable row level security;
alter table status_events enable row level security;
alter table itineraries enable row level security;
alter table audit_log enable row level security;

-- profiles
create policy "read own profile" on profiles
  for select using (id = auth.uid());
create policy "staff read all profiles" on profiles
  for select using (is_staff());
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- organisations
create policy "members read their org" on organisations
  for select using (id in (select auth_org_ids()));
create policy "staff read orgs" on organisations
  for select using (is_staff());

create policy "members read org roster" on org_members
  for select using (org_id in (select auth_org_ids()));

-- invitations
create policy "org admins manage invitations" on invitations
  for all using (org_id in (select auth_org_ids()))
  with check (org_id in (select auth_org_ids()));

-- corridors are public reference data; only owners may write
create policy "anyone signed in reads corridors" on corridors
  for select using (auth.uid() is not null);
create policy "anyone signed in reads requirements" on corridor_requirements
  for select using (auth.uid() is not null);
create policy "owners write corridors" on corridors
  for all using (auth_staff_role() = 'owner')
  with check (auth_staff_role() = 'owner');
create policy "owners write requirements" on corridor_requirements
  for all using (auth_staff_role() = 'owner')
  with check (auth_staff_role() = 'owner');

-- applications
create policy "travellers read own applications" on applications
  for select using (traveler_id = auth.uid());
create policy "travellers update own draft" on applications
  for update using (traveler_id = auth.uid())
  with check (traveler_id = auth.uid());
create policy "travellers create own applications" on applications
  for insert with check (traveler_id = auth.uid());
create policy "org members read sponsored applications" on applications
  for select using (org_id in (select auth_org_ids()));
create policy "staff read all applications" on applications
  for select using (is_staff());
create policy "staff update applications" on applications
  for update using (is_staff()) with check (is_staff());

-- intake answers — traveller and staff only
create policy "travellers manage own answers" on intake_answers
  for all using (
    application_id in (select id from applications where traveler_id = auth.uid())
  )
  with check (
    application_id in (select id from applications where traveler_id = auth.uid())
  );
create policy "staff read answers" on intake_answers
  for select using (is_staff());

-- documents — the privacy boundary.
-- Traveller: full access to their own. Staff: read and review.
-- Org members: deliberately absent. Do not add one.
create policy "travellers manage own documents" on documents
  for all using (
    application_id in (select id from applications where traveler_id = auth.uid())
  )
  with check (
    application_id in (select id from applications where traveler_id = auth.uid())
  );
create policy "staff read documents" on documents
  for select using (is_staff());
create policy "staff review documents" on documents
  for update using (is_staff()) with check (is_staff());

-- messages
create policy "participants read messages" on messages
  for select using (
    application_id in (select id from applications where traveler_id = auth.uid())
    or is_staff()
  );
create policy "participants write messages" on messages
  for insert with check (
    sender_id = auth.uid()
    and (
      application_id in (select id from applications where traveler_id = auth.uid())
      or is_staff()
    )
  );

-- status events
create policy "participants read status events" on status_events
  for select using (
    application_id in (select id from applications where traveler_id = auth.uid())
    or application_id in (select id from applications where org_id in (select auth_org_ids()))
    or is_staff()
  );
create policy "staff write status events" on status_events
  for insert with check (is_staff());

-- itineraries
create policy "travellers read own itinerary" on itineraries
  for select using (
    application_id in (select id from applications where traveler_id = auth.uid())
  );
create policy "staff read itineraries" on itineraries
  for select using (is_staff());

-- audit log — staff read, nobody updates
create policy "staff read audit" on audit_log
  for select using (is_staff());

-- ---------- the employer's view: progress, never documents ----------
-- security_invoker means the caller's own policies on `applications`
-- still apply, so an org member sees only their org's rows — and the
-- view exposes no column that could leak a document.
create or replace view org_application_progress
with (security_invoker = true)
as
select
  a.id,
  a.case_ref,
  a.org_id,
  p.full_name,
  p.email,
  a.status,
  c.destination_iso,
  c.visa_name,
  a.submitted_at,
  a.updated_at,
  comp.total as documents_total,
  comp.verified as documents_verified,
  comp.pct as completion_pct
from applications a
join profiles p on p.id = a.traveler_id
left join corridors c on c.id = a.corridor_id
cross join lateral application_completion(a.id) comp;

comment on view org_application_progress is
  'Everything an employer is allowed to see about a sponsored application. Adding a column that reveals document contents would break the promise made on the marketing site and in the console.';

-- ---------- storage ----------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Objects are stored under {application_id}/{doc_key}/{filename}.
create policy "travellers manage own document files" on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from applications where traveler_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from applications where traveler_id = auth.uid()
    )
  );

create policy "staff read document files" on storage.objects
  for select using (bucket_id = 'documents' and is_staff());
