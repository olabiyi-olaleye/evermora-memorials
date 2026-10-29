-- Evermora — Phase 2 data foundation
-- 0004 · profiles
--
-- Identity model (§5):
--   auth.users  ->  profiles  ->  memorial_memberships  ->  memorials
--
-- `profiles` is Evermora's application-level view of a person. It never stores
-- credentials — Supabase Auth owns those. profiles.id IS auth.users.id.

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  full_name     text,
  avatar_url    text,
  phone         text,
  locale        text not null default 'en',
  timezone      text not null default 'UTC',
  -- Platform-operations flag. This is NOT a memorial role; it gates the
  -- internal admin surface and platform-wide RLS policies.
  is_platform_admin boolean not null default false,
  marketing_opt_in  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint profiles_display_name_len check (char_length(display_name) between 1 and 120)
);

comment on table profiles is
  'Evermora application-level user record. 1:1 with auth.users; holds no credentials.';
comment on column profiles.is_platform_admin is
  'Platform staff flag. Distinct from memorial roles. Only settable by service_role / another platform admin.';

create index profiles_is_platform_admin_idx on profiles (id) where is_platform_admin;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- handle_new_user — create a profile row whenever Supabase Auth creates a user.
-- ---------------------------------------------------------------------------
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  insert into public.profiles (id, display_name, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
