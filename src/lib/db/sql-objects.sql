-- ============================================================
-- Functions, triggers and views.
--
-- Drizzle Kit models tables, not these, so this file is hand-written
-- and applied straight after the generated migrations by
-- `npm run db:migrate`.
--
-- It lives here rather than in `drizzle/` on purpose: that directory is
-- generated output and gets deleted whenever the migrations are rebuilt
-- from scratch, which would take this with it.
--
-- Every statement is idempotent — `create or replace`, or guarded by a
-- drop — so re-running is safe.
-- ============================================================

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

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();

drop trigger if exists applications_touch on applications;
create trigger applications_touch before update on applications
  for each row execute function touch_updated_at();

drop trigger if exists documents_touch on documents;
create trigger documents_touch before update on documents
  for each row execute function touch_updated_at();

-- Everything an employer is allowed to see about a sponsored
-- application. It carries no column that could reveal a document.
--
-- The previous version was `security_invoker`, which leaned on row-level
-- security to scope rows to the caller's own organisation. Without RLS
-- that does nothing, so this is a plain projection and the data layer
-- filters by org_id explicitly — see the employer console. Adding a
-- column that reveals document contents would break the promise made on
-- the marketing site and in that console.
create or replace view org_application_progress as
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
