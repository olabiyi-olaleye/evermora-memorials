-- Evermora — Phase 2 data foundation
-- 0015 · feature_settings, privacy_settings
--
-- One row per memorial, auto-created on memorial insert. Safe defaults (§14, §15).

-- ---------------------------------------------------------------------------
-- feature_settings — which capabilities a memorial exposes.
-- Not a generic feature-flag engine — a fixed set of product toggles.
-- ---------------------------------------------------------------------------
create table feature_settings (
  memorial_id   uuid primary key references memorials (id) on delete cascade,
  tributes_enabled            boolean not null default true,
  tribute_moderation_enabled  boolean not null default true,
  photo_contributions_enabled boolean not null default false,
  candles_enabled             boolean not null default true,
  funeral_enabled             boolean not null default true,
  family_section_enabled      boolean not null default false,
  updates_enabled             boolean not null default true,
  guestbook_enabled           boolean not null default true,
  sharing_enabled             boolean not null default true,
  qr_code_enabled             boolean not null default true,
  visitor_analytics_enabled   boolean not null default true,
  updated_at    timestamptz not null default now()
);

create trigger feature_settings_set_updated_at
  before update on feature_settings
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- privacy_settings — memorial-level visibility + per-section privacy +
-- search-engine indexing (a SEPARATE concern from visibility, default OFF).
-- ---------------------------------------------------------------------------
create table privacy_settings (
  memorial_id   uuid primary key references memorials (id) on delete cascade,
  visibility                 memorial_visibility not null default 'private',
  search_indexing_enabled    boolean not null default false,

  family_details_visibility  section_visibility not null default 'members',
  funeral_events_visibility   section_visibility not null default 'inherit',
  resting_place_visibility     section_visibility not null default 'members',
  photos_visibility            section_visibility not null default 'inherit',
  story_visibility             section_visibility not null default 'inherit',
  updates_visibility           section_visibility not null default 'inherit',
  documents_visibility         section_visibility not null default 'members',

  updated_at    timestamptz not null default now()
);

comment on column privacy_settings.search_indexing_enabled is
  'Search-engine indexing. Independent of visibility. Default OFF: public URL != indexed.';

create trigger privacy_settings_set_updated_at
  before update on privacy_settings
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provision both settings rows for every new memorial.
-- ---------------------------------------------------------------------------
create or replace function app.memorials_provision_settings()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  insert into public.feature_settings (memorial_id) values (new.id)
    on conflict (memorial_id) do nothing;
  insert into public.privacy_settings (memorial_id) values (new.id)
    on conflict (memorial_id) do nothing;
  return new;
end;
$$;

create trigger memorials_provision_settings
  after insert on memorials
  for each row execute function app.memorials_provision_settings();
