-- Evermora — Phase 2 data foundation
-- 0013 · family_updates  (§18)
--
-- Official family notices — not a social feed.

create table family_updates (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  title         text not null,
  body          text not null,
  importance    update_importance not null default 'normal',
  author_profile_id uuid references profiles (id) on delete set null,
  funeral_event_id  uuid references funeral_events (id) on delete set null,
  status        publication_status not null default 'draft',
  visibility    section_visibility not null default 'inherit',
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint family_updates_title_len check (char_length(title) between 1 and 200),
  constraint family_updates_published_has_timestamp check (
    status <> 'published' or published_at is not null
  )
);

create index family_updates_memorial_idx on family_updates (memorial_id) where deleted_at is null;
create index family_updates_published_idx
  on family_updates (memorial_id, published_at desc)
  where status = 'published' and deleted_at is null;

create trigger family_updates_set_updated_at
  before update on family_updates
  for each row execute function app.set_updated_at();
