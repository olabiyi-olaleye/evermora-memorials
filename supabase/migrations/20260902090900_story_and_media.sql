-- Evermora — Phase 2 data foundation
-- 0010 · story_sections, albums, media
--
-- Relational content — never one giant JSON blob per memorial (master §29).

-- ---------------------------------------------------------------------------
-- media — every uploaded asset. Storage identity is the immutable memorial id,
-- never a person/family name (§19): {bucket}/{memorial_id}/...
-- ---------------------------------------------------------------------------
create table media (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  album_id      uuid,   -- FK added after albums exists (below)

  storage_bucket text not null,
  storage_path   text not null,

  kind          media_kind not null default 'image',
  mime_type     text,
  byte_size     bigint,
  width         int,
  height        int,
  duration_seconds int,
  checksum      text,

  title         text,
  caption       text,
  alt_text      text,

  source        media_source not null default 'family',
  visibility    section_visibility not null default 'inherit',
  processing_status media_processing_status not null default 'pending',
  display_order int not null default 0,

  uploaded_by   uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint media_storage_path_unique unique (storage_bucket, storage_path),
  constraint media_byte_size_positive check (byte_size is null or byte_size >= 0)
);

create index media_memorial_idx on media (memorial_id) where deleted_at is null;
create index media_album_idx on media (album_id) where deleted_at is null;

create trigger media_set_updated_at
  before update on media
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- albums — named groupings of media (galleries).
-- ---------------------------------------------------------------------------
create table albums (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  title         text not null,
  description   text,
  cover_media_id uuid references media (id) on delete set null,
  visibility    section_visibility not null default 'inherit',
  status        publication_status not null default 'draft',
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint albums_title_len check (char_length(title) between 1 and 160)
);

create index albums_memorial_idx on albums (memorial_id) where deleted_at is null;

create trigger albums_set_updated_at
  before update on albums
  for each row execute function app.set_updated_at();

alter table media
  add constraint media_album_id_fkey
  foreign key (album_id) references albums (id) on delete set null;

-- Late FKs from memorials -> media (portrait / cover)
alter table memorials
  add constraint memorials_portrait_media_fkey
  foreign key (portrait_media_id) references media (id) on delete set null;
alter table memorials
  add constraint memorials_cover_media_fkey
  foreign key (cover_media_id) references media (id) on delete set null;
alter table memorial_people
  add constraint memorial_people_photo_media_fkey
  foreign key (photo_media_id) references media (id) on delete set null;

-- ---------------------------------------------------------------------------
-- story_sections — the biography / life-story content blocks.
-- ---------------------------------------------------------------------------
create table story_sections (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  kind          story_section_kind not null default 'custom',
  title         text not null,
  body          text not null,
  visibility    section_visibility not null default 'inherit',
  status        publication_status not null default 'draft',
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint story_sections_title_len check (char_length(title) between 1 and 200)
);

create index story_sections_memorial_idx on story_sections (memorial_id) where deleted_at is null;

create trigger story_sections_set_updated_at
  before update on story_sections
  for each row execute function app.set_updated_at();
