-- Evermora — Phase 2 data foundation
-- 0008 · Reserved slugs + memorial_slugs + slug resolution
--
-- Memorial URL architecture (§6, §7, §10 of the architecture spec):
--   evermora.com/{slug}  ->  canonical slug  ->  memorial id
--   historical aliases keep resolving (301) and are never recycled casually.

-- ---------------------------------------------------------------------------
-- reserved_slugs — platform/marketing/infra words that can never be a slug.
-- Enforced in the DB (this table + the trigger below), not just the UI.
-- ---------------------------------------------------------------------------
create table reserved_slugs (
  slug        citext primary key,
  category    text not null default 'platform',
  note        text,
  created_at  timestamptz not null default now(),
  -- Permissive: also covers framework/infra paths like `_next` that can never
  -- be a valid memorial slug anyway but are worth recording here.
  constraint reserved_slugs_shape check (slug ~ '^[a-z0-9_][a-z0-9_-]*$')
);

comment on table reserved_slugs is 'Root-namespace words unavailable as memorial slugs. Server/DB-enforced.';

insert into reserved_slugs (slug, category, note) values
  -- Marketing / product routes
  ('about','marketing',null), ('contact','marketing',null), ('pricing','marketing',null),
  ('services','marketing',null), ('privacy','marketing',null), ('terms','marketing',null),
  ('support','marketing',null), ('help','marketing',null), ('blog','marketing',null),
  ('faq','marketing',null), ('careers','marketing',null), ('press','marketing',null),
  -- Auth / account
  ('login','auth',null), ('logout','auth',null), ('signup','auth',null), ('signin','auth',null),
  ('register','auth',null), ('auth','auth',null), ('account','auth',null), ('password','auth',null),
  ('verify','auth',null), ('invite','auth',null), ('onboarding','auth',null),
  -- App surfaces
  ('create','app',null), ('new','app',null), ('family','app',null), ('dashboard','app',null),
  ('settings','app',null), ('admin','app',null), ('billing','app',null), ('notifications','app',null),
  ('reports','app',null), ('search','app',null), ('explore','app',null), ('me','app',null),
  -- Platform / infra
  ('api','infra',null), ('status','infra',null), ('security','infra',null), ('health','infra',null),
  ('assets','infra',null), ('static','infra',null), ('public','infra',null), ('cdn','infra',null),
  ('manifest','infra',null), ('robots','infra',null), ('sitemap','infra',null), ('favicon','infra',null),
  ('_next','infra',null), ('__nextjs','infra',null), ('vercel','infra',null), ('well-known','infra',null),
  -- QR / share resolver namespace (see 0009)
  ('qr','infra',null), ('q','infra',null), ('s','infra',null), ('go','infra',null), ('r','infra',null),
  -- Abuse-prone
  ('root','reserved',null), ('null','reserved',null), ('undefined','reserved',null),
  ('evermora','brand',null), ('official','reserved',null), ('team','reserved',null);

-- ---------------------------------------------------------------------------
-- memorial_slugs — canonical slug + historical aliases.
-- ---------------------------------------------------------------------------
create table memorial_slugs (
  id              uuid primary key default extensions.gen_random_uuid(),
  memorial_id     uuid not null references memorials (id) on delete cascade,
  slug            citext not null unique,
  is_canonical    boolean not null default false,
  redirect_enabled boolean not null default true,
  created_at      timestamptz not null default now(),
  retired_at      timestamptz,
  created_by      uuid references profiles (id) on delete set null
);

comment on table memorial_slugs is
  'Every slug a memorial has ever had. Exactly one is_canonical per memorial; the rest are 301 aliases.';

-- Exactly one canonical slug per memorial.
create unique index memorial_slugs_one_canonical
  on memorial_slugs (memorial_id)
  where is_canonical;

create index memorial_slugs_memorial_idx on memorial_slugs (memorial_id);

-- ---------------------------------------------------------------------------
-- Validation trigger: normalize, enforce grammar, block reserved words.
-- ---------------------------------------------------------------------------
create or replace function app.memorial_slugs_validate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  new.slug := app.normalize_slug(new.slug::text)::citext;

  if not app.slug_is_valid(new.slug::text) then
    raise exception 'invalid memorial slug %: must be 3-63 chars, lowercase a-z/0-9/hyphen, not pure-numeric', new.slug
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.reserved_slugs r where r.slug = new.slug) then
    raise exception 'memorial slug % is a reserved platform route', new.slug
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger memorial_slugs_validate
  before insert or update of slug on memorial_slugs
  for each row execute function app.memorial_slugs_validate();

-- Guard: a retired slug can never be re-marked canonical.
create or replace function app.memorial_slugs_guard_retired()
returns trigger
language plpgsql
as $$
begin
  if new.is_canonical and new.retired_at is not null then
    raise exception 'a retired slug cannot be canonical' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger memorial_slugs_guard_retired
  before insert or update on memorial_slugs
  for each row execute function app.memorial_slugs_guard_retired();

-- ---------------------------------------------------------------------------
-- resolve_memorial_slug — public resolver used by apps/web routing.
-- Returns the memorial id + canonical slug + whether the input was an alias.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_memorial_slug(lookup text)
returns table (memorial_id uuid, canonical_slug text, is_alias boolean, redirect_enabled boolean)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  with hit as (
    select ms.memorial_id, ms.slug, ms.is_canonical, ms.redirect_enabled
    from public.memorial_slugs ms
    join public.memorials m on m.id = ms.memorial_id
    where ms.slug = app.normalize_slug(lookup)::citext
      and m.deleted_at is null
    limit 1
  )
  select
    hit.memorial_id,
    (select c.slug::text from public.memorial_slugs c
      where c.memorial_id = hit.memorial_id and c.is_canonical),
    not hit.is_canonical,
    hit.redirect_enabled
  from hit;
$$;

comment on function public.resolve_memorial_slug(text) is
  'Routing resolver: slug (canonical or alias) -> memorial id + current canonical slug.';

-- ---------------------------------------------------------------------------
-- slug_is_available — cheap pre-check for the family UI.
-- ---------------------------------------------------------------------------
create or replace function public.slug_is_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select app.slug_is_valid(app.normalize_slug(candidate))
     and not exists (select 1 from public.reserved_slugs r where r.slug = app.normalize_slug(candidate)::citext)
     and not exists (select 1 from public.memorial_slugs s where s.slug = app.normalize_slug(candidate)::citext);
$$;

grant execute on function public.resolve_memorial_slug(text) to anon, authenticated;
grant execute on function public.slug_is_available(text) to anon, authenticated;
