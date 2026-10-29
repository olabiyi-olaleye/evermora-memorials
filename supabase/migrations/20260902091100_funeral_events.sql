-- Evermora — Phase 2 data foundation
-- 0012 · funeral_events  (§17)
--
-- Multiple event records per memorial — never one big JSON blob.
-- Draft events are not publicly visible.

create table funeral_events (
  id            uuid primary key default extensions.gen_random_uuid(),
  memorial_id   uuid not null references memorials (id) on delete cascade,
  event_type    funeral_event_type not null default 'custom',
  status        funeral_event_status not null default 'draft',

  title         text not null,
  description   text,

  event_date    date,
  start_time    time,
  end_time      time,
  timezone      text,

  venue_name    text,
  address_line  text,
  city          text,
  region        text,
  country       text,
  postal_code   text,
  latitude      numeric(9,6),
  longitude     numeric(9,6),

  dress_code    text,
  contact_name  text,
  contact_phone text,
  livestream_url text,
  instructions  text,

  visibility    section_visibility not null default 'inherit',
  display_order int not null default 0,

  published_at  timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint funeral_events_title_len check (char_length(title) between 1 and 200),
  constraint funeral_events_time_order check (
    start_time is null or end_time is null or end_time >= start_time
  ),
  constraint funeral_events_lat check (latitude is null or latitude between -90 and 90),
  constraint funeral_events_lng check (longitude is null or longitude between -180 and 180),
  constraint funeral_events_published_has_timestamp check (
    status <> 'published' or published_at is not null
  )
);

create index funeral_events_memorial_idx on funeral_events (memorial_id) where deleted_at is null;
create index funeral_events_published_idx
  on funeral_events (memorial_id, event_date)
  where status = 'published' and deleted_at is null;

create trigger funeral_events_set_updated_at
  before update on funeral_events
  for each row execute function app.set_updated_at();
