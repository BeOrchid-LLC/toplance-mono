-- ============================================================
-- Clerk owns identity from here on.
--
-- Transitional: this migration lets Clerk sessions address rows in a
-- database that still lives in Supabase. Phase 2 rebuilds the schema on
-- self-hosted Postgres, where `clerk_user_id` becomes the primary key
-- and this file is discarded with the rest of the Supabase project.
--
-- The RLS policies are deliberately left in place. They no longer
-- enforce anything — the app now connects with the service role, which
-- bypasses them — but they remain the reference these rules were
-- transcribed from into src/lib/auth/policy.ts.
-- ============================================================

-- Profiles were created by a trigger on auth.users. Clerk provisions
-- them just in time instead.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- A profile no longer requires a Supabase auth user to exist.
alter table profiles drop constraint if exists profiles_id_fkey;

alter table profiles add column if not exists clerk_user_id text unique;

comment on column profiles.clerk_user_id is
  'Clerk user id (user_...). The platform-wide identity key: every BeOrchid app keys off this, and BeOrchid Core will reference it as core.user_id.';

create index if not exists profiles_clerk_idx on profiles (clerk_user_id);
