-- Evermora — Phase 2 data foundation
-- 0009 · share_resolvers  (permanent QR / print identifiers, §20 / master §12)
--
--   Printed QR  ->  share_resolvers.token  ->  memorial id  ->  current canonical slug
--
-- The token is permanent and independent of the slug, the memorial name and
-- internal routing. Multiple resolvers per memorial are allowed (different
-- print runs / artifacts). We do NOT build QR generation UI in Phase 2.

-- Unguessable share token generator (kept as a function so the column default
-- is a bare call — the domain layer may also mint tokens explicitly).
create or replace function app.gen_share_token()
returns text
language sql
volatile
set search_path = pg_catalog, extensions
as $$
  select encode(gen_random_bytes(9), 'hex');
$$;

create table share_resolvers (
  id            uuid primary key default extensions.gen_random_uuid(),
  token         text not null unique default app.gen_share_token(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  label         text,
  medium        text,               -- e.g. 'funeral_programme', 'memorial_card', 'banner'
  is_active     boolean not null default true,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  retired_at    timestamptz,
  constraint share_resolvers_token_shape check (token ~ '^[a-f0-9]{12,}$')
);

comment on table share_resolvers is
  'Permanent indirection for printed QR codes. token -> memorial_id -> canonical slug.';

create index share_resolvers_memorial_idx on share_resolvers (memorial_id);

-- ---------------------------------------------------------------------------
-- resolve_share_token — QR landing resolver used by apps/web.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_share_token(lookup text)
returns table (memorial_id uuid, canonical_slug text, is_active boolean)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select
    sr.memorial_id,
    (select c.slug::text from public.memorial_slugs c
      where c.memorial_id = sr.memorial_id and c.is_canonical),
    (sr.is_active and sr.retired_at is null)
  from public.share_resolvers sr
  join public.memorials m on m.id = sr.memorial_id
  where sr.token = lower(btrim(lookup))
    and m.deleted_at is null
  limit 1;
$$;

grant execute on function public.resolve_share_token(text) to anon, authenticated;
