-- Evermora — Phase 2 data foundation
-- 0005 · memorials, memorial_people
--
-- Memorial identity (§6): the memorial's identity is its immutable `id`.
-- The public slug lives in `memorial_slugs` and is never the identity.

create table memorials (
  id            uuid primary key default extensions.gen_random_uuid(),
  status        memorial_status not null default 'draft',
  funeral_planning_status funeral_planning_status not null default 'not_started',

  created_by    uuid references profiles (id) on delete set null,

  -- Subject of the memorial
  full_name     text not null,
  preferred_name text,
  headline      text,
  biography_summary text,
  date_of_birth date,
  date_of_death date,
  birth_place   text,
  resting_place text,

  -- Denormalised primary imagery (points at media rows; FK added in 0010)
  portrait_media_id uuid,
  cover_media_id    uuid,

  published_at  timestamptz,
  archived_at   timestamptz,
  suspended_at  timestamptz,
  suspended_reason text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint memorials_full_name_len check (char_length(full_name) between 1 and 200),
  constraint memorials_dates_order check (
    date_of_birth is null
    or date_of_death is null
    or date_of_death >= date_of_birth
  ),
  constraint memorials_published_has_timestamp check (
    status <> 'published' or published_at is not null
  )
);

comment on table memorials is 'Core memorial record. Identity = id (immutable). Public address lives in memorial_slugs.';
comment on column memorials.status is 'draft | published | archived | suspended | deleted. Independent of funeral_planning_status.';

create index memorials_status_idx on memorials (status) where deleted_at is null;
create index memorials_created_by_idx on memorials (created_by);
create index memorials_full_name_trgm_idx on memorials using gin (full_name extensions.gin_trgm_ops);

create trigger memorials_set_updated_at
  before update on memorials
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- memorial_people — family members / relations shown on a memorial.
-- Not platform users; purely descriptive content.
-- ---------------------------------------------------------------------------
create table memorial_people (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  full_name     text not null,
  relationship  text,
  is_deceased   boolean not null default false,
  biography     text,
  photo_media_id uuid,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint memorial_people_full_name_len check (char_length(full_name) between 1 and 200)
);

create index memorial_people_memorial_idx on memorial_people (memorial_id) where deleted_at is null;

create trigger memorial_people_set_updated_at
  before update on memorial_people
  for each row execute function app.set_updated_at();
